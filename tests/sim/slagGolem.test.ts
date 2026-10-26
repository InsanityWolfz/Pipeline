import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { GolemDef } from '../../src/data/emberworksEnemies';
import type { MeleeDef } from '../../src/data/enemies';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { makeChampion } from '../../src/sim/champions';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The slag golem (061): it walks slowly at the player and slams a red circle ahead of it, locked at the wind-up's
// start. Dying, it splits into two slag whelps, one each side, in its pack. A whelp bites a short arc, drops nothing,
// gives 1 XP and never splits.

const GOLEM = enemyDef('slag-golem') as GolemDef;
const WHELP = enemyDef('slag-whelp') as MeleeDef;
const { slam, split } = GOLEM;

function place(s: SimState, id: string, dx: number, dy = 0, group = 'pack'): EnemyState {
  const e = createEnemy(s.nextEnemyId++, id, { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, group);
  s.enemies.push(e);
  return e;
}

const whelpsOf = (s: SimState) => s.enemies.filter((e) => e.enemyId === 'slag-whelp');

describe('the slag golem', () => {
  it("has the spec's starting values", () => {
    expect(GOLEM).toMatchObject({ kind: 'golem', boss: false, maxHealth: 120, walkSpeed: 30, xp: 6 });
    expect(slam).toMatchObject({ triggerRange: 48, radius: 40, ahead: 32, windupTicks: 54, recoverTicks: 48, cooldownTicks: 150, damage: 30, knockback: 40 });
    expect(split).toMatchObject({ into: 'slag-whelp', count: 2 });
  });

  it('walks slowly at a player out of reach, and winds up its slam once their feet are within its trigger', () => {
    const s = arena();
    const e = place(s, 'slag-golem', 120);
    run(s, 10);
    expect(e.mode).toBe('chase');
    expect(e.x).toBeCloseTo(PLAYER_AT.x + 120 - 10 * (GOLEM.walkSpeed / 60));
    const near = arena();
    const g = place(near, 'slag-golem', slam.triggerRange - 4);
    run(near, 1);
    expect(g.mode).toBe('windup');
  });

  it('locks its circle ahead of it at the wind-up start, and slams a player inside it after the wind-up', () => {
    const s = arena();
    const e = place(s, 'slag-golem', 30);
    run(s, 1);
    const circle = { x: e.x - slam.ahead, y: e.y, radius: slam.radius };
    expect(summarize(s).enemies[0]?.slam).toEqual(circle);
    run(s, 10, { moveY: 1 });
    expect(summarize(s).enemies[0]?.slam).toEqual(circle);
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual({ x: -1, y: 0 });
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y);
    runUntil(s, () => e.mode === 'swipe', slam.windupTicks);
    expect(s.player.health).toBe(100 - slam.damage);
    expect(s.events.golemSlams).toEqual([{ id: e.id, ...circle }]);
    runUntil(s, () => e.mode === 'chase', slam.swipeTicks + slam.recoverTicks + 2);
  });

  it('misses a player who stepped out of the circle', () => {
    const s = arena();
    const e = place(s, 'slag-golem', 30);
    run(s, 1);
    // Behind it, well clear of the circle ahead.
    movePlayer(s, e.x + 40, e.y);
    runUntil(s, () => e.mode === 'recover', slam.windupTicks + slam.swipeTicks + 2);
    expect(s.player.health).toBe(100);
  });
});

