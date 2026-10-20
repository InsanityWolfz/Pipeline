import { describe, expect, it } from 'vitest';
import { enemyDef, MIN_TELEGRAPH_TICKS } from '../../src/data/enemies';
import type { ShardbackDef } from '../../src/data/hollowsEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { angleDiff } from '../../src/sim/shield';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { degrees } from '../../src/sim/summaryKinds';
import { walkTo } from './bots';
import { feed, lines } from './builds';
import { arena, fireAt, HALL, hold, movePlayer, PLAYER_AT, run, runUntil, volleyAt } from './fight';

// The Shardback (035): 034's shield rule on a small construct. Shots and punches into its
// front are blocked, from behind they land, bursts always do; it turns at most its rate,
// keeps turning through its wind-up, bashes an arc along its shield and holds its angle
// through the recovery.

const DEF = enemyDef('shardback') as ShardbackDef;
const { bash } = DEF;
const ARROW_DAMAGE = 14; // 041: was 10
const DEG = Math.PI / 180;
/** Its shield's turn in one tick, radians. */
const TURN_PER_TICK = (DEF.shield.turnDegPerSec / 60) * DEG;

function placeShardback(s: SimState, dx: number, dy = 0, angle = Math.PI): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'shardback', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL);
  e.angle = angle;
  s.enemies.push(e);
  return e;
}

/** Held still (frozen), so only the rule is tested. */
const held = (e: EnemyState): EnemyState => {
  e.frozen = 10_000;
  return e;
};

