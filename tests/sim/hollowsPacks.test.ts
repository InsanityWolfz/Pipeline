import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { CHAMPIONS } from '../../src/data/champions';
import { attackOf, enemyDef } from '../../src/data/enemies';
import { HOLLOWS, inHollows } from '../../src/data/hollows';
import { HOLLOWS_ENEMIES } from '../../src/data/hollowsEnemies';
import { HOLLOWS_START } from '../../src/data/playtest';
import { POPULATION } from '../../src/data/population';
import { UNIDENTIFIED_ARMOR } from '../../src/data/armor';
import { claim } from '../../src/sim/claims';
import { championDef, makeChampion } from '../../src/sim/champions';
import { spawnDrops } from '../../src/sim/drops';
import { createEnemy } from '../../src/sim/enemies';
import { createRng } from '../../src/sim/rng';
import { inSafeZone, stepPopulation } from '../../src/sim/population';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, PLAYER_AT, run } from './fight';

// Region 2's packs (035): ring 3 holds only the four, with at most one Sniper and two
// Burrowers to a pack, never in the arena or a safe zone; rings 1–2 never hold them;
// champions of the four scale their speeds and damage but never their telegraphs; drops.

const FOUR = Object.keys(HOLLOWS_ENEMIES);
const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/** A populated `?start=hollows` world (the barrier down) with the player off in the foundry, after one population step: every slot fills. */
function populated(seed: number, claims: readonly string[] = []): SimState {
  const s = createSim(seed, { start: HOLLOWS_START });
  for (const site of claims) claim(s, site);
  s.enemies = s.enemies.filter((e) => e.group !== 'cistern-terrace');
  s.populated = true;
  s.roomId = 'foundry';
  stepPopulation(s);
  return s;
}

const packsOf = (s: SimState, ring: number) => {
  const groups = new Map<string, string[]>();
  for (const e of s.enemies) if (e.group.startsWith(`pop-${ring}-`)) groups.set(e.group, [...(groups.get(e.group) ?? []), e.enemyId]);
  return [...groups.values()];
};

describe("ring 3's packs", () => {
  it('fill all six with 4–5 of the four, at most one Sniper and two Burrowers each, over many seeds', () => {
    let snipers = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const packs = packsOf(populated(seed), 3);
      expect(packs).toHaveLength(POPULATION.rings[3].packs);
      for (const pack of packs) {
        expect(pack.length).toBeGreaterThanOrEqual(4);
        expect(pack.length).toBeLessThanOrEqual(5);
        for (const id of pack) expect(FOUR).toContain(id);
        expect(pack.filter((id) => id === 'sniper').length).toBeLessThanOrEqual(1);
        expect(pack.filter((id) => id === 'burrower').length).toBeLessThanOrEqual(2);
        snipers += pack.filter((id) => id === 'sniper').length;
      }
    }
    // The limits only trim: snipers still turn up.
    expect(snipers).toBeGreaterThan(0);
  });

  it('keep Husks and Wisps out of the Hollows, and the four out of rings 1 and 2', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed);
      for (const pack of [...packsOf(s, 1), ...packsOf(s, 2)]) for (const id of pack) expect(['husk', 'wisp']).toContain(id);
      for (const e of s.enemies.filter((x) => FOUR.includes(x.enemyId))) expect(inHollows(tileOf(e.x), tileOf(e.y)), e.group).toBe(true);
      for (const e of s.enemies.filter((x) => inHollows(tileOf(x.x), tileOf(x.y)))) expect(['husk', 'wisp']).not.toContain(e.enemyId);
    }
  });

  it('never spawn in the arena or in a safe zone (the Cistern Terrace claimed)', () => {
    const a = HOLLOWS.arena.bounds;
    for (let seed = 1; seed <= 10; seed++) {
      const s = populated(seed, ['cistern-terrace']);
      for (const e of s.enemies.filter((x) => x.group.startsWith('pop-3-'))) {
        const tx = tileOf(e.x);
        const ty = tileOf(e.y);
        expect(tx >= a.x0 && tx <= a.x1 && ty >= a.y0 && ty <= a.y1, `${tx},${ty}`).toBe(false);
        expect(inSafeZone(s, e.roomId, e.x, e.y)).toBe(false);
      }
    }
  });

  it("guard the Cistern Terrace with the fixed pack, which can hold a champion (ring 3's 1 in 4)", () => {
    let champions = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = createSim(seed, { start: HOLLOWS_START });
      const guards = s.enemies.filter((e) => e.group === 'cistern-terrace');
      expect(guards.map((e) => e.enemyId).sort()).toEqual(['burrower', 'charger', 'charger', 'shardback', 'shardback', 'sniper']);
      champions += guards.filter((e) => e.champion).length;
    }
    expect(champions).toBeGreaterThan(3);
    expect(champions).toBeLessThan(20);
  });
});