describe("the golem's split", () => {
  it('raises two whelps where it fell, one each side, in its pack and ring, awake', () => {
    const s = arena();
    const e = place(s, 'slag-golem', 200);
    damageEnemy(s, e, 10_000, 1, 0);
    run(s, 1);
    const whelps = whelpsOf(s);
    expect(whelps).toHaveLength(split.count);
    expect(whelps.map((w) => w.group)).toEqual(['pack', 'pack']);
    expect(whelps.map((w) => w.ring)).toEqual([e.ring, e.ring]);
    expect(whelps.every((w) => w.mode === 'chase' && w.champion === null && w.health === WHELP.maxHealth)).toBe(true);
    const [a, b] = whelps;
    // Either side of where it fell, square to its facing, `apart` px out.
    expect(Math.hypot((a?.x ?? 0) - e.x, (a?.y ?? 0) - e.y)).toBeCloseTo(split.apart);
    expect(((a?.x ?? 0) + (b?.x ?? 0)) / 2).toBeCloseTo(e.x);
    expect(((a?.y ?? 0) + (b?.y ?? 0)) / 2).toBeCloseTo(e.y);
    expect(s.events.golemSplits).toEqual([{ id: e.id, x: e.x, y: e.y, whelps: whelps.map((w) => w.id) }]);
    // The golem drops as any kill does.
    expect(s.groundItems.map((g) => g.itemId)).toContain('cinderite');
  });

  it("a champion golem's whelps are plain whelps", () => {
    const s = arena();
    const e = place(s, 'slag-golem', 200);
    makeChampion(s.rng, e);
    damageEnemy(s, e, 100_000, 1, 0);
    run(s, 1);
    expect(whelpsOf(s).map((w) => w.champion)).toEqual([null, null]);
  });
});

describe('the slag whelp', () => {
  it("has the spec's starting values: small and quick", () => {
    expect(WHELP).toMatchObject({ kind: 'melee', boss: false, maxHealth: 15, walkSpeed: 70, xp: 1, noLoot: true });
    expect(WHELP.swipe).toMatchObject({ triggerRange: 20, arcDegrees: 90, reach: 24, windupTicks: 30, recoverTicks: 20, cooldownTicks: 60, damage: 10, knockback: 12 });
  });

  it('bites a player in its arc after its wind-up, and misses one who stepped out of it', () => {
    const s = arena();
    const w = place(s, 'slag-whelp', 16);
    run(s, 1);
    expect(w.mode).toBe('windup');
    runUntil(s, () => w.mode === 'swipe', WHELP.swipe.windupTicks + 1);
    expect(s.player.health).toBe(100 - WHELP.swipe.damage);

    const miss = arena();
    const m = place(miss, 'slag-whelp', 16);
    run(miss, 1);
    movePlayer(miss, m.x + 20, m.y);
    runUntil(miss, () => m.mode === 'swipe', WHELP.swipe.windupTicks + 1);
    expect(miss.player.health).toBe(100);
  });

  it('drops nothing at all (no schematic or gear roll either), gives 1 XP, and never splits', () => {
    const s = arena();
    for (let i = 0; i < 200; i++) {
      const w = place(s, 'slag-whelp', 300, 0);
      damageEnemy(s, w, 1000, 1, 0);
      run(s, 1);
      expect(s.events.xp.map((x) => x.source)).toEqual(['kill']);
      expect(s.events.golemSplits).toEqual([]);
    }
    expect(s.groundItems).toEqual([]);
    expect(whelpsOf(s)).toEqual([]);
  });

  it('gives exactly its 1 XP times its ring', () => {
    const s = arena();
    const w = place(s, 'slag-whelp', 300, 0);
    const xp = s.xp;
    damageEnemy(s, w, 1000, 1, 0);
    run(s, 1);
    expect(s.events.xp).toEqual([{ amount: WHELP.xp, source: 'kill' }]);
    expect(s.xp).toBe(xp + WHELP.xp);
  });
});

describe('a pack with a golem', () => {
  it("isn't wiped while its whelps live", () => {
    const s = arena();
    s.populated = true;
    const slot = s.population.slots.find((p) => p.ring === 1);
    if (!slot) throw new Error('no ring 1 slot');
    // Every other slot waits, so only this pack is in play.
    for (const o of s.population.slots) o.respawnAt = 1e9;
    const g = place(s, 'slag-golem', 300, 0, slot.group);
    run(s, 1);
    expect(slot.alive).toBe(true);
    damageEnemy(s, g, 10_000, 1, 0);
    run(s, 2);
    expect(whelpsOf(s).every((w) => w.group === slot.group)).toBe(true);
    expect(slot.alive).toBe(true);
    for (const w of whelpsOf(s)) damageEnemy(s, w, 1000, 1, 0);
    run(s, 2);
    expect(slot.alive).toBe(false);
  });
});
