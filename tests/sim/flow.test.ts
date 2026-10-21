import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, HOPPER_TICKS, INPUT_CAP } from '../../src/data/foundry';
import { machineDef } from '../../src/data/pieces';
import type { ConduitState, CrateState, HopperState, MachineState } from '../../src/sim/pieces';
import { tileCentre } from '../../src/sim/tiles';
import { HALL, movePlayer, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

const CUTTER = machineDef('cutter');
const ASSEMBLER = machineDef('assembler');

/** A hopper of `count` × `item` at (tx, ty). */
function hopper(s: ReturnType<typeof foundry>, tx: number, ty: number, item: string, count: number, facing = 'right' as const) {
  const h = put<HopperState>(s, 'hopper', tx, ty, facing);
  h.item = item;
  h.count = count;
  return h;
}

/** Stands the player right next to a piece's tile so E reaches it. */
function standBeside(s: ReturnType<typeof foundry>, tx: number, ty: number): void {
  const { x, y } = tileCentre({ tx, ty: ty + 1 });
  movePlayer(s, x, y);
}

describe('conduits', () => {
  it('carry an item across in CONDUIT_TICKS, then hand it on', () => {
    const s = foundry();
    const a = put<ConduitState>(s, 'conduit', 5, 5);
    const b = put<ConduitState>(s, 'conduit', 6, 5);
    a.item = 'wood';
    run(s, CONDUIT_TICKS - 1);
    expect([a.item, b.item]).toEqual(['wood', null]);
    run(s, 1);
    expect([a.item, b.item]).toEqual([null, 'wood']);
    expect(b.progress).toBe(0);
  });

  it('hold one item and refuse items from their own front', () => {
    const s = foundry();
    const a = put<ConduitState>(s, 'conduit', 5, 5, 'right');
    const b = put<ConduitState>(s, 'conduit', 6, 5, 'left');
    a.item = 'wood';
    run(s, CONDUIT_TICKS * 3);
    expect([a.item, b.item]).toEqual(['wood', null]);
  });

  it('back up behind a stalled item', () => {
    const s = foundry();
    const a = put<ConduitState>(s, 'conduit', 4, 5);
    const b = put<ConduitState>(s, 'conduit', 5, 5);
    put(s, 'cutter', 6, 5);
    a.item = 'wood';
    b.item = 'stone';
    run(s, CONDUIT_TICKS * 4);
    expect([a.item, b.item]).toEqual(['wood', 'stone']);
  });
});

describe('machines', () => {
  it('take only their inputs, from any side but their front', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 6, 5, 'down');
    const fromLeft = put<ConduitState>(s, 'conduit', 5, 5, 'right');
    const fromTop = put<ConduitState>(s, 'conduit', 6, 4, 'down');
    const fromFront = put<ConduitState>(s, 'conduit', 6, 6, 'up');
    fromLeft.item = 'wood';
    fromTop.item = 'stone';
    fromFront.item = 'wood';
    run(s, CONDUIT_TICKS);
    expect(m.buffer).toEqual({ wood: 1 });
    expect([fromLeft.item, fromTop.item, fromFront.item]).toEqual([null, 'stone', 'wood']);
  });

  it('buffer at most INPUT_CAP of an input', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 6, 5, 'down');
    const c = put<ConduitState>(s, 'conduit', 6, 4, 'down');
    m.buffer = { shaft: INPUT_CAP };
    c.item = 'shaft';
    run(s, CONDUIT_TICKS * 2);
    expect(m.buffer.shaft).toBe(INPUT_CAP);
    expect(c.item).toBe('shaft');
  });

  it('craft after craftTicks and hold the output', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 6, 5);
    m.buffer = { wood: 1 };
    run(s, 1);
    expect(m).toMatchObject({ crafting: true, buffer: { wood: 0 }, status: 'working' });
    run(s, CUTTER.craftTicks - 1);
    expect(m.output).toBe(0);
    run(s, 1);
    expect(m).toMatchObject({ crafting: false, output: 2, status: 'idle' });
  });

  it('only start a craft whose whole output fits', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 6, 5);
    m.buffer = { shaft: 1, arrowhead: 1, rope: 1 };
    m.output = 1;
    run(s, 1);
    expect(m).toMatchObject({ crafting: false, status: 'blocked' });
  });

  it('report starved with what is missing, and idle when empty', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 6, 5);
    run(s, 1);
    expect(m).toMatchObject({ status: 'idle', missing: [] });
    m.buffer = { shaft: 2 };
    run(s, 1);
    expect(m).toMatchObject({ status: 'starved', missing: ['arrowhead', 'rope'] });
  });

  it('hand output straight to a machine they face, one item a tick', () => {
    const s = foundry();
    const cutter = put<MachineState>(s, 'cutter', 4, 6, 'right');
    const a = put<MachineState>(s, 'assembler', 5, 6, 'right');
    cutter.output = 2;
    run(s, 1);
    expect([cutter.output, a.buffer.shaft]).toEqual([1, 1]);
    run(s, 1);
    expect([cutter.output, a.buffer.shaft]).toEqual([0, 2]);
  });

  it('are blocked when what they face cannot take their output', () => {
    const s = foundry();
    const cutter = put<MachineState>(s, 'cutter', 4, 6, 'right');
    put(s, 'grinder', 5, 6, 'right');
    cutter.output = 7;
    cutter.buffer = { wood: 1 };
    run(s, 5);
    expect(cutter).toMatchObject({ output: 7, crafting: false, status: 'blocked' });
  });
});

