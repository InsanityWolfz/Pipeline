import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import type { SniperDef } from '../../src/data/hollowsEnemies';
import { coverSpot } from '../../src/sim/cover';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { clearShot } from '../../src/sim/sightLine';
import { roomById, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, HALL, movePlayer, PLAYER_AT, run, runUntil } from './fight';

// The Sniper construct (035): cover from the tile grid; keeping its distance without it;
// stepping out to a clear line; the sight tracking, then locked; a blocked line cancelling;
// the bolt down the locked line, dodged by a roll, stopped by solids; backing off when close.

const DEF = enemyDef('sniper') as SniperDef;
const { snipe } = DEF;
const ROOM = roomById(HALL);
const BOLT_STEP = snipe.boltSpeed / TICK_RATE;

/** The meadow's south rock cluster (rocks 69–71 on row 33, 68–72 on row 34, 68 and 72 on row 35) and tiles round it. */
const at = (tx: number, ty: number) => tileCentre({ tx, ty });

function placeSniper(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'sniper', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

const line = (s: SimState, e: EnemyState): boolean => clearShot(ROOM, e.x, e.y, s.player.x, s.player.y);
const snipeOf = (s: SimState) => summarize(s).enemies[0]?.snipe;

describe('the Sniper construct', () => {
  it("has the spec's starting values in data: 60 tracking and 24 locked make its wind-up", () => {
    expect(DEF).toMatchObject({ kind: 'sniper', boss: false, maxHealth: 30, walkSpeed: 50 });
    expect(snipe).toMatchObject({ aggroRange: 320, backOff: 96, coverSearch: 5, peekTiles: 1, trackTicks: 60, lockTicks: 24, windupTicks: 84, cooldownTicks: 240, boltSpeed: 480, damage: 28, range: 400, knockback: 12 });
    expect(snipe.windupTicks).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
    expect(snipe.aggroRange).toBeGreaterThan(enemyDef('wisp').kind === 'caster' ? 160 : 0);
  });

  it('aggros at its long range, past the screen’s half-height', () => {
    const s = arena();
    const e = placeSniper(s, PLAYER_AT.x, PLAYER_AT.y + snipe.aggroRange - 10);
    run(s, 1);
    expect(e.mode).not.toBe('idle');
    const t = arena();
    const f = placeSniper(t, PLAYER_AT.x, PLAYER_AT.y + snipe.aggroRange + 20);
    run(t, 5);
    expect(f.mode).toBe('idle');
  });

  it('finds cover from the tile grid: the nearest free tile with a solid between it and the player', () => {
    const s = arena();
    movePlayer(s, at(75, 31).x, at(75, 31).y);
    const e = placeSniper(s, at(73, 37).x, at(73, 37).y);
    const c = coverSpot(s, e, DEF);
    expect(c).not.toBeNull();
    if (!c) return;
    expect(clearShot(ROOM, c.x, c.y, s.player.x, s.player.y)).toBe(false);
    expect(Math.hypot(c.x - e.x, c.y - e.y)).toBeLessThanOrEqual(snipe.coverSearch * 32);
    // Its cooldown running, it walks there and waits, out of the line.
    e.cooldown = 1000;
    run(s, 120);
    expect({ x: e.x, y: e.y }).toEqual(c);
    expect(line(s, e)).toBe(false);
    expect(snipeOf(s)).toEqual({ phase: 'cover', line: null });
  });

  it('with no cover in reach keeps its distance in the open, as the Wisp', () => {
    const s = arena();
    const e = placeSniper(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    e.cooldown = 1000;
    expect(coverSpot(s, e, DEF)).toBeNull();
    run(s, 200);
    expect(Math.abs(Math.hypot(e.x - s.player.x, e.y - s.player.y) - snipe.keepAway)).toBeLessThanOrEqual(snipe.settle + 1);
    expect(snipeOf(s)?.phase).toBe('open');
  });

  it('ready, steps out of cover to a tile that sees the player, at most `peekTiles` away, and winds up', () => {
    const s = arena();
    movePlayer(s, at(75, 31).x, at(75, 31).y);
    const e = placeSniper(s, at(71, 36).x, at(71, 36).y);
    expect(line(s, e)).toBe(false);
    run(s, 1);
    expect(e.mode).toBe('peek');
    expect(snipeOf(s)?.phase).toBe('peek');
    runUntil(s, () => e.mode === 'windup', 60);
    expect(Math.max(Math.abs(e.x - at(71, 36).x), Math.abs(e.y - at(71, 36).y))).toBeLessThanOrEqual(snipe.peekTiles * 32);
    expect(line(s, e)).toBe(true);
  });

  it('tracks the player for `trackTicks`, then locks: the line stops following', () => {
    const s = arena();
    const e = placeSniper(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    expect(snipeOf(s)).toEqual({ phase: 'tracking', line: { x0: e.x, y0: e.y, x1: s.player.x, y1: s.player.y } });
    run(s, 20, { moveY: 1 });
    expect(e.swipeDirY).toBeGreaterThan(0);
    // The wind-up's first `trackTicks` ticks track (its start was the first), the rest are locked.
    run(s, snipe.trackTicks - 22, { moveY: 1 });
    expect(snipeOf(s)?.phase).toBe('tracking');
    run(s, 1, { moveY: 1 });
    expect(snipeOf(s)?.phase).toBe('locked');
    const locked = { x: e.swipeDirX, y: e.swipeDirY };
    run(s, snipe.lockTicks, { moveY: -1 });
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual(locked);
    expect(e.mode).toBe('windup');
    expect(s.events.snipes).toEqual([]);
    const l = snipeOf(s)?.line;
    expect(l && Math.hypot(l.x1 - l.x0, l.y1 - l.y0)).toBeCloseTo(snipe.range);
    run(s, 1);
    expect(s.events.snipes).toEqual([{ id: e.id, x: e.x, y: e.y, dx: locked.x, dy: locked.y }]);
  });

  it('cancels the wind-up when a solid blocks the line while tracking, and steps out again', () => {
    const s = arena();
    movePlayer(s, at(74, 30).x, at(74, 30).y);
    const e = placeSniper(s, at(74, 33).x, at(74, 33).y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    run(s, 10);
    // Behind the rocks, west along row 33.
    movePlayer(s, at(67, 33).x, at(67, 33).y);
    run(s, 1);
    expect(e.mode).toBe('peek');
    expect(e.cooldown).toBe(0);
    run(s, 120);
    expect(s.orbs).toEqual([]);
  });

  it('fires one bolt down the locked line at its speed, hitting a player who stayed for its damage', () => {
    const s = arena();
    const e = placeSniper(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    run(s, 1);
    runUntil(s, () => s.events.snipes.length > 0, snipe.windupTicks + 2);
    expect(s.orbs).toHaveLength(1);
    expect(summarize(s).orbs[0]).toMatchObject({ enemyId: 'sniper', dx: -1, dy: 0 });
    const x0 = s.orbs[0]?.x ?? 0;
    run(s, 2);
    expect(x0 - (s.orbs[0]?.x ?? 0)).toBeCloseTo(2 * BOLT_STEP);
    runUntil(s, () => s.player.health < 100, 40);
    expect(s.player.health).toBe(100 - snipe.damage);
    expect(s.orbs).toEqual([]);
    expect(e.mode === 'swipe' || e.mode === 'recover' || e.mode === 'chase').toBe(true);
  });

  it("a roll's i-frames let the bolt pass through", () => {
    const s = arena();
    placeSniper(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    run(s, 1);
    runUntil(s, () => s.events.snipes.length > 0, snipe.windupTicks + 2);
    runUntil(s, () => (s.orbs[0]?.x ?? 0) - s.player.x < 40, 40);
    run(s, 1, { dodge: true, moveX: 1 });
    run(s, 30);
    expect(s.player.health).toBe(100);
  });

  it('ends its bolt at a solid', () => {
    const s = arena();
    // East along row 34 at a player in front of the rocks (68 on); the player steps aside once it locks.
    movePlayer(s, at(66, 34).x, at(66, 34).y);
    const e = placeSniper(s, at(61, 34).x, at(61, 34).y);
    run(s, 1);
    runUntil(s, () => snipeOf(s)?.phase === 'locked', snipe.trackTicks + 2);
    expect(snipeOf(s)?.line?.x1).toBeCloseTo(68 * 32);
    movePlayer(s, at(66, 37).x, at(66, 37).y);
    runUntil(s, () => s.events.snipes.length > 0, snipe.lockTicks + 2);
    let last = s.orbs[0];
    while (s.orbs.length > 0) {
      last = s.orbs[0];
      run(s, 1);
    }
    expect(last?.travelled ?? 0).toBeLessThan(snipe.range);
    expect(last?.x ?? 0).toBeLessThanOrEqual(68 * 32);
    expect(last?.x ?? 0).toBeGreaterThan(68 * 32 - 2 * BOLT_STEP);
    expect(s.player.health).toBe(100);
    expect(e.health).toBe(DEF.maxHealth);
  });

  it('backs off a player closer than `backOff` rather than firing: to cover farther away, or straight away in the open', () => {
    const s = arena();
    const e = placeSniper(s, PLAYER_AT.x + 50, PLAYER_AT.y);
    run(s, 30);
    expect(e.x).toBeGreaterThan(PLAYER_AT.x + 50);
    expect(e.x).toBeLessThan(PLAYER_AT.x + snipe.backOff);
    expect(e.mode).not.toBe('windup');
    const t = arena();
    movePlayer(t, at(75, 32).x, at(75, 32).y);
    const f = placeSniper(t, at(73, 33).x, at(73, 33).y);
    const start = Math.hypot(f.x - t.player.x, f.y - t.player.y);
    // While the player is that close it never starts a shot, heading for cover farther from them.
    while (Math.hypot(f.x - t.player.x, f.y - t.player.y) < snipe.backOff) {
      run(t, 1);
      expect(f.mode).not.toBe('windup');
      expect(t.tick).toBeLessThan(200);
    }
    expect(Math.hypot(f.x - t.player.x, f.y - t.player.y)).toBeGreaterThan(start);
    expect(t.orbs).toEqual([]);
  });

  it('is deterministic', () => {
    const go = () => {
      const s = arena();
      movePlayer(s, at(75, 31).x, at(75, 31).y);
      placeSniper(s, at(71, 36).x, at(71, 36).y);
      run(s, 600, (st) => ({ moveX: st.tick % 150 < 75 ? 1 : -1 }));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
  });
});
