import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { COLD } from '../../src/data/tags';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { summarize } from '../../src/sim/summary';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, HUSK, placeHusk, PLAYER_AT, run, runUntil } from './fight';

// Cold (029): each cold hit adds a chill stack that slows; the hit that reaches
// COLD.stacksToFreeze freezes the enemy; after a thaw it can't gain stacks for a while.

const COLD_HIT = { knock: 0, flash: false, damageType: 'cold' } as const;

/** One cold hit of 1 damage. */
const chillHit = (s: SimState, e: EnemyState): void => damageEnemy(s, e, 1, 0, 0, COLD_HIT);

/** A Husk chasing the player from 200 px to the right. */
function chaser(): { s: SimState; e: EnemyState } {
  const s = arena();
  const e = placeHusk(s, PLAYER_AT.x + 200, PLAYER_AT.y);
  run(s, 2);
  expect(e.mode).toBe('chase');
  return { s, e };
}

const speed = (e: EnemyState): number => Math.hypot(e.vx, e.vy);
const WALK = HUSK.walkSpeed / TICK_RATE;

describe('cold', () => {
  it('3 hits slow a Husk by 45%', () => {
    const { s, e } = chaser();
    expect(speed(e)).toBeCloseTo(WALK);
    for (let i = 0; i < 3; i++) chillHit(s, e);
    expect(e.chill).toBe(3);
    run(s, 1);
    expect(speed(e)).toBeCloseTo(WALK * (1 - 3 * COLD.slowPerStack));
    expect(speed(e)).toBeCloseTo(WALK * 0.55);
  });

  it('the 4th hit freezes it for 90 ticks: it stands still, and still takes damage and knockback (the wind-up test shows it holds its attack)', () => {
    const { s, e } = chaser();
    for (let i = 0; i < 4; i++) chillHit(s, e);
    expect(e.frozen).toBe(90);
    expect(e.chill).toBe(0);
    expect(s.events.freezes).toEqual([{ id: e.id, x: e.x, y: e.y }]);
    const at = { x: e.x, y: e.y };
    run(s, 89);
    expect({ x: e.x, y: e.y }).toEqual(at);
    expect(e.frozen).toBe(1);
    damageEnemy(s, e, 5, -1, 0);
    expect(e.knockTicks).toBe(HUSK.hitKnockTicks);
    run(s, 1);
    expect(e.x).toBeLessThan(at.x);
    expect(e.frozen).toBe(0);
    expect(s.events.thaws).toEqual([{ id: e.id, x: e.x, y: e.y }]);
    // Thawed: it chases again.
    run(s, 10);
    expect(speed(e)).toBeGreaterThan(0);
  });

  it('a boss freezes for 45 ticks, and takes no Knockback while frozen (039: a boss weighs 0 at any time)', () => {
    const s = arena();
    const w = createEnemy(s.nextEnemyId++, 'pylon-warden', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, s.roomId);
    s.enemies.push(w);
    for (let i = 0; i < 4; i++) chillHit(s, w);
    expect(w.frozen).toBe(45);
    damageEnemy(s, w, 5, -1, 0);
    expect(w.knockTicks).toBe(0);
  });

  it('a wind-up in progress pauses, and resumes when it thaws', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    runUntil(s, () => e.mode === 'windup' && e.modeTicks === 10, 60);
    for (let i = 0; i < 4; i++) chillHit(s, e);
    run(s, 90);
    expect([e.mode, e.modeTicks]).toEqual(['windup', 10]);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect([e.mode, e.modeTicks]).toEqual(['windup', 11]);
    // The swipe lands once the rest of the wind-up has run.
    runUntil(s, () => s.player.health < 100, HUSK.swipe.windupTicks);
  });

  it('gains no stacks for 120 ticks after a thaw', () => {
    const { s, e } = chaser();
    for (let i = 0; i < 4; i++) chillHit(s, e);
    run(s, 90);
    expect(e.frozen).toBe(0);
    expect(e.refreeze).toBe(COLD.refreezeTicks);
    chillHit(s, e);
    expect(e.chill).toBe(0);
    run(s, COLD.refreezeTicks - 1);
    chillHit(s, e);
    expect(e.chill).toBe(0);
    run(s, 1);
    chillHit(s, e);
    expect(e.chill).toBe(1);
  });

  it('a frozen enemy gains no stacks', () => {
    const { s, e } = chaser();
    for (let i = 0; i < 4; i++) chillHit(s, e);
    chillHit(s, e);
    expect([e.chill, e.frozen]).toEqual([0, 90]);
  });

  it('chill runs out 120 ticks after the last cold hit, and the stacks drop to 0', () => {
    const { s, e } = chaser();
    chillHit(s, e);
    run(s, 60);
    chillHit(s, e);
    expect(e.chill).toBe(2);
    run(s, 119);
    expect(e.chill).toBe(2);
    run(s, 1);
    expect(e.chill).toBe(0);
    // The chill drops at the end of that tick, so the next tick's walk is full speed.
    run(s, 1);
    expect(speed(e)).toBeCloseTo(WALK);
  });

  it('physical hits never chill', () => {
    const { s, e } = chaser();
    damageEnemy(s, e, 1, 0, 0);
    expect(e.chill).toBe(0);
  });

  it('frost arrows chill what they hit, and the summary shows chill and frozen', () => {
    const s = arena();
    s.inventory = { 'arrow+frost': 10 };
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(PLAYER_AT.x + 1000, PLAYER_AT.y));
    expect(s.arrows[0]?.ammoId).toBe('arrow+frost');
    runUntil(s, () => s.events.hits.length > 0, 30);
    expect(s.events.hits[0]).toMatchObject({ id: e.id, damageType: 'cold', damage: 14 }); // 041: was 10
    expect(e.chill).toBe(1);
    expect(summarize(s).enemies.find((x) => x.id === e.id)).toMatchObject({ chill: 1, frozen: 0 });
    expect(e.health).toBe(HUSK.maxHealth - 14);
  });
});
