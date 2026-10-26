import { describe, expect, it } from 'vitest';
import { BLUEPRINT_SLOTS, BLUEPRINT_TABLE } from '../../src/data/blueprints';
import { boxOf, type AreaBox } from '../../src/sim/area';
import { blueprintName, captureBlueprint, deleteBlueprint, namedProduct, saveBlueprint } from '../../src/sim/blueprints';
import type { ConduitState, CrateState, MachineState } from '../../src/sim/pieces';
import { makeEnvelope, readSave, snapshot } from '../../src/sim/save';
import type { SimState } from '../../src/sim/state';
import { run, runUntil } from './fight';
import { DYING_TICKS } from '../../src/data/player';
import { foundry, put } from './foundryKit';

// Saving a blueprint (063): every piece wholly inside the box, its piece id, its tile relative to the box's top-left,
// its facing and the settings the player chose (a conduit's turn, a splitter's side, a stage machine's round, an
// underground pair's link); never contents. Named after the most finished thing its pieces make, numbered when the
// name is taken, with that item's icon. 8 slots; with all full a save names the slot it overwrites.

function table(): SimState {
  const s = foundry();
  s.research[BLUEPRINT_TABLE] = 'restored';
  return s;
}

const ALL: AreaBox = boxOf({ tx: 2, ty: 2 }, { tx: 12, ty: 12 });

describe('capturing a box (063)', () => {
  it('records ids, tiles from the top-left, facings and settings, and no contents', () => {
    const s = table();
    const c = put<ConduitState>(s, 'conduit', 4, 3, 'down');
    c.inFrom = 'left';
    c.item = 'wood';
    put(s, 'splitter', 5, 3, 'right');
    s.foundry.pieces.find((p) => p.kind === 'splitter' && Object.assign(p, { mirrored: true }));
    const rune = put<MachineState>(s, 'frost-rune', 6, 4, 'up');
    rune.made = 'bomb+frost';
    rune.buffer = { bomb: 2 };
    put(s, 'underground-entrance', 3, 6, 'right');
    put(s, 'underground-exit', 6, 6, 'right');
    const k = put<CrateState>(s, 'crate', 7, 6, 'up');
    k.contents = { arrow: 4 };
    put(s, 'assembler', 5, 8, 'right');
    const bp = captureBlueprint(s.foundry, boxOf({ tx: 3, ty: 3 }, { tx: 7, ty: 9 }));
    expect(bp).toEqual({
      w: 5,
      h: 7,
      pieces: [
        { pieceId: 'conduit', dx: 1, dy: 0, facing: 'down', inFrom: 'left' },
        { pieceId: 'splitter', dx: 2, dy: 0, facing: 'right', mirrored: true },
        { pieceId: 'frost-rune', dx: 3, dy: 1, facing: 'up', made: 'bomb+frost' },
        { pieceId: 'underground-entrance', dx: 0, dy: 3, facing: 'right', link: 4 },
        { pieceId: 'underground-exit', dx: 3, dy: 3, facing: 'right', link: 3 },
        { pieceId: 'crate', dx: 4, dy: 3, facing: 'up' },
        { pieceId: 'assembler', dx: 2, dy: 5, facing: 'right' },
      ],
    });
  });

  it('leaves out an underground link whose partner is outside the box', () => {
    const s = table();
    put(s, 'underground-entrance', 3, 6, 'right');
    put(s, 'underground-exit', 6, 6, 'right');
    expect(captureBlueprint(s.foundry, boxOf({ tx: 3, ty: 6 }, { tx: 4, ty: 6 })).pieces).toEqual([{ pieceId: 'underground-entrance', dx: 0, dy: 0, facing: 'right' }]);
  });
});

