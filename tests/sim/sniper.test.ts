import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import type { SniperDef } from '../../src/data/hollowsEnemies';
import type { Rect } from '../../src/sim/collision';
import { coverSpot } from '../../src/sim/cover';
import { footprintAt } from '../../src/sim/footprints';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { clearShot } from '../../src/sim/sightLine';
import { roomById, type SimState } from '../../src/sim/state';
import { TILE } from '../../src/data/rooms';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, movePlayer, PLAYER_AT, run, runUntil, homeTile, HOME_X } from './fight';

// The Sniper construct (035): cover from the tile grid; keeping its distance without it;
// stepping out to a clear line; the sight tracking, then locked; a blocked line cancelling;
// the bolt down the locked line, dodged by a roll, stopped by solids; backing off when close.

const DEF = enemyDef('sniper') as SniperDef;
const { snipe } = DEF;
const ROOM = roomById(HALL);
const BOLT_STEP = snipe.boltSpeed / TICK_RATE;

/** The meadow's south rock cluster (rocks 69–71 on row 33, 68–72 on row 34, 68 and 72 on row 35) and tiles round it. */
/** A tile of the meadow by its 034-era tile (053 moved it with the foundry). */
const at = (tx: number, ty: number) => homeTile(tx, ty);

/** 059.5: a y near the foot of a home row, inside its rocks' footprints, or near its top, above them. */
const low = (ty: number): number => at(0, ty).y + 13;
const high = (ty: number): number => at(0, ty).y - 13;

/** The footprint of the piece on a home tile. */
function footOf(tx: number, ty: number): Rect {
  const { x, y } = at(tx, ty);
  const f = footprintAt(roomById(HALL), Math.floor(x / 32), Math.floor(y / 32));
  if (!f) throw new Error(`no footprint at ${tx},${ty}`);
  return f;
}

/**
 * West along row 34 at height `y`: a player at 74 painted by a Sniper at 77, who steps aside once it locks; returns the
 * locked line and the bolt's last position before it ended.
 */
