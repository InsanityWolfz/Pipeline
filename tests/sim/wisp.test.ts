import { describe, expect, it } from 'vitest';
import { TICK_RATE, VIEW_WIDTH } from '../../src/data/config';
import { castWakes } from '../../src/sim/casterAi';
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
  it('stays idle off screen and wakes as soon as it is on screen (045: like other enemies, 017)', () => {
    expect(cast.wake).toBe('screen');
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + VIEW_WIDTH / 2 + 20, PLAYER_AT.y);
    run(s, 10);
    expect(e.mode).toBe('idle');
    // At the screen's right edge, far past aggroRange: it wakes on the next tick.
    e.x = PLAYER_AT.x + VIEW_WIDTH / 2 - 10;
    expect(e.x - PLAYER_AT.x).toBeGreaterThan(cast.aggroRange);
    run(s, 1);
    expect(e.mode).not.toBe('idle');
  });

  it('wakes at the left edge too, then closes in rather than standing still', () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x - VIEW_WIDTH / 2 + 10, PLAYER_AT.y);
    const x0 = e.x;
    run(s, 30);
    expect(e.mode).not.toBe('idle');
    expect(e.x).toBeGreaterThan(x0);
  });

  it("a range-woken caster (wake: 'range') still waits for aggroRange", () => {
    const s = arena();
    const e = placeWisp(s, PLAYER_AT.x + cast.aggroRange + 20, PLAYER_AT.y);
    const def: CasterDef = { ...WISP, cast: { ...cast, wake: 'range' } };
    expect(castWakes(s, e, def)).toBe(false);
    e.x = PLAYER_AT.x + cast.aggroRange - 10;
    expect(castWakes(s, e, def)).toBe(true);
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