describe('naming (063)', () => {
  it('follows the most finished thing: a stage round, else a finisher, else the first machine, else Logistics', () => {
    const s = table();
    put(s, 'cutter', 3, 3, 'right');
    put(s, 'assembler', 5, 5, 'right');
    const rune = put<MachineState>(s, 'frost-rune', 8, 5, 'right');
    expect(namedProduct(captureBlueprint(s.foundry, ALL).pieces)).toBe('arrow+frost');
    rune.made = 'bomb+frost';
    expect(namedProduct(captureBlueprint(s.foundry, ALL).pieces)).toBe('bomb+frost');
    expect(namedProduct(captureBlueprint(s.foundry, boxOf({ tx: 3, ty: 3 }, { tx: 6, ty: 6 })).pieces)).toBe('arrow');
    expect(namedProduct(captureBlueprint(s.foundry, boxOf({ tx: 3, ty: 3 }, { tx: 3, ty: 3 })).pieces)).toBe('shaft');
    put(s, 'conduit', 10, 10, 'up');
    expect(namedProduct(captureBlueprint(s.foundry, boxOf({ tx: 10, ty: 10 }, { tx: 10, ty: 10 })).pieces)).toBeNull();
  });

  it('picks the stage machine with the most tags: the latest on a tie', () => {
    const s = table();
    const a = put<MachineState>(s, 'frost-rune', 3, 3, 'right');
    const b = put<MachineState>(s, 'ley-guide', 4, 3, 'right');
    expect(namedProduct(captureBlueprint(s.foundry, ALL).pieces)).toBe(b.made);
    a.made = 'arrow+frost+homing';
    expect(namedProduct(captureBlueprint(s.foundry, ALL).pieces)).toBe('arrow+frost+homing');
  });

  it('reads as plurals, Logistics, and numbers a taken name', () => {
    expect(blueprintName('arrow+frost', [])).toBe('Frost arrows');
    expect(blueprintName('bomb', [])).toBe('Bombs');
    expect(blueprintName('ley-dust', [])).toBe('Ley dust');
    expect(blueprintName(null, [])).toBe('Logistics');
    expect(blueprintName('shaft', ['Shafts'])).toBe('Shafts 2');
    expect(blueprintName('shaft', ['Shafts', 'Shafts 2'])).toBe('Shafts 3');
    expect(blueprintName('shaft', ['Shafts 2'])).toBe('Shafts');
  });
});

describe('slots (063)', () => {
  it('saves under its name and icon, numbering a second copy', () => {
    const s = table();
    put(s, 'frost-rune', 3, 3, 'right');
    run(s, 1, { area: { box: ALL, action: 'save' } });
    run(s, 1, { area: { box: ALL, action: 'save' } });
    expect(s.blueprints.map((b) => [b.name, b.itemId])).toEqual([
      ['Frost arrows', 'arrow+frost'],
      ['Frost arrows 2', 'arrow+frost'],
    ]);
    expect(s.events.blueprintSaves).toEqual([{ slot: 1, name: 'Frost arrows 2' }]);
  });

  it('holds 8: a ninth with no slot is refused, with a slot it overwrites it, freeing its own name', () => {
    const s = table();
    put(s, 'cutter', 3, 3, 'right');
    for (let i = 0; i < BLUEPRINT_SLOTS; i++) expect(saveBlueprint(s, ALL)).toBe(i);
    expect(saveBlueprint(s, ALL)).toBeNull();
    expect(s.events.blueprintSaveFails.at(-1)).toEqual({ reason: 'full' });
    expect(s.blueprints).toHaveLength(BLUEPRINT_SLOTS);
    expect(saveBlueprint(s, ALL, 0)).toBe(0);
    expect(s.blueprints[0]?.name).toBe('Shafts');
    expect(s.blueprints).toHaveLength(BLUEPRINT_SLOTS);
    deleteBlueprint(s, 3);
    expect(s.blueprints).toHaveLength(BLUEPRINT_SLOTS - 1);
    expect(s.events.blueprintDeletes).toEqual([{ slot: 3, name: 'Shafts 4' }]);
    expect(saveBlueprint(s, ALL)).toBe(BLUEPRINT_SLOTS - 1);
  });

  it('refuses a box with no pieces', () => {
    const s = table();
    expect(saveBlueprint(s, ALL)).toBeNull();
    expect(s.events.blueprintSaveFails).toEqual([{ reason: 'empty' }]);
  });

  it('Save and pick up saves the box, then lifts it into the stash', () => {
    const s = table();
    const k = put<CrateState>(s, 'crate', 3, 3, 'up');
    k.contents = { arrow: 3 };
    run(s, 1, { area: { box: ALL, action: 'saveAndPickUp' } });
    expect(s.blueprints.map((b) => b.pieces.length)).toEqual([1]);
    expect(s.foundry.pieces).toEqual([]);
    expect(s.stash.arrow).toBe(3);
  });
});

describe('keeping blueprints (063)', () => {
  it('survives a KO and a save round trip', () => {
    const s = table();
    put(s, 'cutter', 3, 3, 'right');
    run(s, 1, { area: { box: ALL, action: 'save' } });
    const kept = structuredClone(s.blueprints);
    s.player.health = 0;
    runUntil(s, (x) => x.events.ko, DYING_TICKS + 5);
    expect(s.events.ko).toBe(true);
    expect(s.blueprints).toEqual(kept);
    const read = readSave(JSON.stringify(makeEnvelope(snapshot(s), { build: 'x', savedAt: 'now', endCardSeen: false })));
    if (read.status !== 'ok') throw new Error(read.status);
    expect(read.state.blueprints).toEqual(kept);
  });
});
