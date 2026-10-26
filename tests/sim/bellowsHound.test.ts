import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef } from '../../src/data/enemies';
import type { HoundDef } from '../../src/data/emberworksEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, HUSK, homeTile, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The bellows hound (061): it walks like the Charger and shows its lane the same way, locked at the wind-up's start,
// then dashes down it, striking once, passing through enemies. It stops at the lane's end or at a wall with no stun,
// and its dash leaves a burning trail along the ground it covered that hurts only the player.

const DEF = enemyDef('bellows-hound') as HoundDef;
const { dash, trail } = DEF;
const STEP = dash.speed / TICK_RATE;

function placeHound(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'bellows-hound', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

/** The meadow with a hound `dx` px east of the player. */
function meadow(dx = 150): { s: SimState; e: EnemyState } {
  const s = arena();
  return { s, e: placeHound(s, PLAYER_AT.x + dx, PLAYER_AT.y) };
}

/** The Charger's rock cluster in the meadow's south (charger.test.ts): the hound north of it runs into it. */
const ROCKS = { hound: homeTile(70, 27), before: homeTile(70, 31) };

const trailOf = (s: SimState, e: EnemyState) => s.floodPools.find((p) => p.ownerId === e.id);

describe('the bellows hound', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'hound', boss: false, maxHealth: 45, walkSpeed: 60, xp: 6 });
    expect(dash).toMatchObject({ triggerRange: 220, distance: 200, width: 24, speed: 420, windupTicks: 45, recoverTicks: 40, cooldownTicks: 180, damage: 22, knockback: 32 });
    expect(trail).toEqual({ width: 24, ticks: 180, damage: 8, everyTicks: 60 });
  });

  it('winds up only in range, its lane locked at the start from where it stands however the player moves', () => {
    const far = meadow(dash.triggerRange + 40);
    run(far.s, 1);
    expect(far.e.mode).toBe('chase');
    const { s, e } = meadow();
    run(s, 1);
    expect(e.mode).toBe('windup');
    const start = { x: e.x, y: e.y };
    run(s, 20, { moveY: 1 });
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual({ x: -1, y: 0 });
    expect({ x: e.x, y: e.y }).toEqual(start);
    expect(summarize(s).enemies[0]?.lane).toEqual({ x: start.x, y: start.y, dx: -1, dy: 0, length: dash.distance, width: dash.width, run: 0 });
  });

  it('dashes the whole lane at its speed after `windupTicks`, then recovers `recoverTicks`', () => {
    const { s, e } = meadow();
    run(s, 1);
    const start = e.x;
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 3 * 32);
    run(s, dash.windupTicks);
    expect(e.mode).toBe('swipe');
    expect(s.events.dashes).toEqual([{ id: e.id, x: start, y: e.y, dx: -1, dy: 0, length: dash.distance }]);
    run(s, 1);
    expect(start - e.x).toBeCloseTo(2 * STEP);
    runUntil(s, () => e.mode === 'recover', 60);
    expect(start - e.x).toBeCloseTo(dash.distance);
    run(s, dash.recoverTicks - 1);
    expect(e.mode).toBe('recover');
    run(s, 1);
    expect(e.mode).toBe('chase');
  });

  it('a sidestep in the wind-up dodges it; one standing in the lane is struck once, knocked along it', () => {
    const side = meadow();
    run(side.s, 1);
    run(side.s, 25, { moveY: 1 });
    runUntil(side.s, () => side.e.mode === 'recover', 120);
    expect(side.s.player.health).toBe(100);

    const { s, e } = meadow();
    run(s, 1);
    runUntil(s, () => s.player.health < 100, 120);
    expect(s.player.health).toBe(100 - dash.damage);
    expect(s.player.knockX).toBeLessThan(0);
    for (let t = 0; t < 40 && e.mode === 'swipe'; t++) {
      s.player.hurtTicks = 0;
      movePlayer(s, e.x - 10, e.y);
      run(s, 1);
    }
    // Off the lane's trail now: only the dash's one strike landed.
    expect(s.player.health).toBe(100 - dash.damage);
  });

  it('stops at a wall with no stun, then recovers', () => {
    const s = arena();
    const e = placeHound(s, ROCKS.hound.x, ROCKS.hound.y);
    movePlayer(s, ROCKS.before.x, ROCKS.before.y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    movePlayer(s, ROCKS.before.x + 3 * 32, ROCKS.before.y);
    runUntil(s, () => e.mode === 'recover', dash.windupTicks + 60);
    expect(e.y - ROCKS.hound.y).toBeLessThan(dash.distance);
    expect(e.stunned).toBe(0);
    expect(s.events.stuns).toEqual([]);
    expect(e.health).toBe(DEF.maxHealth);
    run(s, dash.recoverTicks);
    expect(e.mode).toBe('chase');
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
    expect(start - e.x).toBeCloseTo(dash.distance);
    expect(husk.health).toBe(HUSK.maxHealth);
  });
});

describe("the hound's trail", () => {
  it('runs along the ground the dash covered, its width wide, and dries after its ticks', () => {
    const { s, e } = meadow();
    run(s, 1);
    const start = { x: e.x, y: e.y };
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 3 * 32);
    run(s, dash.windupTicks);
    expect(trailOf(s, e)).toMatchObject({ shape: 'capsule', x0: start.x, y0: start.y, r: trail.width / 2, damage: trail.damage, everyTicks: trail.everyTicks });
    run(s, 5);
    // It follows its feet as they set out each tick (a step behind where the tick's move takes them).
    expect(Math.abs((trailOf(s, e)?.x1 ?? 0) - e.x)).toBeLessThanOrEqual(STEP + 1e-6);
    runUntil(s, () => e.mode === 'recover', 60);
    expect(trailOf(s, e)).toMatchObject({ x0: start.x, x1: e.x, y1: e.y });
    expect(start.x - (trailOf(s, e)?.x1 ?? 0)).toBeCloseTo(dash.distance);
    // From its start: it dries `ticks` after the dash set off.
    const left = trailOf(s, e)?.ticks ?? 0;
    run(s, left - 1);
    expect(trailOf(s, e)).toBeDefined();
    run(s, 1);
    expect(trailOf(s, e)).toBeUndefined();
  });

  it('beats once a second on a player standing in it, and never hurts an enemy', () => {
    const { s, e } = meadow();
    const husk = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 100, y: PLAYER_AT.y + 4 }, HALL);
    husk.frozen = 10_000;
    s.enemies.push(husk);
    run(s, 1);
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y + 3 * 32);
    runUntil(s, () => e.mode === 'recover', 120);
    // Held there, so it doesn't come round for another dash.
    e.frozen = 10_000;
    const pool = trailOf(s, e);
    // Onto the trail's middle, between its beats: the next two land a second apart.
    movePlayer(s, PLAYER_AT.x + 80, PLAYER_AT.y);
    const health = s.player.health;
    const age = pool?.age ?? 0;
    // The pool beats when its age (this tick's, before it ages) is a whole second.
    const next = trail.everyTicks - (age % trail.everyTicks) + 1;
    run(s, next + trail.everyTicks);
    expect(s.player.health).toBe(health - 2 * trail.damage);
    expect(husk.health).toBe(HUSK.maxHealth);
  });
});
