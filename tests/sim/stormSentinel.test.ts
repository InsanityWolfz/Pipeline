import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { SentinelDef } from '../../src/data/stormcrownEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { TILE_SIZE } from '../../src/data/config';
import { blocksShot, isSolid } from '../../src/sim/collision';
import { clearShot } from '../../src/sim/sightLine';
import { roomById } from '../../src/sim/state';
import { arena, HALL, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The storm sentinel (065): it keeps between 200 and 300 px from the player (061's keep-distance); every cooldown,
// with a clear line to them in range, it calls a red strike circle down on their feet that lands after its wind-up
// for its damage with knockback (a step out misses, a roll's i-frames let it pass). Never more than one of its
// circles waits at once.

const DEF = enemyDef('storm-sentinel') as SentinelDef;
const { strike, keep } = DEF;

function placeSentinel(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'storm-sentinel', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

const dist = (s: SimState, e: EnemyState) => Math.hypot(e.x - s.player.x, e.y - s.player.y);

describe('the storm sentinel', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'sentinel', boss: false, maxHealth: 60, walkSpeed: 20, xp: 8, keep: { min: 200, max: 300 } });
    expect(strike).toMatchObject({ range: 300, radius: 36, windupTicks: 60, recoverTicks: 30, cooldownTicks: 120, damage: 30, knockback: 24 });
  });

  it('backs off a player closer than its band and closes on one farther, holding inside it', () => {
    const s = arena();
    const near = placeSentinel(s, 120);
    near.cooldown = 100_000;
    run(s, 60);
    expect(dist(s, near)).toBeCloseTo(120 + 60 * (DEF.walkSpeed / 60), 0);
    const t = arena();
    const far = placeSentinel(t, 0, -170);
    far.cooldown = 100_000;
    far.x = PLAYER_AT.x + 310;
    far.y = PLAYER_AT.y;
    run(t, 2);
    const before = dist(t, far);
    run(t, 60);
    expect(dist(t, far)).toBeLessThan(before);
    const u = arena();
    const mid = placeSentinel(u, 250);
    mid.cooldown = 100_000;
    run(u, 30);
    expect(mid.x).toBe(PLAYER_AT.x + 250);
    expect(keep.min).toBe(200);
  });

  it('calls a circle on the player’s feet that strikes after its wind-up for its damage with knockback', () => {
    const s = arena();
    const e = placeSentinel(s, 250);
    run(s, 1);
    expect(e.mode).toBe('windup');
    expect(s.strikes).toEqual([expect.objectContaining({ ownerId: e.id, x: PLAYER_AT.x, y: PLAYER_AT.y, r: strike.radius, damage: strike.damage, knockback: strike.knockback, delayTicks: strike.windupTicks })]);
    const ticks = runUntil(s, (x) => x.events.strikes.length > 0, strike.windupTicks + 2);
    expect(ticks).toBe(strike.windupTicks - 1);
    expect(s.player.health).toBe(100 - strike.damage);
    expect(s.strikes).toEqual([]);
  });

  it('misses a player who steps out of the circle, and one rolling as it lands', () => {
    const s = arena();
    placeSentinel(s, 250);
    run(s, 1);
    runUntil(s, (x) => x.events.strikes.length > 0, strike.windupTicks + 2, { moveY: 1 });
    expect(s.player.health).toBe(100);
    const r = arena();
    placeSentinel(r, 250);
    run(r, strike.windupTicks - 6);
    runUntil(r, (x) => x.events.strikes.length > 0, 10, { dodge: true });
    expect(r.player.health).toBe(100);
  });

  it('knocks a player hit off centre out from the circle’s centre', () => {
    const s = arena();
    placeSentinel(s, 250);
    run(s, 1);
    s.player.x += 20;
    runUntil(s, (x) => x.events.strikes.length > 0, strike.windupTicks + 2);
    expect(s.player.health).toBe(100 - strike.damage);
    expect(s.player.knockX).toBeGreaterThan(0);
  });

  it('never calls without a clear line or past its range, and never has two circles waiting', () => {
    const s = arena();
    const e = placeSentinel(s, 250);
    e.cooldown = 0;
    run(s, 1);
    expect(s.strikes).toHaveLength(1);
    // Its cooldown is up before the circle lands (made so here): it still waits for it.
    e.mode = 'chase';
    e.cooldown = 0;
    run(s, 5);
    expect(s.strikes.filter((k) => k.ownerId === e.id)).toHaveLength(1);
    const far = arena();
    placeSentinel(far, strike.range + 30);
    run(far, 1);
    expect(far.strikes).toEqual([]);
  });

  it('never calls through something that blocks shots', () => {
    const s = arena();
    const room = roomById(HALL);
    // A shot-blocking tile with open ground 3 tiles either side of it, near the meadow.
    const ptx = Math.floor(PLAYER_AT.x / TILE_SIZE);
    const pty = Math.floor(PLAYER_AT.y / TILE_SIZE);
    let spot: { tx: number; ty: number } | null = null;
    for (let dy = -15; dy <= 15 && !spot; dy++)
      for (let dx = -20; dx <= 20 && !spot; dx++) {
        const tx = ptx + dx;
        const ty = pty + dy;
        const c = (t: number) => (t + 0.5) * TILE_SIZE;
        if (blocksShot(room, tx, ty) && !isSolid(room, tx - 4, ty) && !isSolid(room, tx + 4, ty) && !clearShot(room, c(tx - 4), c(ty), c(tx + 4), c(ty))) spot = { tx, ty };
      }
    if (!spot) throw new Error('no blocking tile near the meadow');
    movePlayer(s, (spot.tx - 4 + 0.5) * TILE_SIZE, (spot.ty + 0.5) * TILE_SIZE);
    const e = createEnemy(s.nextEnemyId++, 'storm-sentinel', { x: (spot.tx + 4 + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE }, HALL, 'pack');
    s.enemies.push(e);
    expect(clearShot(room, e.x, e.y, s.player.x, s.player.y)).toBe(false);
    run(s, 30);
    expect(s.strikes).toEqual([]);
  });
});
