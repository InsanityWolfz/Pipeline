import { describe, expect, it } from 'vitest';
import { TICK_RATE, VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { damageEnemy } from '../../src/sim/enemies';
import { arena, fireAt, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, SWIPE_LANDS } from './fight';

const HALF_W = VIEW_WIDTH / 2;
const HALF_H = VIEW_HEIGHT / 2;
const STEP = HUSK.walkSpeed / TICK_RATE;
const { swipe } = HUSK;
/** Far enough west that a Husk at x >= 400 is off screen. */
const AWAY = { x: 40, y: PLAYER_AT.y };

/** A Husk winding up at the player's east, its swipe locked pointing west. */
function windingUp(gap = swipe.triggerRange) {
  const s = arena();
  const e = placeHusk(s, PLAYER_AT.x + gap, PLAYER_AT.y);
  run(s, 1);
  return { s, e };
}

describe('Husk aggro box', () => {
  it('stays idle just outside the on-screen box', () => {
    for (const [dx, dy] of [
      [HALF_W + 1, 0],
      [0, HALF_H + 1],
      [-HALF_W - 1, 0],
      [0, -HALF_H - 1],
    ] as const) {
      const s = arena();
      const e = placeHusk(s, PLAYER_AT.x + dx, PLAYER_AT.y + dy);
      run(s, 5);
      expect(e.mode).toBe('idle');
      expect({ x: e.x, y: e.y }).toEqual({ x: e.homeX, y: e.homeY });
    }
  });

  it('aggros on the box edges and corners', () => {
    for (const [dx, dy] of [
      [HALF_W, 0],
      [0, HALF_H],
      [HALF_W, HALF_H],
      [-HALF_W, -HALF_H],
      [HALF_W, -HALF_H],
      [-HALF_W, HALF_H],
    ] as const) {
      const s = arena();
      const e = placeHusk(s, PLAYER_AT.x + dx, PLAYER_AT.y + dy);
      run(s, 1);
      expect(e.mode).toBe('chase');
    }
  });

  it('aggros when an arrow hits it from off screen', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x, PLAYER_AT.y - HALF_H - 20);
    expect(e.mode).toBe('idle');
    runUntil(s, () => e.health < HUSK.maxHealth, 60, fireAt(PLAYER_AT.x, 0));
    expect(e.mode).toBe('chase');
  });
});

describe('Husk chase', () => {
  it('walks straight at the player at walk speed and faces the way it walks', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
    run(s, 1);
    expect(e.x).toBeCloseTo(PLAYER_AT.x + 200 - STEP, 6);
    expect(e.y).toBe(PLAYER_AT.y);
    expect(e.facing).toBe('left');
    run(s, 59);
    expect(e.x).toBeCloseTo(PLAYER_AT.x + 200 - 60 * STEP, 6);
  });

  it('keeps chasing with no time limit while on screen', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 250, PLAYER_AT.y);
    // The player backs off west at walk speed, faster than the Husk, for a long time.
    run(s, 1);
    for (let i = 0; i < 600; i++) {
      movePlayer(s, e.x - 250, PLAYER_AT.y);
      run(s, 1);
      expect(e.mode).toBe('chase');
    }
  });

  it('holds position in swipe range while its cooldown runs', () => {
    const { s, e } = windingUp();
    run(s, SWIPE_LANDS + swipe.swipeTicks + swipe.recoverTicks - 2);
    expect(e.mode).toBe('recover');
    // Undo the swipe's knockback so the player is back in range.
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y);
    const x = e.x;
    e.cooldown = 10;
    run(s, 2);
    expect(e.mode).toBe('chase');
    expect(e.x).toBe(x);
  });
});

