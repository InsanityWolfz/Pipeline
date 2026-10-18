import { describe, expect, it } from 'vitest';
import { lobAmmo } from '../../src/data/ammo';
import { TICK_RATE } from '../../src/data/config';
import { MUZZLE_OFFSET } from '../../src/data/tube';
import { stepBombs, throwBomb } from '../../src/sim/bombs';
import type { EnemyState } from '../../src/sim/enemies';
import { arena, fireAt, HUSK, loadFull, movePlayer, placeHusk, PLAYER_AT, run, runUntil } from './fight';

const BOMB = lobAmmo('bomb');
const STEP = BOMB.speed / TICK_RATE;

function armed(at: { x: number; y: number } = PLAYER_AT) {
  const s = arena(undefined, at);
  s.inventory.bomb = 6;
  run(s, 1, { selectAmmo: 'bomb' });
  loadFull(s);
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
      burstRadius: 32,
      burstDamage: 15,
      burn: { damage: 3, everyTicks: 30, times: 4 },
      damageType: 'fire',
    });
  });

  it('land on the cursor after ceil(distance / step) ticks', () => {
    const s = armed();
    const b = throwAt(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    expect(b).toMatchObject({ toX: PLAYER_AT.x + 100, toY: PLAYER_AT.y });
    expect(b.flightTicks).toBe(Math.ceil((100 - MUZZLE_OFFSET) / STEP));
    const ticks = runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(ticks).toBe(b.flightTicks);
    expect(s.events.bursts).toEqual([{ x: PLAYER_AT.x + 100, y: PLAYER_AT.y, radius: 32 }]);
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
    expect(between.health).toBe(HUSK.maxHealth);
  });

  it('burst on Husks within 32 px: 15 fire damage, a flash, no knockback', () => {
    const s = armed();
    const target = { x: PLAYER_AT.x + 150, y: PLAYER_AT.y };
    const inside = freeze(placeHusk(s, target.x + 32, target.y));
    const outside = freeze(placeHusk(s, target.x, target.y - 32.1));
    throwAt(s, target.x, target.y);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(inside.health).toBe(HUSK.maxHealth - 15);
    expect(inside.flash).toBe(HUSK.hitFlashTicks);
    expect(inside.knockTicks).toBe(0);
    expect(outside.health).toBe(HUSK.maxHealth);
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

describe('burns', () => {
  /** A Husk standing where a bomb just burst. */
  function burning() {
    const s = armed();
    const e = freeze(placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y + 100));
    throwAt(s, e.x, e.y);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    return { s, e };
  }

  /** Damage dealt to `id` on each of the next `ticks` ticks, by tick. */
  function damageByTick(s: ReturnType<typeof armed>, id: number, ticks: number): number[] {
    const at: number[] = [];
    for (let t = 1; t <= ticks; t++) {
      run(s, 1);
      if (s.events.hits.some((h) => h.target === 'enemy' && h.id === id)) at.push(t);
    }
    return at;
  }

  it('deal 3 every 30 ticks, 4 times, then stop', () => {
    const { s, e } = burning();
    expect(e.burnTicks).toBe(120);
    expect(damageByTick(s, e.id, 200)).toEqual([30, 60, 90, 120]);
    expect(e.health).toBe(HUSK.maxHealth - 15 - 12);
    expect(e.burnTicks).toBe(0);
  });

  it('restart on a second burst instead of stacking', () => {
    const { s, e } = burning();
    run(s, 45);
    throwAt(s, e.x, e.y);
    runUntil(s, () => s.events.bursts.length > 0, 100);
    expect(e.burnTicks).toBe(120);
  });

  it('can kill, and the Husk drops loot', () => {
    const { s, e } = burning();
    e.health = 3;
    runUntil(s, () => s.events.deaths.length > 0, 31);
    expect(s.events.deaths[0]?.id).toBe(e.id);
    expect(s.groundItems.length).toBeGreaterThan(0);
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
