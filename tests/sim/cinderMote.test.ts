import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { MoteDef } from '../../src/data/emberworksEnemies';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, movePlayer, PLAYER_AT, run, runUntil } from './fight';
import { still } from './fireKit';

// The cinder mote (061): it drifts at the player, swells with their feet in reach, then bursts (a roll dodges it),
// leaving a fire pool that hurts only the player; it's gone with no drop or XP. Killed, it bursts on the other enemies
// round it instead, setting them burning, never hurting the player and leaving no pool.

const DEF = enemyDef('cinder-mote') as MoteDef;
const { swell, pool, deathBurst } = DEF;

function placeMote(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'cinder-mote', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

/** Runs from a mote's swell starting until it's gone (its burst), returning the ticks taken. */
const untilGone = (s: SimState, e: EnemyState, c = {}) => runUntil(s, () => !s.enemies.includes(e), swell.windupTicks + 5, c);

describe('the cinder mote', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'mote', boss: false, maxHealth: 20, walkSpeed: 60, xp: 6 });
    expect(swell).toMatchObject({ triggerRange: 40, radius: 40, windupTicks: 45, damage: 18, knockback: 32 });
    expect(pool).toEqual({ radius: 32, ticks: 180, damage: 8, everyTicks: 60 });
    expect(deathBurst).toEqual({ radius: 48, damage: 10 });
  });

  it('drifts at the player out of reach, and stops and swells once their feet are within its trigger', () => {
    const s = arena();
    const e = placeMote(s, 120);
    run(s, 10);
    expect(e.mode).toBe('chase');
    expect(e.x).toBeCloseTo(PLAYER_AT.x + 120 - 10 * (DEF.walkSpeed / 60));
    runUntil(s, () => e.mode === 'windup', 120);
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeLessThanOrEqual(swell.triggerRange);
    const at = { x: e.x, y: e.y };
    run(s, 10, { moveY: 1 });
    expect({ x: e.x, y: e.y }).toEqual(at);
    expect(summarize(s).enemies[0]?.swell).toEqual({ radius: swell.radius, ticks: 11 });
  });

  it('bursts after its wind-up on a player inside, knocking them out from it, and leaves its pool where it stood', () => {
    const s = arena();
    const e = placeMote(s, 30);
    run(s, 1);
    expect(e.mode).toBe('windup');
    const ticks = untilGone(s, e);
    expect(ticks).toBe(swell.windupTicks);
    expect(s.player.health).toBe(100 - swell.damage);
    expect(s.player.knockX).toBeLessThan(0);
    expect(s.events.moteBursts).toEqual([{ id: e.id, x: e.x, y: e.y, radius: swell.radius }]);
    expect(s.floodPools).toEqual([expect.objectContaining({ shape: 'circle', x0: e.x, y0: e.y, r: pool.radius, damage: pool.damage, everyTicks: pool.everyTicks })]);
  });

  it('misses a player who walked out of its radius, and a roll through the burst dodges it', () => {
    const out = arena();
    const a = placeMote(out, 30);
    run(out, 1);
    movePlayer(out, PLAYER_AT.x - swell.radius + 29, PLAYER_AT.y);
    untilGone(out, a);
    expect(out.player.health).toBe(100);

    const roll = arena();
    const b = placeMote(roll, 30);
    run(roll, swell.windupTicks - 4);
    run(roll, 1, { dodge: true, moveY: 1 });
    untilGone(roll, b);
    expect(roll.player.health).toBe(100);
  });

  it("drops nothing and gives no XP once burst on its own, and isn't recorded as a death", () => {
    const s = arena();
    const e = placeMote(s, 30);
    const xp = s.xp;
    run(s, 1);
    untilGone(s, e);
    expect(s.groundItems).toEqual([]);
    expect(s.xp).toBe(xp);
    expect(s.events.deaths).toEqual([]);
  });

  it('its pool beats once a second on the player standing in it, and never hurts an enemy', () => {
    const s = arena();
    const husk = still(s, PLAYER_AT.x + 30, PLAYER_AT.y + 10, 40);
    const e = placeMote(s, 30);
    run(s, 1);
    untilGone(s, e);
    // The burst landed (18) and knocked the player out; back on the pool's middle, it beats at 60 and 120 ticks.
    run(s, 10);
    movePlayer(s, e.x, e.y);
    run(s, pool.ticks);
    expect(s.player.health).toBe(100 - swell.damage - 2 * pool.damage);
    expect(husk.health).toBe(40);
    expect(s.floodPools).toEqual([]);
  });
});

describe("a killed mote's death burst", () => {
  it('sets every other enemy within its radius burning with its Fire, and misses those beyond', () => {
    const s = arena();
    const e = placeMote(s, 200);
    const near = still(s, e.x + deathBurst.radius - 4, e.y, 400);
    const far = still(s, e.x, e.y + deathBurst.radius + 2, 400);
    damageEnemy(s, e, 1000, 1, 0);
    run(s, 1);
    expect(s.enemies.includes(e)).toBe(false);
    expect(near.health).toBe(400 - deathBurst.damage);
    expect(near.burnTicks).toBeGreaterThan(0);
    expect(far.health).toBe(400);
    expect(far.burnTicks).toBe(0);
    expect(s.events.deathBursts).toEqual([{ id: e.id, x: e.x, y: e.y, radius: deathBurst.radius, hit: [near.id] }]);
  });

  it('never hurts the player, leaves no pool, and drops as a kill does', () => {
    const s = arena();
    const e = placeMote(s, 20);
    damageEnemy(s, e, 1000, 1, 0);
    run(s, 1);
    expect(s.player.health).toBe(100);
    expect(s.floodPools).toEqual([]);
    expect(s.events.deaths.map((d) => d.enemyId)).toEqual(['cinder-mote']);
    expect(s.groundItems.map((g) => g.itemId)).toContain('cinderite');
  });

  it('skips a plated Forgewright and a Burrower underground', () => {
    const s = arena();
    const e = placeMote(s, 200);
    const forge = createEnemy(s.nextEnemyId++, 'forgewright', { x: e.x + 20, y: e.y }, HALL);
    const burrower = createEnemy(s.nextEnemyId++, 'burrower', { x: e.x - 20, y: e.y }, HALL);
    burrower.underground = true;
    s.enemies.push(forge, burrower);
    const healths = [forge.health, burrower.health];
    damageEnemy(s, e, 1000, 1, 0);
    run(s, 1);
    expect([forge.health, burrower.health]).toEqual(healths);
    expect([forge.burnTicks, burrower.burnTicks]).toEqual([0, 0]);
  });

  it('chains: a mote its burst kills bursts in turn, the same tick', () => {
    const s = arena();
    const a = placeMote(s, 200);
    const b = placeMote(s, 240);
    b.health = 1;
    const husk = still(s, b.x + 40, b.y, 400);
    damageEnemy(s, a, 1000, 1, 0);
    run(s, 1);
    expect(s.enemies.includes(b)).toBe(false);
    expect(husk.health).toBe(400 - deathBurst.damage);
  });
});
