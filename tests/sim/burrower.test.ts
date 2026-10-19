import { describe, expect, it } from 'vitest';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import type { BurrowerDef } from '../../src/data/hollowsEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, fireAt, HALL, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The Burrower (035): digs in on aggro, tunnels as an untargetable ripple, locks the
// player's feet, a ring grows there, then it erupts and stays surfaced and dazed.

const DEF = enemyDef('burrower') as BurrowerDef;
const { burrow } = DEF;

function placeBurrower(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'burrower', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL);
  s.enemies.push(e);
  return e;
}

/** A Burrower already under the ground `dx` px east, held still (frozen) so it stays put. */
function buried(s: SimState, dx: number): EnemyState {
  const e = placeBurrower(s, dx);
  e.underground = true;
  e.mode = 'chase';
  e.frozen = 10_000;
  return e;
}

/** Runs until it locks a spot, with the player standing still. */
function untilLocked(s: SimState, e: EnemyState): void {
  runUntil(s, () => e.mode === 'windup', burrow.digTicks + burrow.maxTunnelTicks + 10);
}

describe('the Burrower', () => {
  it("has the spec's starting values in data, its wind-up past the telegraph minimum", () => {
    expect(DEF).toMatchObject({ kind: 'burrower', boss: false, maxHealth: 35, walkSpeed: 40 });
    expect(burrow).toMatchObject({ digTicks: 20, speed: 70, lockRange: 12, maxTunnelTicks: 180, radius: 28, windupTicks: 50, surfacedTicks: 150, recoverTicks: 150, cooldownTicks: 240, damage: 22, knockback: 32 });
    expect(burrow.windupTicks).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
  });

  it('idles above ground, digs in for `digTicks` on aggro (hittable while digging), then goes under', () => {
    const s = arena();
    const e = placeBurrower(s, 48);
    expect(summarize(s).enemies[0]).toMatchObject({ underground: false, locked: null, mode: 'idle' });
    run(s, 1, fireAt(PLAYER_AT.x + 48, PLAYER_AT.y - 8));
    expect(e.mode).toBe('dig');
    // Arrows pierce (029): it flies on past.
    run(s, 12);
    expect(e.health).toBe(DEF.maxHealth - 10);
    expect(e.underground).toBe(false);
    runUntil(s, () => e.underground, burrow.digTicks + 2);
    expect(e.mode).toBe('chase');
  });

  it('is untargetable underground: arrows fly through, punches and bursts miss it', () => {
    const s = arena();
    const e = buried(s, 60);
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y - 8));
    runUntil(s, () => s.arrows.length === 0 || (s.arrows[0]?.x ?? 0) > e.x + 40, 30);
    expect(e.health).toBe(DEF.maxHealth);
    expect(s.events.hits).toEqual([]);
    // A punch: nothing to fire.
    s.inventory = {};
    s.tube.fireCooldown = 0;
    movePlayer(s, e.x - 20, e.y);
    run(s, 1, fireAt(e.x, e.y));
    expect(s.events.melees[0]?.hits).toEqual([]);
    // A bomb bursting on it.
    s.inventory = { bomb: 1 };
    s.tube.ammoId = 'bomb';
    s.tube.meleeCooldown = 0;
    movePlayer(s, e.x - 100, e.y);
    run(s, 1, fireAt(e.x, e.y));
    runUntil(s, () => s.bombs.length === 0, 120);
    expect(e.health).toBe(DEF.maxHealth);
    // Surfaced, the same arrow lands.
    e.underground = false;
    s.inventory = { arrow: 5 };
    s.tube.ammoId = 'arrow';
    s.tube.fireCooldown = 0;
    run(s, 1, fireAt(e.x, e.y - 8));
    run(s, 20);
    expect(e.health).toBe(DEF.maxHealth - 10);
  });

  it('is never pushed apart from enemies while underground', () => {
    const s = arena();
    const a = buried(s, 100);
    const b = buried(s, 100);
    run(s, 3);
    expect([a.x, b.x]).toEqual([PLAYER_AT.x + 100, PLAYER_AT.x + 100]);
  });

  it('tunnels at its speed and locks within `lockRange` of a still player, the ripple at their feet', () => {
    const s = arena();
    const e = placeBurrower(s, 150);
    runUntil(s, () => e.underground, burrow.digTicks + 2);
    run(s, 30);
    expect(PLAYER_AT.x + 150 - e.x).toBeCloseTo((30 * burrow.speed) / 60, 0);
    untilLocked(s, e);
    expect(Math.hypot(s.player.x - (e.x - 0), 0)).toBeLessThanOrEqual(burrow.lockRange + 1e-6);
    expect({ x: e.spotX, y: e.spotY }).toEqual({ x: s.player.x, y: s.player.y });
    expect({ x: e.x, y: e.y }).toEqual({ x: s.player.x, y: s.player.y });
    expect(summarize(s).enemies[0]).toMatchObject({ underground: true, locked: { x: s.player.x, y: s.player.y, radius: burrow.radius } });
  });

  it('locks the player’s feet after `maxTunnelTicks` even when it never catches them', () => {
    const s = arena();
    const e = placeBurrower(s, 150);
    runUntil(s, () => e.underground, burrow.digTicks + 2);
    // The player keeps 100 px ahead of it.
    let ticks = 0;
    while (e.mode !== 'windup' && ticks < 400) {
      movePlayer(s, e.x - 100, PLAYER_AT.y);
      run(s, 1);
      ticks++;
    }
    expect(ticks).toBe(burrow.maxTunnelTicks);
    expect({ x: e.spotX, y: e.spotY }).toEqual({ x: s.player.x, y: s.player.y });
  });

  it('erupts after `windupTicks`: a player inside the ring is hit and knocked outward', () => {
    const s = arena();
    const e = placeBurrower(s, 100);
    untilLocked(s, e);
    // Off-centre inside the ring.
    movePlayer(s, e.spotX + burrow.radius - 4, e.spotY);
    run(s, burrow.windupTicks - 1);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(s.events.eruptions).toEqual([{ id: e.id, x: e.spotX, y: e.spotY, radius: burrow.radius }]);
    expect(s.player.health).toBe(100 - burrow.damage);
    expect(s.player.knockX).toBeGreaterThan(0);
    expect(e.underground).toBe(false);
  });

  it('a player who steps out of the ring during the wind-up is missed', () => {
    const s = arena();
    const e = placeBurrower(s, 100);
    untilLocked(s, e);
    run(s, 25, { moveY: 1 });
    expect(Math.hypot(s.player.x - e.spotX, s.player.y - e.spotY)).toBeGreaterThan(burrow.radius);
    runUntil(s, () => s.events.eruptions.length > 0, burrow.windupTicks);
    expect(s.player.health).toBe(100);
  });

  it("a roll's i-frames dodge the eruption", () => {
    const s = arena();
    const e = placeBurrower(s, 100);
    untilLocked(s, e);
    run(s, burrow.windupTicks - 4);
    // Rolling in place along the ring's edge: still inside as it bursts, but invulnerable.
    run(s, 1, { dodge: true, moveX: 1 });
    runUntil(s, () => s.events.eruptions.length > 0, 10);
    expect(Math.hypot(s.player.x - e.spotX, s.player.y - e.spotY)).toBeLessThanOrEqual(burrow.radius);
    expect(s.player.health).toBe(100);
  });

  it('stays surfaced and hittable for `surfacedTicks`, then digs in again', () => {
    const s = arena();
    const e = placeBurrower(s, 100);
    untilLocked(s, e);
    runUntil(s, () => e.mode === 'recover', burrow.windupTicks + burrow.swipeTicks + 2);
    movePlayer(s, e.x - 100, e.y);
    s.player.hurtTicks = 0;
    run(s, 1, fireAt(e.x, e.y - 8));
    run(s, 20);
    expect(e.health).toBe(DEF.maxHealth - 10);
    expect(e.underground).toBe(false);
    runUntil(s, () => e.mode === 'dig', burrow.surfacedTicks);
    runUntil(s, () => e.underground, burrow.digTicks + 2);
  });

  it('is deterministic', () => {
    const go = () => {
      const s = arena();
      placeBurrower(s, 150);
      run(s, 500, (st) => ({ moveX: st.tick % 120 < 60 ? 1 : -1 }));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
  });
});
