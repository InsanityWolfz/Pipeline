import { describe, expect, it } from 'vitest';
import { END_CARD } from '../../src/data/endCard';
import { LIGHTNING_ROUNDS, OBJECTIVES } from '../../src/data/objectives';
import { HOLLOWS_START } from '../../src/data/playtest';
import { STORMCROWN } from '../../src/data/stormcrown';
import { polar } from '../../src/data/worldShape';
import { waypoint } from '../../src/sim/objectiveTarget';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 064: Milestone 3's goals, after 062's: into the Stormcrown, stormglass, the Weathervane, a lightning round, the
// Conductor, the fifth entrance and all five fed. The end card moves to the Conductor's first kill.

const at = (text: string): number => {
  const i = OBJECTIVES.findIndex((o) => o.text === text);
  if (i < 0) throw new Error(`no goal '${text}'`);
  return i;
};

const M3 = [
  'Reach the Stormcrown',
  'Gather stormglass at the Rod Field',
  "Claim the Weathervane's pylon",
  'Craft a lightning round (C)',
  'Defeat the Conductor',
  "Restore the intake's fifth entrance (E with the Conductor core)",
  'Feed all five entrances',
];

/** The Hollows start past the Forgewright, the land quiet but for the Conductor, every goal before `text` done, nothing crafted. */
function upTo(text: string): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.bossDefeats.push('bulwark', 'forgewright');
  s.gates.emberworks = true;
  s.gates.stormcrown = true;
  s.enemies = s.enemies.filter((e) => e.enemyId === 'conductor');
  s.crafted = [];
  const goal = at(text);
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  run(s, 1);
  return s;
}

describe('the m3 goal chain (064)', () => {
  it('follows 062’s "Fire steel rounds", in order, each tagged m3 (066: then the storm tier’s three end the chain)', () => {
    const first = at('Fire steel rounds') + 1;
    expect(OBJECTIVES.slice(first, first + M3.length).map((o) => o.text)).toEqual(M3);
    expect(OBJECTIVES.filter((o) => o.milestone === 'm3').map((o) => o.text)).toEqual([...M3, 'Temper stormsteel at the bench (C)', 'Build a Tempering coil into a line', 'Fire stormsteel rounds']);
    expect(OBJECTIVES.filter((o) => !o.cutIn).at(-1)?.text).toBe('Fire stormsteel rounds');
    expect(LIGHTNING_ROUNDS).toContain('arrow+lightning');
    expect(LIGHTNING_ROUNDS.length).toBeGreaterThanOrEqual(4);
  });

  it('reaching the Stormcrown points at the nearest of its ramps’ tops, and completes in region 4', () => {
    const s = upTo('Reach the Stormcrown');
    expect(currentObjective(s)).toBe(at('Reach the Stormcrown'));
    const w = waypoint(s);
    expect(w?.target.kind).toBe('ramps');
    const tops = STORMCROWN.ramps.map((r) => polar(r.bearing, STORMCROWN.ramp.gateAt));
    expect(tops.some((t) => w?.x === (t.tx + 0.5) * 32 && w.y === (t.ty + 1) * 32)).toBe(true);
    const ramp = STORMCROWN.ramps[0] ?? { bearing: 0 };
    const top = tileCentre(polar(ramp.bearing, STORMCROWN.ramp.to + 2));
    movePlayer(s, top.x, top.y);
    run(s, 1);
    expect(s.objectives[at('Reach the Stormcrown')]).toBe(true);
  });

  it('gathering stormglass, claiming the Weathervane and crafting a lightning round each complete their goal', () => {
    const s = upTo('Gather stormglass at the Rod Field');
    expect(waypoint(s)?.target).toMatchObject({ kind: 'nodes', ref: 'storm-rod' });
    s.gathered.push('stormglass');
    run(s, 1);
    expect(s.objectives[at('Gather stormglass at the Rod Field')]).toBe(true);
    expect(waypoint(s)?.target).toMatchObject({ kind: 'pylon' });
    s.claims.push('weathervane');
    run(s, 1);
    expect(s.objectives[at("Claim the Weathervane's pylon")]).toBe(true);
    expect(currentObjective(s)).toBe(at('Craft a lightning round (C)'));
    s.crafted.push('ley-bolt+lightning');
    run(s, 1);
    expect(s.objectives[at('Craft a lightning round (C)')]).toBe(true);
  });

  it('defeating the Conductor completes its goal; its goal points at it', () => {
    const s = upTo('Defeat the Conductor');
    const c = s.enemies.find((e) => e.enemyId === 'conductor');
    expect(waypoint(s)).toMatchObject({ x: c?.x, y: c?.y, target: { kind: 'boss' } });
    if (c) c.health = 0;
    run(s, 1);
    expect(s.objectives[at('Defeat the Conductor')]).toBe(true);
  });

  it('restoring the fifth entrance and feeding all five complete their goals; 066: the storm tier’s goals follow', () => {
    const s = upTo("Restore the intake's fifth entrance (E with the Conductor core)");
    s.research['entrance-5'] = 'restored';
    for (const e of s.link.entrances) e.open = true;
    run(s, 1);
    expect(s.objectives[at("Restore the intake's fifth entrance (E with the Conductor core)")]).toBe(true);
    expect(currentObjective(s)).toBe(at('Feed all five entrances'));
    for (const [k, e] of s.link.entrances.entries()) Object.assign(e, { ammoId: 'arrow', count: 1 + k });
    run(s, 1);
    expect(s.objectives[at('Feed all five entrances')]).toBe(true);
    expect(currentObjective(s)).toBe(at('Temper stormsteel at the bench (C)'));
  });
});

describe('the end card (064)', () => {
  it('comes after the Conductor’s first kill', () => {
    expect(END_CARD.boss).toBe('conductor');
  });
});
