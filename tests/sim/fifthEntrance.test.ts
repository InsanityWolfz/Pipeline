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

// The fifth entrance (064): the intake grows to five mouths, the last at tx 15 capped until `entrance-5` (a Conductor
// core, after `entrance-4`) is restored there; five fed entrances fan symmetrically at 0°, ±15° and ±30° (048's rule),
// the design's five-arrow spread.

function under(s: SimState, t: { tx: number; ty: number }): void {
  const at = tileCentre({ tx: t.tx, ty: t.ty + 1 });
  movePlayer(s, at.x, at.y);
}

const opens = (s: SimState) => s.link.entrances.map((e) => e.open);
const FIFTH = INTAKE.entrances[4] ?? { tx: 0, ty: 0 };

describe('the fifth entrance', () => {
  it('is a fifth mouth at tx 15, lane 4, capped at the start; the mouth’s middle is tx 13', () => {
    expect(INTAKE.entrances.at(-1)).toEqual({ tx: 15, ty: 0, startsOpen: false, lane: 4 });
    expect(INTAKE.entrances).toHaveLength(5);
    expect(INTAKE_MID_TX).toBe(13);
    expect(opens(foundry())).toEqual([false, true, false, false, false]);
  });

  it('entrance-5 costs a Conductor core and needs entrance-4', () => {
    expect(researchNode('entrance-5')).toMatchObject({ name: 'Fifth entrance', anchor: { kind: 'entrance' }, cost: { 'conductor-core': 1 }, requires: ['entrance-4'], reveal: 'start', effect: { kind: 'entrance' } });
  });

  it('after the Warden’s, the Bulwark’s and the Forgewright’s, the last cap takes a Conductor core and opens', () => {
    const s = foundry();
    for (const n of ['entrance-2', 'entrance-3', 'entrance-4']) s.research[n] = 'restored';
    for (const i of [0, 2, 3]) Object.assign(s.link.entrances[i] ?? {}, { open: true });
    under(s, FIFTH);
    expect(diagrams(s).filter((d) => d.entrance !== null)).toEqual([expect.objectContaining({ node: 'entrance-5', entrance: 4, dimmed: false })]);
    expect(restoreFail(s, 'entrance-5')).toBe('cost');
    s.inventory['conductor-core'] = 1;
    expect(diagramInReach(s)).toMatchObject({ node: 'entrance-5', entrance: 4 });
    run(s, 1, { restore: 'entrance-5' });
    expect(opens(s)).toEqual([true, true, true, true, true]);
    expect(s.inventory['conductor-core']).toBe(0);
    expect(s.events.intakeOpens).toEqual([{ entrance: 4 }]);
  });

  it('before entrance-4, a Conductor core can’t restore it', () => {
    const s = foundry();
    for (const n of ['entrance-2', 'entrance-3']) s.research[n] = 'restored';
    s.inventory['conductor-core'] = 1;
    expect(restoreFail(s, 'entrance-5')).toBe('requires');
  });

  it('five fed entrances fan symmetrically at 0°, ±15° and ±30°, west to east', () => {
    expect(laneAngles(5)).toEqual([-30, -15, 0, 15, 30]);
    const s = foundry();
    s.inventory = {};
    s.link.entrances.forEach((e) => Object.assign(e, { open: true, ammoId: 'arrow', count: 5 }));
    stepOutside(s);
    movePlayer(s, 400, 400);
    run(s, 1, volleyAt(600, 400));
    const angles = s.arrows.map((a) => Math.round(((Math.atan2(a.dy, a.dx) * 180) / Math.PI) * 10) / 10);
    expect(angles).toEqual([-30, -15, 0, 15, 30]);
  });
});

describe('what the fifth entrance brings', () => {
  it('the Conductor core and the storm coil, each with an icon and an inventory group', () => {
    expect(ITEMS['conductor-core']).toMatchObject({ name: 'Conductor core', kind: 'part', group: 'cores', research: 'core' });
    expect(ITEMS['storm-coil']).toMatchObject({ name: 'Storm coil', kind: 'part', group: 'parts', research: 'machinePart' });
    for (const id of ['conductor-core', 'storm-coil']) expect(ITEMS[id]?.icon).toMatch(/^item-/);
  });

  it('the pipe draws five inlets, five gauge columns and five tube-slot frames; the sandbox loads five entrances', () => {
    expect(INTAKE_INLETS).toEqual(INTAKE.entrances.map((e) => (e.tx - INTAKE_MID_TX) * 32));
    expect(INTAKE_INLETS).toEqual([-64, -32, 0, 32, 64]);
    expect(INTAKE_LOOK.gauge.xs).toHaveLength(5);
    expect(TUBE_SLOT_FRAMES).toHaveLength(5);
    expect(SANDBOX.loadout).toEqual(['arrow', 'arrow', 'arrow', 'arrow', 'arrow']);
  });
});