describe('hoppers', () => {
  it('push one item every HOPPER_TICKS into a conduit or a machine, then forget their type', () => {
    const s = foundry();
    const h = hopper(s, 4, 5, 'wood', 2);
    const m = put<MachineState>(s, 'grinder', 5, 5);
    const h2 = hopper(s, 4, 7, 'ley-crystal', 1);
    const m2 = put<MachineState>(s, 'grinder', 5, 7);
    run(s, HOPPER_TICKS - 1);
    expect(h2.count).toBe(1);
    run(s, 1);
    expect(h2).toMatchObject({ count: 0, item: null });
    expect(m2.buffer['ley-crystal']).toBe(1);
    // The grinder doesn't take wood, so that hopper waits.
    expect(h.count).toBe(2);
    expect(m.buffer).toEqual({});
  });

  it('feed a conduit', () => {
    const s = foundry();
    hopper(s, 4, 5, 'wood', 2);
    const c = put<ConduitState>(s, 'conduit', 5, 5);
    run(s, HOPPER_TICKS);
    expect(c.item).toBe('wood');
  });

  it('take a deposit of any held item when empty, and more of the same later', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    standBeside(s, 5, 5);
    s.inventory = { shaft: 3, wood: 2, arrow: 4 };
    run(s, 1, { deposit: { id: h.id, itemId: 'shaft', amount: 'all' } });
    expect(h).toMatchObject({ item: 'shaft', count: 3 });
    expect(s.inventory.shaft).toBe(0);
    expect(s.events.deposits).toEqual([{ id: h.id, itemId: 'shaft', count: 3 }]);
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect(h.count).toBe(3);
    s.inventory.shaft = 2;
    run(s, 1, { deposit: { id: h.id, itemId: 'shaft', amount: 'all' } });
    expect(h.count).toBe(5);
    // E on a hopper only opens render's menu; the sim leaves it alone.
    s.inventory.shaft = 1;
    run(s, 1, { interact: true });
    expect([h.count, s.inventory.shaft]).toEqual([5, 1]);
    h.item = null;
    h.count = 0;
    run(s, 1, { deposit: { id: h.id, itemId: 'arrow', amount: 'all' } });
    expect(h).toMatchObject({ item: 'arrow', count: 4 });
  });

  it('give everything back with a withdraw, and forget their type', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    standBeside(s, 5, 5);
    h.item = 'ley-dust';
    h.count = 2;
    h.timer = 7;
    s.inventory = { 'ley-dust': 1 };
    run(s, 1, { withdraw: { id: h.id, amount: 'all' } });
    expect(h).toMatchObject({ item: null, count: 0, timer: 0 });
    expect(s.inventory['ley-dust']).toBe(3);
    expect(s.events.withdraws).toEqual([{ id: h.id, itemId: 'ley-dust', count: 2 }]);
  });

  it('only withdraw in reach', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    h.item = 'wood';
    h.count = 2;
    run(s, 1, { withdraw: { id: h.id, amount: 'all' } });
    expect(h.count).toBe(2);
  });

  it('only take deposits in reach', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5, 'up');
    s.inventory = { wood: 2 };
    run(s, 1, { deposit: { id: h.id, itemId: 'wood', amount: 'all' } });
    expect(h.count).toBe(0);
  });
});

describe('crates', () => {
  it('take any kind while a slot has room (050: 8 stacks), and their screen empties them into the inventory', () => {
    const s = foundry();
    const c = put<ConduitState>(s, 'conduit', 4, 5);
    const crate = put<CrateState>(s, 'crate', 5, 5);
    // Seven slots of arrows: the eighth takes a bomb, then no ninth kind.
    crate.contents = { arrow: 699 };
    c.item = 'bomb';
    run(s, CONDUIT_TICKS);
    expect(crate.contents).toEqual({ arrow: 699, bomb: 1 });
    c.item = 'stone';
    run(s, CONDUIT_TICKS);
    expect(c.item).toBe('stone');
    c.item = null;
    standBeside(s, 5, 5);
    s.inventory = {};
    // 047: the crate's screen takes each stack out (Ctrl+click: all of it).
    run(s, 1, { withdraw: { id: crate.id, amount: 'all', itemId: 'arrow' } });
    run(s, 1, { withdraw: { id: crate.id, amount: 'all', itemId: 'bomb' } });
    expect(s.inventory).toEqual({ arrow: 699, bomb: 1 });
    expect(crate.contents).toEqual({});
    expect(s.events.withdraws).toEqual([{ id: crate.id, itemId: 'bomb', count: 1 }]);
  });
});

