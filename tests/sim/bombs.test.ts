import { describe, expect, it } from 'vitest';
import { defOf } from '../../src/sim/champions';
import { lobAmmo } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import { MUZZLE_OFFSET } from '../../src/data/tube';
import { stepBombs, throwBomb } from '../../src/sim/bombs';
import type { EnemyState } from '../../src/sim/enemies';
import { arena, fireAt, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';

const BOMB = lobAmmo('bomb');
const STEP = BOMB.speed / TICK_RATE;

function armed(at: { x: number; y: number } = PLAYER_AT) {
  const s = arena(undefined, at);
  s.inventory.bomb = 6;
  run(s, 1, { selectAmmo: 'bomb' });
  return s;
}

/** Holds a Husk in place: a wind-up that won't land for a long time. Hits don't end it. */
function freeze(e: EnemyState): EnemyState {
  e.mode = 'windup';
  e.modeTicks = -10_000;
  return e;
}

/** Throws at (x, y) and returns the bomb. */
function throwAt(s: ReturnType<typeof armed>, x: number, y: number) {
  run(s, 1, fireAt(x, y));
  const b = s.bombs[0];
  if (!b) throw new Error('no bomb thrown');
  return b;
}

describe('bombs', () => {
  it('have the specced numbers', () => {
    expect(BOMB).toMatchObject({
      speed: 200,
      maxRange: 192,
      arcPeak: 32,
      burstRadius: 48,
      burstDamage: 12, // 041: was 15
      damageType: 'physical',
    });
    // 029: burn is gone until the fire rune brings it back as a tag.
    expect('burn' in BOMB).toBe(false);
  });

  it('land on the cursor on the first tick past distance / step (039: the flight time itself isn’t rounded)', () => {
    const s = armed();
    const b = throwAt(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    expect(b).toMatchObject({ toX: PLAYER_AT.x + 100, toY: PLAYER_AT.y });
    expect(b.flightTicks).toBeCloseTo((100 - MUZZLE_OFFSET) / STEP, 9);
    const ticks = runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(ticks).toBe(Math.ceil((100 - MUZZLE_OFFSET) / STEP));
    expect(s.events.bursts).toEqual([{ x: PLAYER_AT.x + 100, y: PLAYER_AT.y, radius: 48, damageType: 'physical' }]);
    expect(s.bombs).toHaveLength(0);
  });

  it('land 192 px along the aim when the cursor is farther', () => {
    const s = armed();
    const b = throwAt(s, PLAYER_AT.x + 300, PLAYER_AT.y + 400);
    expect(b.toX).toBeCloseTo(PLAYER_AT.x + 192 * 0.6);
    expect(b.toY).toBeCloseTo(PLAYER_AT.y + 192 * 0.8);
  });

  it('take at least one tick', () => {
    const s = armed();
    const b = throwAt(s, PLAYER_AT.x + MUZZLE_OFFSET, PLAYER_AT.y);
    expect(b.flightTicks).toBe(1);
  });

  it('arc to 32 px mid-flight and land at 0', () => {
    const s = armed();
    const b = throwAt(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    let peak = 0;
    for (let t = 1; t < b.flightTicks; t++) {
      run(s, 1);
      peak = Math.max(peak, b.height);
    }
    expect(peak).toBeGreaterThan(31);
    expect(peak).toBeLessThanOrEqual(32);
    run(s, 1);
    expect(b.height).toBe(0);
  });

  it('fly over ruin blocks and Husks', () => {
    // Below the block at (20, 10), throwing up past it.
    const at = { x: 20.5 * 32, y: 12.5 * 32 };
    const s = armed(at);
    const between = freeze(placeHusk(s, at.x, at.y - 40));
    throwAt(s, at.x, at.y - 120);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(s.events.bursts[0]?.y).toBeCloseTo(at.y - 120);
    // Its own full health (041: the tile is in the Hollows, ring 3).
    expect(between.health).toBe(defOf(between).maxHealth);
  });

  it('burst on Husks within 48 px: 12 physical damage (041: was 15), a flash, no knockback', () => {
    const s = armed();
    const target = { x: PLAYER_AT.x + 150, y: PLAYER_AT.y };
    const inside = freeze(placeHusk(s, target.x + 48, target.y));
    const outside = freeze(placeHusk(s, target.x, target.y - 48.1));
    throwAt(s, target.x, target.y);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(inside.health).toBe(HUSK.maxHealth - 12);
    expect(inside.flash).toBe(HUSK.hitFlashTicks);
    expect(inside.knockTicks).toBe(0);
    expect(outside.health).toBe(HUSK.maxHealth);
    expect(s.events.hits.find((h) => h.target === 'enemy' && h.id === inside.id)).toMatchObject({ damageType: 'physical' });
  });

  it('aggro an idle Husk they burst on', () => {
    // Bombs alone, without the enemy step, so the Husk can't aggro from being on screen.
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    throwBomb(s, 'bomb', s.player, s.player, e, [1, 0]);
    for (let t = 0; t < 60 && s.bombs.length > 0; t++) stepBombs(s);
    expect(s.events.bursts).toHaveLength(1);
    expect(e.mode).toBe('chase');
  });

  it('never hurt the player', () => {
    const s = armed();
    throwAt(s, PLAYER_AT.x + MUZZLE_OFFSET, PLAYER_AT.y);
    runUntil(s, () => s.events.bursts.length > 0, 10);
    expect(s.player.health).toBe(100);
  });
});

describe('a bomb thrown at the player', () => {
  it('ignores where the player moves to', () => {
    const s = armed();
    throwAt(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    movePlayer(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(s.player.health).toBe(100);
  });
});
