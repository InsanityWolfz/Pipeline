import { describe, expect, it } from 'vitest';
import { machineDef } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import type { CrateState, HopperState, MachineState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { machineRecipe } from '../../src/sim/stages';
import { run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

// 062: the Smelter and the kiln make the tier materials, and the machines already in a line make either tier by what
// they're fed: one matching set per craft, never mixing, alternating when fed both, so both kinds come out.

/** A machine at (6, 5) facing right with a crate in front of it, its buffer filled with `buffer`. */
function rig(pieceId: string, buffer: Record<string, number>): { s: SimState; m: MachineState; crate: CrateState } {
  const s = foundry();
  const m = put<MachineState>(s, pieceId, 6, 5);
  const crate = put<CrateState>(s, 'crate', 7, 5);
  Object.assign(m.buffer, buffer);
  return { s, m, crate };
}

/** What machines made, in order, from now for `ticks` ticks. */
function madeOver(s: SimState, ticks: number): string[] {
  const out: string[] = [];
  for (let t = 0; t < ticks; t++) {
    run(s, 1);
    out.push(...s.events.made.map((e) => `${e.count} ${e.itemId}`));
  }
  return out;
}

describe('the Smelter and the kiln (062)', () => {
  it('the Smelter fuses 1 ley-iron and 1 cinderite into 1 ley-steel in 60 ticks', () => {
    expect(machineDef('smelter')).toMatchObject({ footprint: '1x1', craftTicks: 60, recipeId: 'ley-steel', category: 'forge' });
    expect(recipeDef('ley-steel')).toMatchObject({ inputs: { 'ley-iron': 1, cinderite: 1 }, output: { itemId: 'ley-steel', count: 1 } });
    const { s, crate } = rig('smelter', { 'ley-iron': 1, cinderite: 1 });
    const ticks = runUntil(s, () => (crate.contents['ley-steel'] ?? 0) > 0, 200);
    expect(ticks).toBeGreaterThanOrEqual(60);
    expect(ticks).toBeLessThan(70);
    expect(crate.contents).toEqual({ 'ley-steel': 1 });
  });

  it('the kiln fires 1 ley dust and 1 cinderite into 1 ley glass in 60 ticks', () => {
    expect(machineDef('kiln')).toMatchObject({ footprint: '1x1', craftTicks: 60, recipeId: 'ley-glass', category: 'forge' });
    expect(recipeDef('ley-glass')).toMatchObject({ inputs: { 'ley-dust': 1, cinderite: 1 }, output: { itemId: 'ley-glass', count: 1 } });
    const { s, crate } = rig('kiln', { 'ley-dust': 1, cinderite: 1 });
    runUntil(s, () => (crate.contents['ley-glass'] ?? 0) > 0, 70);
    expect(crate.contents).toEqual({ 'ley-glass': 1 });
  });

  it('take their inputs from a line, and machine-speed research speeds them as every machine', () => {
    const fed = foundry();
    const h = put<HopperState>(fed, 'hopper', 5, 5);
    h.item = 'cinderite';
    h.count = 2;
    const sm = put<MachineState>(fed, 'smelter', 6, 5);
    runUntil(fed, () => sm.buffer.cinderite === 2, 120);
    const slow = rig('smelter', { 'ley-iron': 1, cinderite: 1 });
    const fast = rig('smelter', { 'ley-iron': 1, cinderite: 1 });
    fast.s.research['machine-speed'] = 'restored';
    const slowTicks = runUntil(slow.s, () => slow.s.machineMade['ley-steel'] === 1, 200);
    const fastTicks = runUntil(fast.s, () => fast.s.machineMade['ley-steel'] === 1, 200);
    expect(fastTicks).toBeLessThan(slowTicks);
  });
});

describe('machines make either tier, by input (062)', () => {
  it('the knapper, shaper and plate press make their steel part from ley-steel; the focuser glass bolts from ley glass', () => {
    for (const [piece, out, n] of [['knapper', 'steel-arrowhead', 2], ['shaper', 'steel-casing', 1], ['plate-press', 'steel-plate', 2], ['focuser', 'ley-bolt+glass', 4]] as const) {
      const s = foundry();
      const h = put<HopperState>(s, 'hopper', 5, 5);
      h.item = piece === 'focuser' ? 'ley-glass' : 'ley-steel';
      h.count = 1;
      const m = put<MachineState>(s, piece, 6, 5);
      const crate = put<CrateState>(s, 'crate', 7, 5);
      runUntil(s, () => (crate.contents[out] ?? 0) === n, 200);
      expect(crate.contents).toEqual({ [out]: n });
      expect(machineRecipe(m).output).toEqual({ itemId: out, count: n });
    }
  });

  it('they still make their stone part from stone (the plate press from ley-iron), as today', () => {
    for (const [piece, input, out] of [['knapper', 'stone', 'arrowhead'], ['shaper', 'stone', 'casing'], ['plate-press', 'ley-iron', 'iron-plate'], ['focuser', 'ley-dust', 'ley-bolt']] as const) {
      const { s, crate } = rig(piece, { [input]: 1 });
      runUntil(s, () => (crate.contents[out] ?? 0) > 0, 200);
      expect(Object.keys(crate.contents)).toEqual([out]);
    }
  });

  it('the assembler, packer and mine packer make steel rounds from a steel part and the shared inputs, in stone’s counts', () => {
    for (const [piece, inputs, out, n] of [
      ['assembler', { shaft: 1, 'steel-arrowhead': 1, rope: 1 }, 'arrow+steel', 8],
      ['packer', { 'steel-casing': 1, fuse: 1, 'ley-dust': 1 }, 'bomb+steel', 4],
      ['mine-packer', { 'steel-plate': 1, fuse: 1, 'ley-dust': 1 }, 'landmine+steel', 2],
    ] as const) {
      const { s, m } = rig(piece, inputs);
      runUntil(s, () => s.machineMade[out] === n, 200);
      expect(m.buffer).toEqual(Object.fromEntries(Object.keys(inputs).map((k) => [k, 0])));
    }
  });

  it('a machine fed both tiers makes both kinds, one matching set a craft, alternating, never mixing', () => {
    const { s, m } = rig('knapper', { stone: 3, 'ley-steel': 3 });
    const made = madeOver(s, 450);
    expect(made).toHaveLength(6);
    expect(made.filter((x) => x === '2 arrowhead')).toHaveLength(3);
    expect(made.filter((x) => x === '2 steel-arrowhead')).toHaveLength(3);
    for (let i = 1; i < made.length; i++) expect(made[i]).not.toBe(made[i - 1]);
    expect(m.buffer).toEqual({ stone: 0, 'ley-steel': 0 });
  });

  it('an assembler holding both arrowheads makes stone and steel arrows from the shared shafts and rope', () => {
    const { s, m } = rig('assembler', { shaft: 2, rope: 2, arrowhead: 1, 'steel-arrowhead': 1 });
    const made = madeOver(s, 400);
    expect([...made].sort()).toEqual(['8 arrow', '8 arrow+steel']);
    expect(m.buffer).toEqual({ shaft: 0, rope: 0, arrowhead: 0, 'steel-arrowhead': 0 });
  });

  it('takes any variant’s input from a line, and refuses what no variant takes', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5);
    h.item = 'wood';
    h.count = 1;
    const m = put<MachineState>(s, 'knapper', 6, 5);
    run(s, 120);
    expect(m.buffer.wood).toBeUndefined();
    expect(h.count).toBe(1);
    h.item = 'ley-steel';
    runUntil(s, () => h.count === 0, 120);
  });
});

describe('stage machines tag tiered rounds (062)', () => {
  it('a frost rune fed steel arrows makes steel frost arrows, at the same material cost', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 6, 5);
    const crate = put<CrateState>(s, 'crate', 7, 5);
    const h = put<HopperState>(s, 'hopper', 5, 5);
    h.item = 'arrow+steel';
    h.count = 4;
    m.buffer.rimestone = 1;
    runUntil(s, () => (crate.contents['arrow+steel+frost'] ?? 0) === 4, 400);
    expect(machineRecipe(m).inputs).toEqual({ 'arrow+steel': 4, rimestone: 1 });
    expect(m.buffer.rimestone).toBe(0);
  });
});
