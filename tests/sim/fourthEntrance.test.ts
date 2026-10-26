import { describe, expect, it } from 'vitest';
import { INTAKE, INTAKE_MID_TX } from '../../src/data/foundry';
import { ITEMS } from '../../src/data/items';
import { researchNode } from '../../src/data/research';
import { SANDBOX } from '../../src/data/sandbox';
import { TUBE_SLOT_FRAMES } from '../../src/data/assets';
import { INTAKE_INLETS, INTAKE_LOOK } from '../../src/data/art/intake';
import { diagramInReach, diagrams, restoreFail } from '../../src/sim/research';
import { laneAngles } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run, volleyAt } from './fight';
import { foundry, stepOutside } from './foundryKit';

// The fourth entrance (060): the intake grows to four mouths, the new one at tx 14 capped until
// `entrance-4` (a Forgewright core, after `entrance-3`) is restored there; four fed entrances fan
// symmetrically at ±7.5° and ±22.5° (048's rule).

/** Feet on the floor tile under a mouth tile. */
function under(s: SimState, t: { tx: number; ty: number }): void {
  const at = tileCentre({ tx: t.tx, ty: t.ty + 1 });
  movePlayer(s, at.x, at.y);
}

const opens = (s: SimState) => s.link.entrances.map((e) => e.open);
const FOURTH = INTAKE.entrances[3] ?? { tx: 0, ty: 0 };

describe('the fourth entrance', () => {
  it('is a fourth mouth at tx 14, lane 3, capped at the start (064: a fifth beside it, tests/sim/fifthEntrance.test.ts)', () => {
    expect(INTAKE.entrances.slice(0, 4)).toEqual([
      { tx: 11, ty: 0, startsOpen: false, lane: 0 },
      { tx: 12, ty: 0, startsOpen: true, lane: 1 },
      { tx: 13, ty: 0, startsOpen: false, lane: 2 },
      { tx: 14, ty: 0, startsOpen: false, lane: 3 },
    ]);
    expect(INTAKE_MID_TX).toBe(13);
    expect(opens(foundry())).toEqual([false, true, false, false, false]);
  });

  it('entrance-4 costs a Forgewright core and needs entrance-3', () => {
    expect(researchNode('entrance-4')).toMatchObject({ name: 'Fourth entrance', anchor: { kind: 'entrance' }, cost: { 'forgewright-core': 1 }, requires: ['entrance-3'], reveal: 'start', effect: { kind: 'entrance' } });
  });

  it('after the Warden’s and the Bulwark’s, the last cap takes a Forgewright core and opens', () => {
    const s = foundry();
    s.research['entrance-2'] = 'restored';
    s.research['entrance-3'] = 'restored';
    for (const i of [0, 2]) Object.assign(s.link.entrances[i] ?? {}, { open: true });
    under(s, FOURTH);
    // 064: on either cap left, the fifth's too (one core opens one cap, any cap).
    expect(diagrams(s).filter((d) => d.entrance !== null)).toEqual([expect.objectContaining({ node: 'entrance-4', entrance: 3, dimmed: false }), expect.objectContaining({ node: 'entrance-4', entrance: 4 })]);
    expect(restoreFail(s, 'entrance-4')).toBe('cost');
    s.inventory['forgewright-core'] = 1;
    expect(diagramInReach(s)).toMatchObject({ node: 'entrance-4', entrance: 3 });
    run(s, 1, { restore: 'entrance-4' });
    expect(opens(s)).toEqual([true, true, true, true, false]);
    expect(s.inventory['forgewright-core']).toBe(0);
    expect(s.events.intakeOpens).toEqual([{ entrance: 3 }]);
    // 064: the fifth cap's node is the Conductor's now.
    expect(diagrams(s).filter((d) => d.entrance !== null)).toEqual([expect.objectContaining({ node: 'entrance-5', entrance: 4 })]);
  });

  it('before entrance-3, the fourth cap’s next node is still the Bulwark’s (one core opens one cap, any cap)', () => {
    const s = foundry();
    s.research['entrance-2'] = 'restored';
    Object.assign(s.link.entrances[0] ?? {}, { open: true });
    under(s, FOURTH);
    expect(diagramInReach(s)).toMatchObject({ node: 'entrance-3', entrance: 3 });
    s.inventory['forgewright-core'] = 1;
    expect(restoreFail(s, 'entrance-4')).toBe('requires');
  });

  it('four fed entrances fan symmetrically at ±7.5° and ±22.5°, west to east', () => {
    expect(laneAngles(4)).toEqual([-22.5, -7.5, 7.5, 22.5]);
    const s = foundry();
    s.inventory = {};
    // 064: four of the five.
    s.link.entrances.slice(0, 4).forEach((e) => Object.assign(e, { open: true, ammoId: 'arrow', count: 5 }));
    stepOutside(s);
    movePlayer(s, 400, 400);
    run(s, 1, volleyAt(600, 400));
    const angles = s.arrows.map((a) => Math.round(((Math.atan2(a.dy, a.dx) * 180) / Math.PI) * 10) / 10);
    expect(angles).toEqual([-22.5, -7.5, 7.5, 22.5]);
  });
});

describe('what the fourth entrance brings', () => {
  it('the Forgewright core and the forge rivet, each with an icon and an inventory group', () => {
    expect(ITEMS['forgewright-core']).toMatchObject({ name: 'Forgewright core', kind: 'part', group: 'cores', research: 'core' });
    expect(ITEMS['forge-rivet']).toMatchObject({ name: 'Forge rivet', kind: 'part', group: 'parts', research: 'machinePart' });
    for (const id of ['forgewright-core', 'forge-rivet']) expect(ITEMS[id]?.icon).toMatch(/^item-/);
  });

  it('the pipe draws an inlet, a gauge column and a tube-slot frame for each entrance (064: five); the sandbox loads them all', () => {
    expect(INTAKE_INLETS).toEqual(INTAKE.entrances.map((e) => (e.tx - INTAKE_MID_TX) * 32));
    expect(INTAKE_LOOK.gauge.xs).toHaveLength(INTAKE.entrances.length);
    expect(TUBE_SLOT_FRAMES).toHaveLength(INTAKE.entrances.length);
    expect(SANDBOX.loadout).toHaveLength(INTAKE.entrances.length);
  });
});
