import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import type { ChargerDef } from '../../src/data/hollowsEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, HALL, HUSK, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The Charger (035): shows its lane, then rams down it. A sidestep in the wind-up dodges;
// it strikes once per charge, stops at the lane's end, is stunned by a wall, and passes
// through other enemies.

const DEF = enemyDef('charger') as ChargerDef;
const { charge } = DEF;
const STEP = charge.speed / TICK_RATE;

function placeCharger(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'charger', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

/** The meadow (open ground east of the field) with a Charger `dx` px east of the player. */
function meadow(dx = 150): { s: SimState; e: EnemyState } {
  const s = arena();
  return { s, e: placeCharger(s, PLAYER_AT.x + dx, PLAYER_AT.y) };
}

/** A rock cluster in the meadow's south (tiles 69–71 on row 33, 68–72 on 34, open below at (70, 35)): the Charger north of it at (70, 26). */
const ROCKS = { charger: tileCentre({ tx: 70, ty: 26 }), behind: tileCentre({ tx: 70, ty: 37 }), before: tileCentre({ tx: 70, ty: 31 }) };

describe('the Charger', () => {
  it("has the spec's starting values in data, its wind-up past the telegraph minimum", () => {
    expect(DEF).toMatchObject({ kind: 'charger', boss: false, maxHealth: 50, walkSpeed: 45 });
    expect(charge).toMatchObject({ triggerRange: 200, distance: 220, width: 24, speed: 360, windupTicks: 45, recoverTicks: 45, cooldownTicks: 180, damage: 25, knockback: 48, stunTicks: 60 });
    expect(charge.windupTicks).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('winds up only with the player in range along a clear line', () => {
    const s = arena();
    const e = placeCharger(s, ROCKS.before.x, ROCKS.before.y - 32);
    // The rocks stand between them, 5 tiles apart: it walks, never winding up.
    movePlayer(s, ROCKS.behind.x, ROCKS.behind.y - 2 * 32);
    run(s, 20);
    expect(e.mode).toBe('chase');
    // In the open, in range: it plants at once.
    const m = meadow(charge.triggerRange - 10);
    run(m.s, 1);
    expect(m.e.mode).toBe('windup');
    const far = meadow(charge.triggerRange + 40);
    run(far.s, 1);
    expect(far.e.mode).toBe('chase');
  });

  it('locks its lane at the wind-up start from where it stands, and holds it however the player moves', () => {
    const { s, e } = meadow();
    run(s, 1);
    expect(e.mode).toBe('windup');
    const start = { x: e.x, y: e.y };
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual({ x: -1, y: 0 });
    run(s, 20, { moveY: 1 });
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual({ x: -1, y: 0 });
    expect({ x: e.x, y: e.y }).toEqual(start);
    expect(summarize(s).enemies[0]?.lane).toEqual({ x: start.x, y: start.y, dx: -1, dy: 0, length: charge.distance, width: charge.width, run: 0 });
  });

  it('charges after `windupTicks`, down the whole lane at its speed, then holds still `recoverTicks`', () => {
    const { s, e } = meadow();
    run(s, 1);
    const start = e.x;
    // Out of the lane: the player steps aside for good.
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 3 * 32);
    run(s, charge.windupTicks - 1);
    expect(e.mode).toBe('windup');
    run(s, 1);
    expect(e.mode).toBe('swipe');
    expect(s.events.charges).toEqual([{ id: e.id, x: start, y: e.y, dx: -1, dy: 0, length: charge.distance }]);
    run(s, 1);
    expect(start - e.x).toBeCloseTo(2 * STEP);
    runUntil(s, () => e.mode === 'recover', 60);
    expect(start - e.x).toBeCloseTo(charge.distance);
    run(s, charge.recoverTicks - 1);
    expect(e.mode).toBe('recover');
    expect(start - e.x).toBeCloseTo(charge.distance);
    run(s, 1);
    expect(e.mode).toBe('chase');
  });

  it('a sidestep during the wind-up dodges the charge', () => {
    const { s, e } = meadow();
    run(s, 1);
    run(s, 25, { moveY: 1 });
    runUntil(s, () => e.mode === 'recover', 120);
    expect(s.player.health).toBe(100);
  });

  it('strikes a player still in the lane once per charge, knocking them along it', () => {
    const { s, e } = meadow();
    run(s, 1);
    runUntil(s, () => s.player.health < 100, 120);
    expect(s.player.health).toBe(100 - charge.damage);
    expect(s.player.knockX).toBeLessThan(0);
    expect(s.player.knockY).toBe(0);
    expect(e.struck).toBe(true);
    // Hit invulnerability gone, the player back in its path: no second hit this charge.
    for (let t = 0; t < 40 && e.mode === 'swipe'; t++) {
      s.player.hurtTicks = 0;
      movePlayer(s, e.x - 10, e.y);
      run(s, 1);
    }
    expect(s.player.health).toBe(100 - charge.damage);
  });

  it("a roll's i-frames let it pass through", () => {
    const { s, e } = meadow(120);
    run(s, 1);
    runUntil(s, () => e.mode === 'swipe', 60);
    // Rolls as it closes, away along the lane's line so the i-frames cover the pass.
    runUntil(s, () => Math.abs(e.x - s.player.x) < 40, 30);
    run(s, 1, { dodge: true, moveY: 1 });
    runUntil(s, () => e.mode === 'recover', 60);
    expect(s.player.health).toBe(100);
  });

  it('a wall before the lane ends stuns it `stunTicks`, with no damage to it', () => {
    const s = arena();
    const e = placeCharger(s, ROCKS.charger.x, ROCKS.charger.y);
    movePlayer(s, ROCKS.before.x, ROCKS.before.y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    // The player steps off the lane; it runs on into the rocks.
    movePlayer(s, ROCKS.before.x + 3 * 32, ROCKS.before.y);
    runUntil(s, () => e.mode === 'stun', charge.windupTicks + 60);
    expect(e.y - ROCKS.charger.y).toBeLessThan(charge.distance);
    expect(e.health).toBe(DEF.maxHealth);
    run(s, charge.stunTicks - 1);
    expect(e.mode).toBe('stun');
    run(s, 1);
    expect(e.mode).not.toBe('stun');
  });

  it('passes through other enemies without hurting them', () => {
    const { s, e } = meadow();
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 60, y: PLAYER_AT.y }, HALL);
    husk.frozen = 10_000;
    s.enemies.push(husk);
    run(s, 1);
    const start = e.x;
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 3 * 32);
    runUntil(s, () => e.mode === 'recover', 120);
    expect(start - e.x).toBeCloseTo(charge.distance);
    expect(husk.health).toBe(HUSK.maxHealth);
    expect(husk.x).toBe(PLAYER_AT.x + 60);
  });

  it('is deterministic', () => {
    const go = () => {
      const { s } = meadow();
      run(s, 300, (st) => ({ moveY: st.tick % 90 < 30 ? 1 : st.tick % 90 < 60 ? -1 : 0 }));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
  });
});
