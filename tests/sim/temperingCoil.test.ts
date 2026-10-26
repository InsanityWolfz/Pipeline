import { describe, expect, it } from 'vitest';
import { JAM_TICKS } from '../../src/data/foundry';
import { machineDef } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import type { CrateState, HopperState, MachineState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { statusRecipe } from '../../src/sim/flow';
import { machineRecipe } from '../../src/sim/stages';
import { run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

// 066: the Tempering coil charges ley-steel and ley glass with stormglass into stormsteel and storm glass, by input; the
// machines already in a line make the stormsteel (or storm glass) version from it, as 062's machines make steel: one
// matching set per craft, never mixing, taking turns through every tier they're fed.

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

describe('the Tempering coil (066)', () => {
  it('is a 1×1 Forge machine running stormsteel and storm glass by input, each 60 ticks', () => {
    expect(machineDef('tempering-coil')).toMatchObject({ footprint: '1x1', craftTicks: 60, recipeId: 'stormsteel', variants: ['storm-glass'], category: 'forge' });
    expect(recipeDef('stormsteel')).toMatchObject({ inputs: { 'ley-steel': 1, stormglass: 1 }, output: { itemId: 'stormsteel', count: 1 } });
    expect(recipeDef('storm-glass')).toMatchObject({ inputs: { 'ley-glass': 1, stormglass: 1 }, output: { itemId: 'storm-glass', count: 1 } });
  });

  it('tempers 1 ley-steel and 1 stormglass into 1 stormsteel in 60 ticks', () => {
    const { s, m, crate } = rig('tempering-coil', { 'ley-steel': 1, stormglass: 1 });
    const ticks = runUntil(s, () => (crate.contents.stormsteel ?? 0) > 0, 200);
    expect(ticks).toBeGreaterThanOrEqual(60);
    expect(ticks).toBeLessThan(70);
    expect(crate.contents).toEqual({ stormsteel: 1 });
    expect(machineRecipe(m).id).toBe('stormsteel');
  });

  it('tempers 1 ley glass and 1 stormglass into 1 storm glass, and its hover’s recipe follows', () => {
    const { s, m, crate } = rig('tempering-coil', { 'ley-glass': 1, stormglass: 1 });
    runUntil(s, () => m.crafting, 10);
    expect(machineRecipe(m).id).toBe('storm-glass');
    runUntil(s, () => (crate.contents['storm-glass'] ?? 0) > 0, 70);
    expect(crate.contents).toEqual({ 'storm-glass': 1 });
  });

  it('fed both sets, makes both kinds in turn, one set a craft, never mixing', () => {
    const { s, m } = rig('tempering-coil', { 'ley-steel': 2, 'ley-glass': 2, stormglass: 4 });
    const made = madeOver(s, 400);
    expect([...made].sort()).toEqual(['1 storm-glass', '1 storm-glass', '1 stormsteel', '1 stormsteel']);
    for (let i = 1; i < made.length; i++) expect(made[i]).not.toBe(made[i - 1]);
    expect(m.buffer).toEqual({ 'ley-steel': 0, 'ley-glass': 0, stormglass: 0 });
  });

  it('takes its inputs from a line, and machine-speed research speeds it as every machine', () => {
    const fed = foundry();
    const h = put<HopperState>(fed, 'hopper', 5, 5);
    h.item = 'stormglass';
    h.count = 2;
    const coil = put<MachineState>(fed, 'tempering-coil', 6, 5);
    runUntil(fed, () => coil.buffer.stormglass === 2, 120);
    h.item = 'ley-glass';
    h.count = 1;
    runUntil(fed, () => fed.machineMade['storm-glass'] === 1, 200);
    const slow = rig('tempering-coil', { 'ley-steel': 1, stormglass: 1 });
    const fast = rig('tempering-coil', { 'ley-steel': 1, stormglass: 1 });
    fast.s.research['machine-speed'] = 'restored';
    const slowTicks = runUntil(slow.s, () => slow.s.machineMade.stormsteel === 1, 200);
    const fastTicks = runUntil(fast.s, () => fast.s.machineMade.stormsteel === 1, 200);
    expect(fastTicks).toBeLessThan(slowTicks);
  });

  it('refuses what neither of its recipes takes', () => {
    const s = foundry();
    const h = put<HopperState>(s, 'hopper', 5, 5);
    h.item = 'ley-iron';
    h.count = 1;
    const m = put<MachineState>(s, 'tempering-coil', 6, 5);
    run(s, 120);
    expect(m.buffer['ley-iron']).toBeUndefined();
    expect(h.count).toBe(1);
  });
});

describe('machines make the storm tier, by input (066)', () => {
  it('the knapper, shaper and plate press make their stormsteel part from stormsteel; the focuser storm glass bolts', () => {
    for (const [piece, input, out, n] of [
      ['knapper', 'stormsteel', 'stormsteel-arrowhead', 2],
      ['shaper', 'stormsteel', 'stormsteel-casing', 1],
      ['plate-press', 'stormsteel', 'stormsteel-plate', 2],
      ['focuser', 'storm-glass', 'ley-bolt+storm-glass', 4],
    ] as const) {
      const s = foundry();
      const h = put<HopperState>(s, 'hopper', 5, 5);
      h.item = input;
      h.count = 1;
      const m = put<MachineState>(s, piece, 6, 5);
      const crate = put<CrateState>(s, 'crate', 7, 5);
      runUntil(s, () => (crate.contents[out] ?? 0) === n, 200);
      expect(crate.contents, piece).toEqual({ [out]: n });
      expect(machineRecipe(m).output).toEqual({ itemId: out, count: n });
    }
  });

  it('the assembler, packer and mine packer make stormsteel rounds from the stormsteel part and the shared inputs, in stone’s counts', () => {
    for (const [piece, inputs, out, n] of [
      ['assembler', { shaft: 1, 'stormsteel-arrowhead': 1, rope: 1 }, 'arrow+stormsteel', 8],
      ['packer', { 'stormsteel-casing': 1, fuse: 1, 'ley-dust': 1 }, 'bomb+stormsteel', 4],
      ['mine-packer', { 'stormsteel-plate': 1, fuse: 1, 'ley-dust': 1 }, 'landmine+stormsteel', 2],
    ] as const) {
      const { s, m } = rig(piece, inputs);
      runUntil(s, () => s.machineMade[out] === n, 200);
      expect(m.buffer, piece).toEqual(Object.fromEntries(Object.keys(inputs).map((k) => [k, 0])));
    }
  });

  it('each tiered machine lists stone, steel and stormsteel in that order', () => {
    expect(machineDef('knapper').variants).toEqual(['steel-arrowhead', 'stormsteel-arrowhead']);
    expect(machineDef('assembler').variants).toEqual(['steel-arrow', 'stormsteel-arrow']);
    expect(machineDef('shaper').variants).toEqual(['steel-casing', 'stormsteel-casing']);
    expect(machineDef('packer').variants).toEqual(['steel-bomb', 'stormsteel-bomb']);
    expect(machineDef('focuser').variants).toEqual(['glass-bolt', 'storm-glass-bolt']);
    expect(machineDef('plate-press').variants).toEqual(['steel-plate', 'stormsteel-plate']);
    expect(machineDef('mine-packer').variants).toEqual(['steel-landmine', 'stormsteel-landmine']);
  });

  it('a knapper fed all three tiers makes all three in turn, one matching set a craft', () => {
    const { s, m } = rig('knapper', { stone: 2, 'ley-steel': 2, stormsteel: 2 });
    const made = madeOver(s, 450);
    // In turn after the kind it made last (a new knapper's is its own, the stone arrowhead): steel, stormsteel, stone.
    expect(made).toEqual(['2 steel-arrowhead', '2 stormsteel-arrowhead', '2 arrowhead', '2 steel-arrowhead', '2 stormsteel-arrowhead', '2 arrowhead']);
    expect(m.buffer).toEqual({ stone: 0, 'ley-steel': 0, stormsteel: 0 });
  });

  it('an assembler holding steel and stormsteel arrowheads never mixes them inside one craft', () => {
    const { s, m } = rig('assembler', { shaft: 2, rope: 2, 'steel-arrowhead': 1, 'stormsteel-arrowhead': 1 });
    const made = madeOver(s, 400);
    expect([...made].sort()).toEqual(['8 arrow+steel', '8 arrow+stormsteel']);
    expect(m.buffer).toEqual({ shaft: 0, rope: 0, 'steel-arrowhead': 0, 'stormsteel-arrowhead': 0 });
  });

  it('a knapper whose stormsteel arrowheads stop moving, with a stone set waiting, reads blocked after JAM_TICKS on the stone recipe', () => {
    const s = foundry();
    // Nothing in front: its output can't go out.
    const m = put<MachineState>(s, 'knapper', 6, 5);
    Object.assign(m, { made: 'stormsteel-arrowhead', output: 2 });
    Object.assign(m.buffer, { stone: 1 });
    run(s, 1);
    // A hand-off at first: the stone set waits for the stormsteel arrowheads to go out (062).
    expect(m).toMatchObject({ crafting: false, output: 2, status: 'working', missing: [] });
    expect(statusRecipe(m)).toBe(recipeDef('arrowhead'));
    run(s, JAM_TICKS);
    expect(m).toMatchObject({ crafting: false, output: 2, made: 'stormsteel-arrowhead', status: 'blocked', missing: [] });
    expect(statusRecipe(m)).toBe(recipeDef('arrowhead'));
    expect(m.buffer).toEqual({ stone: 1 });
  });
});

describe('stage machines tag storm rounds (066)', () => {
  it('a frost rune fed stormsteel arrows makes Stormsteel Frost arrows, at the same material cost', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 6, 5);
    const crate = put<CrateState>(s, 'crate', 7, 5);
    const h = put<HopperState>(s, 'hopper', 5, 5);
    h.item = 'arrow+stormsteel';
    h.count = 4;
    m.buffer.rimestone = 1;
    runUntil(s, () => (crate.contents['arrow+stormsteel+frost'] ?? 0) === 4, 400);
    expect(machineRecipe(m).inputs).toEqual({ 'arrow+stormsteel': 4, rimestone: 1 });
    expect(m.buffer.rimestone).toBe(0);
  });

  it('a Lightning rune fed storm glass bolts makes Storm glass Lightning ley bolts', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'lightning-rune', 6, 5);
    const crate = put<CrateState>(s, 'crate', 7, 5);
    const h = put<HopperState>(s, 'hopper', 5, 5);
    h.item = 'ley-bolt+storm-glass';
    h.count = 4;
    m.buffer.stormglass = 1;
    runUntil(s, () => (crate.contents['ley-bolt+storm-glass+lightning'] ?? 0) === 4, 400);
    expect(m.buffer.stormglass).toBe(0);
  });
});
