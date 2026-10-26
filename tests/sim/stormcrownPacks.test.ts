import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { CHAMPIONS } from '../../src/data/champions';
import { CLAIM_TICKS } from '../../src/data/claims';
import { inStormcrown } from '../../src/data/stormcrown';
import { STORMCROWN_ENEMIES } from '../../src/data/stormcrownEnemies';
import { CROWN_SPIRE } from '../../src/data/stormcrownSites';
import { enemyDef } from '../../src/data/enemies';
import { landmarkDef } from '../../src/data/landmarks';
import { HOLLOWS_START } from '../../src/data/playtest';
import { POPULATION } from '../../src/data/population';
import { claim } from '../../src/sim/claims';
import { spawnDrops } from '../../src/sim/drops';
import { pickSchematic } from '../../src/sim/schematics';
import { damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { inSafeZone, stepPopulation } from '../../src/sim/population';
import { createRng } from '../../src/sim/rng';
import { createSim, type SimState } from '../../src/sim/state';
import { arena, HALL, PLAYER_AT, run } from './fight';

// Region 4's packs (065): ring 5 holds only the Stormcrown's four, 12 packs of 4–6, at most one storm sentinel and one
// gale ram to a pack, a picked mite bringing its whole trio (3 members), only once the Stormcrown's barrier is down,
// never in the Crown Spire or a safe zone; rings 1–4 never hold them. The Weathervane's fixed guards must be cleared
// before its pylon can be claimed, and never come back once it is. Champions: 1 pack in 3, a mite's whole trio.

const FOUR = Object.keys(STORMCROWN_ENEMIES);
const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/** A populated `?start=hollows` world (every barrier down) with the player off in the foundry, after one population step. */
function populated(seed: number, opts: { claims?: readonly string[]; shut?: boolean } = {}): SimState {
  const s = createSim(seed, { start: HOLLOWS_START });
  for (const site of opts.claims ?? []) claim(s, site);
  s.enemies = s.enemies.filter((e) => !['cistern-terrace', 'ash-kilns', 'weathervane'].includes(e.group));
  s.gates.emberworks = true;
  s.gates.stormcrown = !opts.shut;
  s.populated = true;
  s.roomId = 'foundry';
  stepPopulation(s);
  return s;
}

const packsOf = (s: SimState, ring: number): EnemyState[][] => {
  const groups = new Map<string, EnemyState[]>();
  for (const e of s.enemies) if (e.group.startsWith(`pop-${ring}-`)) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  return [...groups.values()];
};

describe("ring 5's packs", () => {
  it('fill all twelve with 4–6 of the four, mites only in whole trios, at most one sentinel and one ram each, over many seeds', () => {
    expect(POPULATION.rings[5]).toEqual({ packs: 12, size: [4, 6], enemies: ['thunderhawk', 'thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram'], limits: { 'storm-sentinel': 1, 'gale-ram': 1 } });
    const seen = new Set<string>();
    let trios = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const packs = packsOf(populated(seed), 5);
      expect(packs).toHaveLength(12);
      for (const pack of packs) {
        const ids = pack.map((e) => e.enemyId);
        expect(ids.length).toBeGreaterThanOrEqual(4);
        expect(ids.length).toBeLessThanOrEqual(6);
        for (const id of ids) expect(FOUR).toContain(id);
        expect(ids.filter((id) => id === 'storm-sentinel').length).toBeLessThanOrEqual(1);
        expect(ids.filter((id) => id === 'gale-ram').length).toBeLessThanOrEqual(1);
        // Every mite is in a trio of three, all of this pack.
        const mites = pack.filter((e) => e.enemyId === 'static-mite');
        expect(mites.length % 3).toBe(0);
        const byTrio = new Map<number, number>();
        for (const m of mites) byTrio.set(m.trio, (byTrio.get(m.trio) ?? 0) + 1);
        for (const [trio, n] of byTrio) {
          expect(trio).toBeGreaterThanOrEqual(0);
          expect(n).toBe(3);
        }
        trios += byTrio.size;
        ids.forEach((id) => seen.add(id));
      }
    }
    expect([...seen].sort()).toEqual([...FOUR].sort());
    expect(trios).toBeGreaterThan(20);
  });

  it('spawn only once the Stormcrown barrier is down', () => {
    expect(packsOf(populated(3, { shut: true }), 5)).toEqual([]);
    expect(packsOf(populated(3), 5).length).toBeGreaterThan(0);
  });

  it("keep every other region's enemies out of ring 5, and the Stormcrown's out of rings 1–4", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed);
      for (const ring of [1, 2, 3, 4]) for (const pack of packsOf(s, ring)) for (const e of pack) expect(FOUR).not.toContain(e.enemyId);
      for (const e of s.enemies.filter((x) => FOUR.includes(x.enemyId))) expect(inStormcrown(tileOf(e.x), tileOf(e.y)), e.group).toBe(true);
      for (const pack of packsOf(s, 5)) for (const e of pack) expect(FOUR).toContain(e.enemyId);
    }
  });

  it('never spawn in the Crown Spire or a safe zone (the Weathervane claimed)', () => {
    const a = CROWN_SPIRE.bounds;
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed, { claims: ['weathervane'] });
      for (const pack of packsOf(s, 5)) {
        for (const e of pack) {
          const tx = tileOf(e.x);
          const ty = tileOf(e.y);
          expect(tx >= a.x0 && tx <= a.x1 && ty >= a.y0 && ty <= a.y1, `${tx},${ty}`).toBe(false);
          expect(inSafeZone(s, e.roomId, e.x, e.y)).toBe(false);
          expect(e.ring).toBe(5);
        }
      }
    }
  });

  it('hold a champion in about 1 pack in 3, a champion mite’s whole trio with it', () => {
    expect(CHAMPIONS.chanceByRing[5]).toBe(1 / 3);
    let champions = 0;
    let packs = 0;
    let trios = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const pack of packsOf(populated(seed), 5)) {
        packs += 1;
        const champs = pack.filter((e) => e.champion);
        if (champs.length === 0) continue;
        champions += 1;
        if (champs[0]?.enemyId === 'static-mite') {
          trios += 1;
          expect(champs).toHaveLength(3);
          expect(new Set(champs.map((e) => e.trio)).size).toBe(1);
        } else expect(champs).toHaveLength(1);
      }
    }
    expect(champions / packs).toBeGreaterThan(0.24);
    expect(champions / packs).toBeLessThan(0.43);
    expect(trios).toBeGreaterThan(0);
  });
});