describe('the Shardback', () => {
  it("has the spec's starting values in data: a 180° shield turning 70°/s (043.1; 035 had 120°/s), faster than the Bulwark's", () => {
    expect(DEF).toMatchObject({ kind: 'shardback', boss: false, maxHealth: 70, walkSpeed: 40, shield: { arcDegrees: 180, turnDegPerSec: 70 } });
    expect(bash).toMatchObject({ triggerRange: 30, arcDegrees: 100, reach: 40, windupTicks: 40, recoverTicks: 30, cooldownTicks: 90, damage: 20, knockback: 40 });
    expect(bash.windupTicks).toBeGreaterThanOrEqual(MIN_TELEGRAPH_TICKS);
    const bulwark = enemyDef('bulwark');
    expect(DEF.shield.turnDegPerSec).toBeGreaterThan(bulwark.shield?.turnDegPerSec ?? Infinity);
  });

  it('blocks an arrow into its front for no damage, and an arrow into its back lands', () => {
    const s = arena();
    const front = held(placeShardback(s, 120, 0, Math.PI));
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y - 12));
    run(s, 20);
    expect(front.health).toBe(DEF.maxHealth);
    const t = arena();
    const back = held(placeShardback(t, 120, 0, 0));
    run(t, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y - 12));
    run(t, 20);
    expect(back.health).toBe(DEF.maxHealth - ARROW_DAMAGE);
  });

  it('makes a punch into its front do nothing, with a blocked event', () => {
    const s = arena();
    s.inventory = {};
    const e = held(placeShardback(s, 20, 0, Math.PI));
    run(s, 1, volleyAt(PLAYER_AT.x + 20, PLAYER_AT.y));
    expect(e.health).toBe(DEF.maxHealth);
    expect(s.events.blocked).toEqual([expect.objectContaining({ id: e.id })]);
  });

  it('lets a lobbed burst land on its front side', () => {
    const s = arena();
    s.inventory = { bomb: 1 };
    hold(s, 'bomb');
    const e = held(placeShardback(s, 120, 0, Math.PI));
    run(s, 1, fireAt(PLAYER_AT.x + 110, PLAYER_AT.y));
    runUntil(s, () => s.bombs.length === 0, 120);
    expect(e.health).toBeLessThan(DEF.maxHealth);
  });

  it('turns toward the player at no more than `turnDegPerSec`', () => {
    const s = arena();
    // Facing away (east) from a player to the west, out of bash range.
    const e = placeShardback(s, 200, 0, 0);
    run(s, 30);
    expect(Math.abs(angleDiff(0, e.angle))).toBeCloseTo(30 * (DEF.shield.turnDegPerSec / 60) * DEG, 6);
    expect(summarize(s).enemies[0]?.angle).toBe(degrees(e.angle));
  });

  it('bashes a player in front within reach: its damage and knockback', () => {
    const s = arena();
    const e = placeShardback(s, 24, 0, Math.PI);
    run(s, 1);
    expect(e.mode).toBe('windup');
    run(s, bash.windupTicks - 1);
    expect(s.player.health).toBe(100);
    run(s, 1);
    expect(e.mode).toBe('swipe');
    expect(s.player.health).toBe(100 - bash.damage);
    expect(s.player.knockX).toBeLessThan(0);
  });

  it('misses a player who stepped out of reach in the wind-up, or got outside its arc', () => {
    const s = arena();
    const e = placeShardback(s, 24, 0, Math.PI);
    run(s, 1);
    movePlayer(s, PLAYER_AT.x - 40, PLAYER_AT.y);
    runUntil(s, () => e.mode === 'swipe', bash.windupTicks);
    expect(s.player.health).toBe(100);
    // Behind it as the wind-up starts: its 40 ticks turn it well short of the 180° (80° at 035's 120°/s, about 47° at 70°/s).
    const t = arena();
    const f = placeShardback(t, 24, 0, Math.PI);
    run(t, 1);
    movePlayer(t, f.x + 24, f.y);
    runUntil(t, () => f.mode === 'swipe', bash.windupTicks);
    expect(Math.abs(angleDiff(f.angle, 0))).toBeGreaterThan((bash.arcDegrees / 2) * DEG);
    expect(t.player.health).toBe(100);
  });

  it('keeps turning through the wind-up and holds its angle through the recovery', () => {
    const s = arena();
    const e = placeShardback(s, 24, 0, Math.PI);
    run(s, 1);
    const start = e.angle;
    movePlayer(s, e.x, e.y + 24);
    run(s, 10);
    expect(Math.abs(angleDiff(start, e.angle))).toBeCloseTo(10 * TURN_PER_TICK, 6);
    runUntil(s, () => e.mode === 'recover', bash.windupTicks + bash.swipeTicks);
    const held = e.angle;
    movePlayer(s, e.x + 30, e.y);
    for (let t = 1; t < bash.recoverTicks; t++) {
      run(s, 1);
      expect(e.angle).toBe(held);
    }
  });

  it('leaves a window (043): a player strafing round it out of bash reach, firing arrows, lands an unblocked hit every pass', () => {
    // 70 px out (its bash reaches 40), walking at the firing pace with a lead of about 34° round it; its health is topped
    // up so it lives through the test. A pass is one full turn of the player round it. At 035's 120°/s the same strafe
    // landed no hit in any pass (measured while building 043).
    const R = 70;
    const s = arena();
    lines(s, 'arrow');
    const e = placeShardback(s, R, 0, Math.PI);
    const bearing = (): number => Math.atan2(s.player.y - e.y, s.player.x - e.x);
    let last = bearing();
    let swept = 0;
    const passes: number[] = [0];
    for (let t = 0; t < 60 * 60 && passes.length <= 3; t++) {
      feed(s);
      e.health = DEF.maxHealth;
      s.player.health = 100;
      const th = bearing();
      const goal = { x: e.x + Math.cos(th + 0.6) * R, y: e.y + Math.sin(th + 0.6) * R };
      run(s, 1, { ...walkTo(s, goal), fire: true, aimX: e.x, aimY: e.y + DEF.hurtbox.offsetY });
      const now = bearing();
      swept += Math.abs(angleDiff(last, now));
      last = now;
      passes[passes.length - 1] = (passes[passes.length - 1] ?? 0) + s.events.hits.filter((h) => h.target === 'enemy' && h.id === e.id).length;
      if (swept >= 2 * Math.PI) {
        swept -= 2 * Math.PI;
        passes.push(0);
      }
    }
    const done = passes.slice(0, 3);
    expect(done).toHaveLength(3);
    for (const hits of done) expect(hits).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic', () => {
    const go = () => {
      const s = arena();
      placeShardback(s, 100);
      run(s, 400, (st) => ({ moveX: st.tick % 100 < 50 ? 1 : -1, moveY: st.tick % 70 < 35 ? 1 : -1 }));
      return JSON.stringify(summarize(s).enemies);
    };
    expect(go()).toBe(go());
  });
});