describe("the four's champions", () => {
  it('walk, tunnel and charge 15% faster and hit 30% harder, with every telegraph, range and shield unchanged', () => {
    for (const id of FOUR) {
      const def = enemyDef(id);
      const champ = championDef(def);
      expect(champ.walkSpeed).toBeCloseTo(def.walkSpeed * CHAMPIONS.speed);
      expect(attackOf(champ)).toMatchObject({ windupTicks: attackOf(def).windupTicks, recoverTicks: attackOf(def).recoverTicks, cooldownTicks: attackOf(def).cooldownTicks });
      expect(champ.hurtbox.w).toBeCloseTo(def.hurtbox.w * CHAMPIONS.scale);
      expect(champ.shield).toEqual(def.shield);
    }
    const charger = championDef(enemyDef('charger'));
    const burrower = championDef(enemyDef('burrower'));
    const sniper = championDef(enemyDef('sniper'));
    const shardback = championDef(enemyDef('shardback'));
    if (charger.kind !== 'charger' || burrower.kind !== 'burrower' || sniper.kind !== 'sniper' || shardback.kind !== 'shardback') throw new Error('kinds');
    expect(charger.charge).toMatchObject({ speed: 360 * CHAMPIONS.speed, distance: 220, width: 24, damage: Math.round(25 * CHAMPIONS.damage) });
    expect(burrower.burrow).toMatchObject({ speed: 70 * CHAMPIONS.speed, radius: 28, lockRange: 12, damage: Math.round(22 * CHAMPIONS.damage) });
    expect(sniper.snipe).toMatchObject({ trackTicks: 60, lockTicks: 24, boltSpeed: 480, damage: Math.round(28 * CHAMPIONS.damage) });
    expect(shardback.bash).toMatchObject({ arcDegrees: 100, reach: 40, damage: Math.round(20 * CHAMPIONS.damage) });
  });

  it('a champion Charger runs its same lane faster, and its strike hits harder', () => {
    const s = arena();
    const e = createEnemy(s.nextEnemyId++, 'charger', { x: PLAYER_AT.x + 150, y: PLAYER_AT.y }, HALL);
    makeChampion(s.rng, e);
    s.enemies.push(e);
    run(s, 1);
    run(s, 45);
    const x = e.x;
    run(s, 1);
    expect(x - e.x).toBeCloseTo((360 * CHAMPIONS.speed) / 60);
    for (let t = 0; t < 40 && s.player.health === 100; t++) run(s, 1);
    expect(s.player.health).toBe(100 - Math.round(25 * CHAMPIONS.damage));
  });
});

describe("the four's drops", () => {
  it('always a ley-iron; a champion rolls its table 2–3 times and drops its armor', () => {
    for (const id of FOUR) {
      const s = arena();
      spawnDrops(s, enemyDef(id), PLAYER_AT.x, PLAYER_AT.y, HALL);
      expect(s.groundItems.filter((g) => g.itemId === 'ley-iron')).toHaveLength(1);
      const t = arena();
      spawnDrops(t, enemyDef(id), PLAYER_AT.x, PLAYER_AT.y, HALL, true);
      const iron = t.groundItems.filter((g) => g.itemId === 'ley-iron').length;
      expect(iron).toBeGreaterThanOrEqual(2);
      expect(iron).toBeLessThanOrEqual(3);
      expect(t.groundItems.filter((g) => g.itemId === UNIDENTIFIED_ARMOR)).toHaveLength(1);
    }
  });

  it('roll the aqueduct valve at about 4%', () => {
    const rng = createRng(5);
    const s = arena();
    s.rng = rng;
    let valves = 0;
    const trials = 3000;
    for (let i = 0; i < trials; i++) {
      s.groundItems = [];
      spawnDrops(s, enemyDef('charger'), PLAYER_AT.x, PLAYER_AT.y, HALL);
      valves += s.groundItems.filter((g) => g.itemId === 'aqueduct-valve').length;
    }
    expect(Math.abs(valves / trials - 0.04)).toBeLessThan(0.012);
  });
});

describe('a fight with all four', () => {
  it('is deterministic', () => {
    const go = () => {
      const s = arena();
      FOUR.forEach((id, i) => s.enemies.push(createEnemy(s.nextEnemyId++, id, { x: PLAYER_AT.x + 120 + i * 30, y: PLAYER_AT.y - 40 + i * 25 }, HALL)));
      run(s, 600, (st) => ({ moveX: st.tick % 140 < 70 ? 1 : -1, moveY: st.tick % 90 < 45 ? 1 : -1, fire: st.tick % 30 === 0, aimX: PLAYER_AT.x + 150, aimY: PLAYER_AT.y }));
      return JSON.stringify(summarize(s));
    };
    expect(go()).toBe(go());
  });
});