describe("the Weathervane's guards", () => {
  const guardsOf = (s: SimState) => s.enemies.filter((e) => e.group === 'weathervane');

  it('are the fixed pack: 2 thunderhawks, a static mite trio, 1 storm sentinel and 1 gale ram', () => {
    const s = createSim(4, { start: HOLLOWS_START });
    expect(guardsOf(s).map((e) => e.enemyId).sort()).toEqual(['gale-ram', 'static-mite', 'static-mite', 'static-mite', 'storm-sentinel', 'thunderhawk', 'thunderhawk']);
    expect(guardsOf(s).every((e) => e.ring === 5)).toBe(true);
    const mites = guardsOf(s).filter((e) => e.enemyId === 'static-mite');
    expect(new Set(mites.map((e) => e.trio))).toEqual(new Set([mites[0]?.id]));
  });

  it("block the claim until they're cleared, and never come back once it's claimed", () => {
    const s = createSim(4, { start: HOLLOWS_START });
    s.bossDefeats.push('bulwark', 'forgewright');
    claim(s, 'shrine');
    const pylon = landmarkDef('weathervane').pylon ?? { tx: 0, ty: 0 };
    s.player.x = (pylon.tx + 0.5) * TILE_SIZE;
    s.player.y = (pylon.ty + 1.5) * TILE_SIZE;
    // The sentinel left standing, held still: no claim yet.
    for (const e of guardsOf(s)) if (e.enemyId !== 'storm-sentinel') damageEnemy(s, e, 1e6, 0, 0);
    for (const e of guardsOf(s)) e.frozen = 10_000;
    run(s, 1);
    expect(guardsOf(s).map((e) => e.enemyId)).toEqual(['storm-sentinel']);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS + 2);
    expect(s.claims).not.toContain('weathervane');
    for (const e of guardsOf(s)) damageEnemy(s, e, 1e6, 0, 0);
    run(s, 1);
    expect(guardsOf(s)).toEqual([]);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS + 2);
    expect(s.claims).toContain('weathervane');
    // A KO resets unclaimed land: these guards stay gone.
    s.player.health = 0;
    run(s, 400);
    expect(guardsOf(s)).toEqual([]);
  });
});

describe("the Stormcrown's drops", () => {
  it('a killed one always drops a stormglass, cinderite about 20%, the storm coil about 4% (a mite at a third of all of it)', () => {
    const s = arena();
    s.rng = createRng(11);
    const trials = 3000;
    const count = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
    let cinderite = 0;
    let coils = 0;
    const three = FOUR.filter((id) => id !== 'static-mite');
    for (let i = 0; i < trials; i++) {
      s.groundItems = [];
      spawnDrops(s, enemyDef(three[i % three.length] ?? 'thunderhawk'), PLAYER_AT.x, PLAYER_AT.y, HALL);
      expect(count('stormglass')).toBe(1);
      cinderite += count('cinderite');
      coils += count('storm-coil');
    }
    expect(Math.abs(cinderite / trials - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(coils / trials - 0.04)).toBeLessThan(0.012);
  });

  it('the shared schematic roll has a schematic to land in the Stormcrown (Region 4)', () => {
    const s = createSim(2);
    const pylon = landmarkDef('weathervane').pylon ?? { tx: 0, ty: 0 };
    expect(pickSchematic(s, 'overworld', { x: (pylon.tx + 0.5) * TILE_SIZE, y: (pylon.ty + 0.5) * TILE_SIZE })).toBe('schematic-machine-speed');
  });
});