describe('Husk leash', () => {
  function chasing() {
    const s = arena();
    const e = placeHusk(s, 700, PLAYER_AT.y);
    run(s, 1);
    expect(e.mode).toBe('chase');
    movePlayer(s, AWAY.x, AWAY.y);
    return { s, e };
  }

  it('heads home after leashGraceTicks off screen, not before', () => {
    const { s, e } = chasing();
    run(s, HUSK.leashGraceTicks - 1);
    expect(e.mode).toBe('chase');
    run(s, 1);
    expect(e.mode).toBe('return');
  });

  it('restarts the count when it comes back on screen', () => {
    const { s, e } = chasing();
    run(s, 30);
    movePlayer(s, e.x - 100, e.y);
    run(s, 1);
    movePlayer(s, AWAY.x, AWAY.y);
    run(s, HUSK.leashGraceTicks - 1);
    expect(e.mode).toBe('chase');
    run(s, 1);
    expect(e.mode).toBe('return');
  });

  it('walks home, re-aggroing when back on screen', () => {
    const { s, e } = chasing();
    run(s, HUSK.leashGraceTicks + 30);
    expect(e.mode).toBe('return');
    expect(e.x).toBeGreaterThan(700 - HUSK.leashGraceTicks * STEP);
    movePlayer(s, e.x - 100, e.y);
    run(s, 1);
    expect(e.mode).toBe('chase');
  });

  it('re-aggros when hit on the way home, and can always be damaged', () => {
    const { s, e } = chasing();
    run(s, HUSK.leashGraceTicks);
    expect(e.mode).toBe('return');
    damageEnemy(s, e, 10, -1, 0);
    expect(e.health).toBe(HUSK.maxHealth - 10);
    expect(e.mode).toBe('chase');
  });

  it('heals to full and idles once home', () => {
    const s = arena(undefined, AWAY);
    const e = placeHusk(s, 700, PLAYER_AT.y);
    e.x = 760;
    e.mode = 'return';
    e.health = 10;
    const ticks = runUntil(s, () => e.mode === 'idle', 120);
    expect(ticks).toBeLessThanOrEqual(Math.ceil((60 - HUSK.homeTolerance) / STEP) + 1);
    expect(e.health).toBe(HUSK.maxHealth);
    expect(Math.abs(e.x - e.homeX)).toBeLessThanOrEqual(HUSK.homeTolerance);
  });

  it('finishes a swipe before the leash applies', () => {
    const { s, e } = windingUp();
    // A home away from where it stands, so heading home takes a while.
    e.homeX += 100;
    movePlayer(s, AWAY.x, AWAY.y);
    const states = new Set<string>();
    for (let i = 0; i < SWIPE_LANDS + swipe.swipeTicks + swipe.recoverTicks - 2; i++) {
      run(s, 1);
      states.add(e.mode);
    }
    expect([...states].sort()).toEqual(['recover', 'swipe', 'windup']);
    run(s, 1);
    expect(e.mode).toBe('return');
  });
});

