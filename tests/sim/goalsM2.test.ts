import { describe, expect, it } from 'vitest';
import { END_CARD } from '../../src/data/endCard';
import { EMBERWORKS } from '../../src/data/emberworks';
import { landmarkDef } from '../../src/data/landmarks';
import { FIRE_ROUNDS, OBJECTIVES } from '../../src/data/objectives';
import { HOLLOWS_START } from '../../src/data/playtest';
import { polar } from '../../src/data/worldShape';
import { waypoint } from '../../src/sim/objectiveTarget';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 060: Milestone 2's goals, after "Feed all three entrances": into the Emberworks, cinderite, the Ash Kilns, a fire
// round, the Forgewright, the fourth entrance and all four fed. The end card moves to the Forgewright's first kill.

const at = (text: string): number => {
  const i = OBJECTIVES.findIndex((o) => o.text === text);
  if (i < 0) throw new Error(`no goal '${text}'`);
  return i;
};

const M2 = [
  'Reach the Emberworks',
  'Gather cinderite at the Cinder Vents',
  "Claim the Ash Kilns' pylon",
  'Craft a fire round (C)',
  'Defeat the Forgewright',
  "Restore the intake's fourth entrance (E with the Forgewright core)",
  'Feed all four entrances',
];

/** The Hollows start past the Bulwark, the land quiet, every goal before `text` done. */
function upTo(text: string): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark');
  s.enemies = s.enemies.filter((e) => e.enemyId === 'forgewright');
  const goal = at(text);
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  run(s, 1);
  return s;
}

describe('the m2 goal chain (060)', () => {
  it('follows "Feed all three entrances", in order, each tagged m2 (062: the tier goals follow)', () => {
    const first = at('Feed all three entrances') + 1;
    expect(OBJECTIVES.slice(first, first + M2.length).map((o) => o.text)).toEqual(M2);
    // 062: then the material tiers' three (tests/sim/goalsTiers.test.ts), which end the chain.
    expect(OBJECTIVES.filter((o) => o.milestone === 'm2').map((o) => o.text).slice(0, M2.length)).toEqual(M2);
    expect(OBJECTIVES.filter((o) => !o.cutIn).at(-4)?.text).toBe('Feed all four entrances');
    expect(FIRE_ROUNDS).toContain('arrow+fire');
    expect(FIRE_ROUNDS.length).toBeGreaterThanOrEqual(4);
  });

  it('reaching the Emberworks points at the nearest ramp’s top, and completes in region 3', () => {
    const s = upTo('Reach the Emberworks');
    expect(currentObjective(s)).toBe(at('Reach the Emberworks'));
    const w = waypoint(s);
    expect(w?.target.kind).toBe('ramps');
    const tops = EMBERWORKS.ramps.map((r) => polar(r.bearing, EMBERWORKS.ramp.gateAt));
    expect(tops.some((t) => w?.x === (t.tx + 0.5) * 32 && w.y === (t.ty + 1) * 32)).toBe(true);
    const ramp = EMBERWORKS.ramps[1] ?? { bearing: 0 };
    const top = tileCentre(polar(ramp.bearing, EMBERWORKS.ramp.to + 2));
    movePlayer(s, top.x, top.y);
    run(s, 1);
    expect(s.objectives[at('Reach the Emberworks')]).toBe(true);
  });

  it('gathering cinderite, claiming the Ash Kilns and crafting a fire round each complete their goal', () => {
    const s = upTo('Gather cinderite at the Cinder Vents');
    expect(waypoint(s)?.target).toMatchObject({ kind: 'nodes', ref: 'cinder-vent' });
    s.events.harvests.push({ id: 0, nodeId: 'cinder-vent', itemId: 'cinderite', x: 0, y: 0 });
    run(s, 1);
    s.gathered.push('cinderite');
    run(s, 1);
    expect(s.objectives[at('Gather cinderite at the Cinder Vents')]).toBe(true);
    expect(waypoint(s)?.target.kind).toBe('pylon');
    s.claims.push(landmarkDef('ash-kilns').id);
    run(s, 1);
    expect(s.objectives[at("Claim the Ash Kilns' pylon")]).toBe(true);
    s.crafted.push('bomb+fire');
    run(s, 1);
    expect(s.objectives[at('Craft a fire round (C)')]).toBe(true);
  });

  it('defeating the Forgewright completes its goal; its goal points at it', () => {
    const s = upTo('Defeat the Forgewright');
    const f = s.enemies.find((e) => e.enemyId === 'forgewright');
    expect(waypoint(s)).toMatchObject({ x: f?.x, y: f?.y, target: { kind: 'boss' } });
    if (f) Object.assign(f, { vent: 10, health: 0 });
    run(s, 1);
    expect(s.objectives[at('Defeat the Forgewright')]).toBe(true);
  });

  it('restoring the fourth entrance and feeding all four complete their goals', () => {
    const s = upTo("Restore the intake's fourth entrance (E with the Forgewright core)");
    s.research['entrance-4'] = 'restored';
    for (const e of s.link.entrances) e.open = true;
    run(s, 1);
    expect(s.objectives[at("Restore the intake's fourth entrance (E with the Forgewright core)")]).toBe(true);
    for (const [k, e] of s.link.entrances.entries()) Object.assign(e, { ammoId: 'arrow', count: 1 + k });
    run(s, 1);
    expect(s.objectives[at('Feed all four entrances')]).toBe(true);
    // 062: the material tiers' goals come next (this start has crafted everything, ley-steel too).
    expect(currentObjective(s)).toBeGreaterThan(at('Feed all four entrances'));
  });
});

describe('the end card (042, 060)', () => {
  it('comes after the Forgewright’s first kill, not the Bulwark’s', () => {
    expect(END_CARD.boss).toBe('forgewright');
  });
});