function lockAndFire(s: SimState, y: number) {
  movePlayer(s, at(74, 34).x, y);
  const e = placeSniper(s, at(77, 34).x, y);
  run(s, 1);
  runUntil(s, () => snipeOf(s)?.phase === 'locked', snipe.trackTicks + 2);
  const line = snipeOf(s)?.line;
  movePlayer(s, at(74, 37).x, at(74, 37).y);
  runUntil(s, () => s.events.snipes.length > 0, snipe.lockTicks + 2);
  let last = s.orbs[0];
  while (s.orbs.length > 0) {
    last = s.orbs[0];
    run(s, 1);
  }
  return { line, last, e };
}

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

  it('cancels the wind-up when a solid blocks the line while tracking, and tries again later', () => {
    const s = arena();
    movePlayer(s, at(74, 30).x, at(74, 30).y);
    // 059.5: along the foot of row 33, where the rocks' footprints stand (a line over the top of their tiles is clear).
    const e = placeSniper(s, at(74, 33).x, low(33));
    run(s, 1);
    expect(e.mode).toBe('windup');
    run(s, 10);
    // Behind the rocks, west along row 33.
    movePlayer(s, at(67, 33).x, low(33));
    run(s, 1);
    // The shot is off; a tile a step up the row sees the player over the rocks' footprints (059.5), so it steps out.
    expect(e.mode).toBe('peek');
    expect(snipeOf(s)).toEqual({ phase: 'peek', line: null });
    expect(s.events.snipes).toEqual([]);
    // It tries again from there: its next wind-up starts with a clear line to the player, and no bolt flew meanwhile.
    runUntil(s, () => e.mode === 'windup', 120);
    expect(clearShot(roomById(HALL), e.x, e.y, s.player.x, s.player.y)).toBe(true);
    expect(e.y).toBeLessThan(low(33) - 4);
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

  it('paints and hits a player standing in the top of a rock\'s tile, above its footprint (059)', () => {
    const s = arena();
    // The meadow's rock at (72, 34), open ground above it; the Sniper six tiles north.
    const rock = homeTile(72, 34);
    movePlayer(s, rock.x, rock.y - 8);
    const e = placeSniper(s, rock.x, at(72, 28).y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    expect(snipeOf(s)?.phase).toBe('tracking');
    expect(snipeOf(s)?.line?.y1).toBeCloseTo(rock.y - 8);
    runUntil(s, () => s.player.health < 100, snipe.windupTicks + 40);
    expect(s.player.health).toBe(100 - snipe.damage);
  });

  it('ends its bolt at a solid', () => {
    const s = arena();
    // 053: west along row 34 at a player in front of the rocks' east face (72 their last); the player steps aside once it locks.
    // 059.5: along the foot of the row, where the rocks' footprints stand: line and bolt both end at 72's footprint.
    const { line, last, e } = lockAndFire(s, low(34));
    const face = footOf(72, 34);
    expect(line?.x1).toBeCloseTo(face.x + face.w / 2);
    expect(last?.travelled ?? 0).toBeLessThan(snipe.range);
    expect(last?.x ?? 0).toBeGreaterThanOrEqual((line?.x1 ?? 0) - BOLT_STEP);
    expect(last?.x ?? 0).toBeLessThan((line?.x1 ?? 0) + 2 * BOLT_STEP);
    expect(s.player.health).toBe(100);
    expect(e.health).toBe(DEF.maxHealth);
  });

  it('over the top of the rocks\' tiles, its line and its bolt both run on past them (059.5: shots match what\'s drawn)', () => {
    const s = arena();
    // The same row, along the top of its tiles, above the rocks' footprints.
    const { line, last } = lockAndFire(s, high(34));
    expect(line?.x1).toBeLessThan(HOME_X(68));
    // The bolt flies to the end of the line it showed: past the rocks, out to its range or the first footprint or wall.
    expect(last?.x ?? 0).toBeLessThan(HOME_X(68));
    expect(Math.abs((last?.x ?? 0) - (line?.x1 ?? 0))).toBeLessThan(2 * BOLT_STEP);
    expect(s.player.health).toBe(100);
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

  it('behind a long cliff with no tile a step away that sees the player, never sticks stepping out', () => {
    const s = arena();
    const room = roomById(HALL);
    const rows = room.rows;
    const ptx = Math.floor(PLAYER_AT.x / 32);
    const pty = Math.floor(PLAYER_AT.y / 32);
    room.rows = rows.map((r, ty) => (Math.abs(ty - pty) <= 8 ? r.slice(0, ptx + 4) + TILE.cliff + r.slice(ptx + 5) : r));
    try {
      const e = placeSniper(s, (ptx + 8.5) * 32, PLAYER_AT.y);
      let peeking = 0;
      let longest = 0;
      for (let t = 0; t < 1200; t++) {
        run(s, 1);
        peeking = e.mode === 'peek' ? peeking + 1 : 0;
        longest = Math.max(longest, peeking);
        expect(s.events.snipes).toEqual([]);
      }
      expect(longest).toBeLessThanOrEqual(1);
      expect(e.x).toBeGreaterThan((ptx + 5) * 32);
      expect(s.player.health).toBe(100);
    } finally {
      room.rows = rows;
    }
  });

  it('frozen mid-wind-up it pauses, its line never through the rocks, then resumes (and a blocked line cancels it)', () => {
    const s = arena();
    movePlayer(s, at(74, 30).x, at(74, 30).y);
    const e = placeSniper(s, at(74, 33).x, low(33));
    run(s, 11);
    expect(e.mode).toBe('windup');
    const ticks = e.modeTicks;
    e.frozen = 30;
    // Behind the rocks while it can't think: its line stops at the first one's footprint (71's, on row 33's foot).
    movePlayer(s, at(67, 33).x, low(33));
    run(s, 20);
    expect(e.modeTicks).toBe(ticks);
    const face = footOf(71, 33);
    expect(snipeOf(s)?.line?.x1).toBeCloseTo(face.x + face.w / 2);
    // Back in the open before the thaw: the wind-up runs on from where it paused, and fires.
    movePlayer(s, at(74, 30).x, at(74, 30).y);
    runUntil(s, () => e.frozen === 0, 20);
    runUntil(s, () => s.events.snipes.length > 0, snipe.windupTicks - ticks + 3);
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