describe('lines', () => {
  /** Three hopper → machine → conduit rows feeding a 3x1 combiner's back, which faces a crate. */
  function threeChains(combiner: string, rows: [string, string, number][]) {
    const s = foundry();
    put(s, combiner, 10, 6, 'right');
    const crate = put<CrateState>(s, 'crate', 11, 6);
    rows.forEach(([machine, item, count], i) => {
      hopper(s, 7, 5 + i, item, count);
      put(s, machine, 8, 5 + i);
      put(s, 'conduit', 9, 5 + i);
    });
    return { s, crate };
  }

  it('an arrow line makes arrows from raw materials', () => {
    const { s, crate } = threeChains('assembler', [
      ['cutter', 'wood', 2],
      ['knapper', 'stone', 2],
      ['spinner', 'fiber', 2],
    ]);
    runUntil(s, () => (crate.contents.arrow ?? 0) >= 8, 1200);
  });

  it('a bomb line makes bombs', () => {
    const { s, crate } = threeChains('packer', [
      ['shaper', 'stone', 2],
      ['fuse-maker', 'husk-resin', 2],
      ['grinder', 'ley-crystal', 1],
    ]);
    runUntil(s, () => (crate.contents.bomb ?? 0) >= 4, 1200);
  });

  it('a ley bolt line hands off machine to machine with no conduits', () => {
    const s = foundry();
    hopper(s, 4, 5, 'ley-crystal', 1);
    put(s, 'grinder', 5, 5);
    put(s, 'focuser', 6, 5);
    const crate = put<CrateState>(s, 'crate', 7, 5);
    runUntil(s, () => (crate.contents['ley-bolt'] ?? 0) >= 4, 600);
  });

  it('a hopper of hand-crafted shafts starts a line mid-chain', () => {
    const s = foundry();
    put(s, 'assembler', 10, 6, 'right');
    const crate = put<CrateState>(s, 'crate', 11, 6);
    hopper(s, 9, 5, 'shaft', 1);
    hopper(s, 9, 6, 'arrowhead', 1);
    hopper(s, 9, 7, 'rope', 1);
    const ticks = runUntil(s, () => (crate.contents.arrow ?? 0) >= 4, 600);
    expect(ticks).toBeGreaterThan(ASSEMBLER.craftTicks);
  });

  it('keeps running while the player is in the ruin hall', () => {
    const s = foundry();
    hopper(s, 4, 5, 'ley-crystal', 1);
    put(s, 'grinder', 5, 5);
    put(s, 'focuser', 6, 5);
    const crate = put<CrateState>(s, 'crate', 7, 5);
    s.roomId = HALL;
    movePlayer(s, 400, 448);
    runUntil(s, () => (crate.contents['ley-bolt'] ?? 0) >= 4, 600);
  });
});

describe('3x1 input sides', () => {
  it('take items on the back and both ends, never on the front side', () => {
    const s = foundry();
    // Facing down: covers (9..11, 6); back is row 5, ends are (8,6) and (12,6), front side is row 7.
    const m = put<MachineState>(s, 'assembler', 10, 6, 'down');
    const back = put<ConduitState>(s, 'conduit', 9, 5, 'down');
    const leftEnd = put<ConduitState>(s, 'conduit', 8, 6, 'right');
    const rightEnd = put<ConduitState>(s, 'conduit', 12, 6, 'left');
    const frontLeft = put<ConduitState>(s, 'conduit', 9, 7, 'up');
    const frontMiddle = put<ConduitState>(s, 'conduit', 10, 7, 'up');
    back.item = 'shaft';
    leftEnd.item = 'arrowhead';
    rightEnd.item = 'rope';
    frontLeft.item = 'shaft';
    frontMiddle.item = 'shaft';
    run(s, CONDUIT_TICKS);
    expect(m.buffer).toEqual({ shaft: 1, arrowhead: 1, rope: 1 });
    expect([frontLeft.item, frontMiddle.item]).toEqual(['shaft', 'shaft']);
  });

  it('refuse a machine handing off into the front side', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 10, 6, 'down');
    const cutter = put<MachineState>(s, 'cutter', 11, 7, 'up');
    cutter.output = 2;
    run(s, 2);
    expect(m.buffer).toEqual({});
    expect(cutter.output).toBe(2);
  });
});

describe('crate sides', () => {
  it('take items from every side, its facing aside', () => {
    const s = foundry();
    const crate = put<CrateState>(s, 'crate', 6, 6, 'right');
    // One conduit pointing in from each side, including the side the crate faces.
    const feeds = [
      put<ConduitState>(s, 'conduit', 5, 6, 'right'),
      put<ConduitState>(s, 'conduit', 7, 6, 'left'),
      put<ConduitState>(s, 'conduit', 6, 5, 'down'),
      put<ConduitState>(s, 'conduit', 6, 7, 'up'),
    ];
    for (const c of feeds) c.item = 'arrow';
    run(s, CONDUIT_TICKS);
    expect(crate.contents).toEqual({ arrow: 4 });
  });
});
