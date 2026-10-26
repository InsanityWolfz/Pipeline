import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef } from '../../src/data/enemies';
import { ROLL_DISTANCE, ROLL_TICKS, WALK_SPEED } from '../../src/data/player';
import type { RamDef } from '../../src/data/stormcrownEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { slowPlayer } from '../../src/sim/slow';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, die, HALL, PLAYER_AT, run, runUntil } from './fight';

// The gale ram (065): it walks at the player; within its gust's range it winds up a red cone, locked at the wind-up's
// start, then gusts: a player inside takes its damage, is pushed back and slowed (walk and roll speed, never stopping a
// roll); one outside or rolling isn't. The slow is a status getState() shows, and a KO clears it.

const DEF = enemyDef('gale-ram') as RamDef;
const { gust } = DEF;

function placeRam(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'gale-ram', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

describe('the gale ram', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'ram', boss: false, maxHealth: 140, walkSpeed: 35, xp: 8 });
    expect(gust).toMatchObject({ range: 80, arcDegrees: 70, reach: 96, windupTicks: 54, recoverTicks: 48, cooldownTicks: 180, damage: 20, push: 120, slow: 0.4, slowTicks: 120 });
  });

  it('walks at the player and winds up its cone within range, locked at the wind-up’s start', () => {
    const s = arena();
    const e = placeRam(s, 150);
    run(s, 10);
    expect(e.x).toBeCloseTo(PLAYER_AT.x + 150 - 10 * (DEF.walkSpeed / TICK_RATE));
    runUntil(s, () => e.mode === 'windup', 200);
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeLessThanOrEqual(gust.range);
    const cone = summarize(s).enemies[0]?.cone;
    expect(cone).toMatchObject({ dx: -1, dy: 0, reach: gust.reach, degrees: gust.arcDegrees });
    run(s, 10, { moveY: 1 });
    expect(summarize(s).enemies[0]?.cone).toEqual(cone);
  });

  it('gusts a player inside: damage, pushed back, and slowed for its ticks', () => {
    const s = arena();
    const e = placeRam(s, 70);
    runUntil(s, () => e.mode === 'windup', 5);
    runUntil(s, (x) => x.events.gusts.length > 0, gust.windupTicks + 2);
    expect(s.player.health).toBe(100 - gust.damage);
    expect(s.player.knockX * gust.pushTicks).toBeCloseTo(-gust.push);
    expect(summarize(s).player.slow).toEqual({ share: gust.slow, ticks: gust.slowTicks });
    const x0 = s.player.x;
    run(s, gust.pushTicks);
    expect(x0 - s.player.x).toBeGreaterThan(gust.push - 5);
  });

  it('misses a player outside the cone and one rolling through the gust, slowing neither', () => {
    const s = arena();
    const e = placeRam(s, 70);
    runUntil(s, () => e.mode === 'windup', 5);
    run(s, 40, { moveY: 1 });
    runUntil(s, (x) => x.events.gusts.length > 0, gust.windupTicks, { moveY: 1 });
    expect(s.player.health).toBe(100);
    expect(s.player.slowTicks).toBe(0);
    const r = arena();
    const m = placeRam(r, 70);
    runUntil(r, () => m.mode === 'windup', 5);
    run(r, gust.windupTicks - 6);
    runUntil(r, (x) => x.events.gusts.length > 0, 10, { dodge: true, moveX: -1 });
    expect(r.player.health).toBe(100);
    expect(r.player.slowTicks).toBe(0);
  });
});

describe('the slow', () => {
  it('takes its share of walk speed for its ticks, then lets go', () => {
    const s = arena();
    run(s, 30, { moveX: 1 });
    expect(s.player.vx).toBeCloseTo(WALK_SPEED / TICK_RATE);
    slowPlayer(s.player, 0.4, 120);
    run(s, 30, { moveX: 1 });
    expect(s.player.vx).toBeCloseTo((WALK_SPEED / TICK_RATE) * 0.6);
    run(s, 90, { moveX: 1 });
    expect(s.player.slowTicks).toBe(0);
    expect(summarize(s).player.slow).toBeNull();
    run(s, 30, { moveX: 1 });
    expect(s.player.vx).toBeCloseTo(WALK_SPEED / TICK_RATE);
  });

  it('shortens a roll’s carry but never its time (a roll is never stopped)', () => {
    const roll = (slowed: boolean) => {
      const s = arena();
      if (slowed) slowPlayer(s.player, 0.4, 600);
      const x0 = s.player.x;
      run(s, 1, { dodge: true, moveX: 1 });
      let ticks = 1;
      while (s.player.rollTick > 0 && ticks < 100) {
        run(s, 1, { moveX: 1 });
        ticks += 1;
      }
      return { ticks, carry: s.player.x - x0 };
    };
    const plain = roll(false);
    const slow = roll(true);
    expect(slow.ticks).toBe(plain.ticks);
    expect(plain.ticks).toBeGreaterThanOrEqual(ROLL_TICKS);
    expect(plain.carry).toBeGreaterThan(ROLL_DISTANCE * 0.9);
    expect(slow.carry).toBeLessThan(plain.carry * 0.7);
    expect(slow.carry).toBeGreaterThan(plain.carry * 0.5);
  });

  it('keeps the stronger share and the longer time when slowed again', () => {
    const s = arena();
    slowPlayer(s.player, 0.4, 120);
    slowPlayer(s.player, 0.2, 200);
    expect({ slow: s.player.slow, ticks: s.player.slowTicks }).toEqual({ slow: 0.4, ticks: 200 });
  });

  it('is cleared by a KO', () => {
    const s = arena();
    slowPlayer(s.player, 0.4, 10_000);
    die(s);
    expect(s.player.slowTicks).toBe(0);
    expect(s.player.slow).toBe(0);
  });
});
