import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { enemyDef, type CasterDef } from '../../src/data/enemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { arena, HALL, PLAYER_AT, run, runUntil } from './fight';

const WISP = enemyDef('wisp') as CasterDef;
const { cast } = WISP;
const ORB_STEP = cast.orbSpeed / TICK_RATE;

function placeWisp(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'wisp', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

describe('the Wisp', () => {
  it('stays idle out of range and aggros within aggroRange', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + cast.aggroRange + 20, PLAYER_AT.y);
    run(s, 10);
    expect(e.mode).toBe('idle');
    e.x = PLAYER_AT.x + cast.aggroRange - 10;
    run(s, 1);
    expect(e.mode).not.toBe('idle');
  });

  it('backs away from a player who crowds it', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + 40, PLAYER_AT.y);
    run(s, 20);
    expect(e.x).toBeGreaterThan(PLAYER_AT.x + 40);
  });

  it('charges with its aim locked, then casts one orb at where the player stood', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + cast.keepAway, PLAYER_AT.y);
    runUntil(s, () => e.mode === 'windup', 30);
    const aim = { x: e.swipeDirX, y: e.swipeDirY };
    expect(aim.x).toBeCloseTo(-1);
    // The player steps aside; the aim stays locked.
    run(s, 10, { moveY: 1 });
    expect({ x: e.swipeDirX, y: e.swipeDirY }).toEqual(aim);
    runUntil(s, () => s.orbs.length > 0, cast.windupTicks);
    expect(e.mode).toBe('swipe');
    expect(s.orbs[0]).toMatchObject({ dx: aim.x, dy: aim.y, roomId: HALL });
  });

  it('waits out its cooldown between casts', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + cast.keepAway, PLAYER_AT.y);
    const casts: number[] = [];
    let count = 0;
    for (let t = 0; t < 400; t++) {
      run(s, 1);
      if (s.orbs.length > 0 && s.nextOrbId > count) {
        count = s.nextOrbId;
        casts.push(s.tick);
      }
      s.player.health = 100;
    }
    void e;
    expect(casts.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < casts.length; i++) expect((casts[i] ?? 0) - (casts[i - 1] ?? 0)).toBeGreaterThanOrEqual(cast.cooldownTicks);
  });

  it('leashes home once the player is off screen for its grace, healing there', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + cast.keepAway, PLAYER_AT.y);
    run(s, 2);
    expect(e.mode).not.toBe('idle');
    e.health = 5;
    s.player.x = PLAYER_AT.x - 700;
    // Its home is where it stands, so it settles back to idle the moment it gives up.
    const ticks = runUntil(s, () => e.mode === 'idle', 600);
    expect(ticks).toBeGreaterThanOrEqual(WISP.leashGraceTicks);
    expect(e.health).toBe(WISP.maxHealth);
  });

  it('drops one or two ley crystal', () => {
    for (const seed of [1, 2, 3, 4]) {
      const s = arena(seed);
      const e = placeWisp(s, PLAYER_AT.x + 200, PLAYER_AT.y);
      e.health = 0;
      run(s, 1);
      const crystals = s.groundItems.filter((g) => g.itemId === 'ley-crystal').length;
      expect(crystals).toBeGreaterThanOrEqual(1);
      expect(crystals).toBeLessThanOrEqual(2);
    }
  });
});

describe('orbs', () => {
  /** A hall with one orb flying left at the player from `dx` px away. */
  function orbAt(dx: number) {
    const s = arena();
    s.orbs.push({ id: s.nextOrbId++, enemyId: 'wisp', roomId: HALL, x: PLAYER_AT.x + dx, y: PLAYER_AT.y, dx: -1, dy: 0, travelled: 0 });
    return s;
  }

  it('fly at the orb speed and hit the player once for orbDamage', () => {
    const s = orbAt(60);
    run(s, 1);
    expect(s.orbs[0]?.x).toBeCloseTo(PLAYER_AT.x + 60 - ORB_STEP);
    runUntil(s, (x) => x.player.health < 100, 120);
    expect(s.player.health).toBe(100 - cast.orbDamage);
    expect(s.orbs).toEqual([]);
  });

  it('pass through a rolling player', () => {
    const s = orbAt(14);
    run(s, 1, { dodge: true, moveY: 1 });
    run(s, 10);
    expect(s.player.health).toBe(100);
  });

  it('end after orbRange', () => {
    const s = arena();
    s.orbs.push({ id: 0, enemyId: 'wisp', roomId: HALL, x: PLAYER_AT.x, y: PLAYER_AT.y - 100, dx: 1, dy: 0, travelled: cast.orbRange - ORB_STEP / 2 });
    run(s, 1);
    expect(s.orbs).toEqual([]);
  });

  it('end at a wall', () => {
    const s = arena();
    s.orbs.push({ id: 0, enemyId: 'wisp', roomId: HALL, x: 40, y: PLAYER_AT.y - 100, dx: -1, dy: 0, travelled: 0 });
    runUntil(s, (x) => x.orbs.length === 0, 30);
  });
});