describe('Husk swipe', () => {
  it('starts a wind-up within trigger range, locking its direction', () => {
    const { e } = windingUp();
    expect(e.mode).toBe('windup');
    expect([e.swipeDirX, e.swipeDirY]).toEqual([-1, 0]);
    expect(e.facing).toBe('left');
  });

  it('keeps chasing just outside trigger range', () => {
    const { e } = windingUp(swipe.triggerRange + 2);
    expect(e.mode).toBe('chase');
  });

  it('keeps facing its locked direction through swipe and recover while the player circles', () => {
    const { s, e } = windingUp();
    const total = SWIPE_LANDS + swipe.swipeTicks + swipe.recoverTicks - 2;
    for (let i = 0; i < total; i++) {
      const a = (i / 10) * Math.PI;
      movePlayer(s, e.x + Math.cos(a) * 25, e.y + Math.sin(a) * 25);
      run(s, 1);
      expect(e.facing).toBe('left');
    }
  });

  it('does not move during the wind-up', () => {
    const { s, e } = windingUp();
    const x = e.x;
    movePlayer(s, PLAYER_AT.x - 10, PLAYER_AT.y + 10);
    run(s, 20);
    expect(e.x).toBe(x);
    expect([e.swipeDirX, e.swipeDirY]).toEqual([-1, 0]);
  });

  it('lands on the tick after the wind-up', () => {
    const { s, e } = windingUp();
    run(s, SWIPE_LANDS - 2);
    expect(e.mode).toBe('windup');
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(e.mode).toBe('swipe');
    expect(s.player.health).toBe(80);
  });

  /** Moves the player to `dist` px from the Husk at `deg` degrees off its swipe direction. */
  function swipeAt(dist: number, deg: number): number {
    const { s, e } = windingUp();
    const rad = (deg * Math.PI) / 180;
    run(s, SWIPE_LANDS - 2);
    movePlayer(s, e.x - Math.cos(rad) * dist, e.y + Math.sin(rad) * dist);
    run(s, 1);
    return s.player.health;
  }

  it('reaches exactly 40 px and no further', () => {
    expect(swipeAt(swipe.reach, 0)).toBe(80);
    expect(swipeAt(swipe.reach + 0.5, 0)).toBe(100);
  });

  it('covers a 120 degree arc', () => {
    expect(swipeAt(30, 59)).toBe(80);
    expect(swipeAt(30, -59)).toBe(80);
    expect(swipeAt(30, 61)).toBe(100);
    expect(swipeAt(30, 180)).toBe(100);
  });

  it('misses a player who sidesteps out of the arc during the wind-up', () => {
    const { s } = windingUp();
    run(s, SWIPE_LANDS - 1, { moveY: 1 });
    expect(s.player.health).toBe(100);
  });

  it('misses a player rolling through it', () => {
    const { s } = windingUp();
    run(s, SWIPE_LANDS - 3);
    run(s, 1, { dodge: true, moveY: 1 });
    run(s, 1);
    expect(s.player.health).toBe(100);
  });

  it('recovers, then goes back to chasing', () => {
    const { s, e } = windingUp();
    run(s, SWIPE_LANDS - 1 + swipe.swipeTicks - 1);
    expect(e.mode).toBe('swipe');
    run(s, 1);
    expect(e.mode).toBe('recover');
    run(s, swipe.recoverTicks - 1);
    expect(e.mode).toBe('recover');
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y);
    run(s, 1);
    // Back in range with the cooldown over, it winds straight up again.
    expect(e.mode).toBe('windup');
    expect(e.cooldown).toBe(swipe.cooldownTicks);
  });

  it('keeps its locked direction when knocked back during the wind-up', () => {
    const { s, e } = windingUp();
    damageEnemy(s, e, 10, 0, 1);
    run(s, HUSK.hitKnockTicks);
    expect(e.y).toBeCloseTo(PLAYER_AT.y + HUSK.hitKnockback, 6);
    expect(e.mode).toBe('windup');
    expect([e.swipeDirX, e.swipeDirY]).toEqual([-1, 0]);
    run(s, SWIPE_LANDS - 1 - HUSK.hitKnockTicks);
    expect(s.player.health).toBe(80);
  });
});

describe('Husk bodies', () => {
  const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < HUSK.feetBox.w && Math.abs(a.y - b.y) < HUSK.feetBox.h;

  it('push apart instead of overlapping', () => {
    const s = arena(undefined, AWAY);
    const a = placeHusk(s, 700, PLAYER_AT.y);
    const b = placeHusk(s, 700, PLAYER_AT.y);
    run(s, 1);
    expect(overlap(a, b)).toBe(false);
  });

  it('are not pushed into walls', () => {
    const s = arena(undefined, { x: 400, y: 448 });
    s.player.x = 1000;
    const a = placeHusk(s, 40, 100);
    const b = placeHusk(s, 40, 100);
    run(s, 10);
    expect(overlap(a, b)).toBe(false);
    expect(Math.min(a.x, b.x)).toBeGreaterThanOrEqual(40);
  });

  it('do not block the player', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 40, PLAYER_AT.y);
    run(s, 40, { moveX: 1 });
    expect(s.player.x).toBeGreaterThan(e.x + HUSK.feetBox.w);
  });
});
