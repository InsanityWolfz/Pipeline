import { describe, expect, it } from 'vitest';
import { chainLines, chainSegments, lashLine } from '../../src/sim/conductorAi';
import { hitRod, rodPoint } from '../../src/sim/conductorRods';
import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { movePlayer, run } from './fight';
import { CONDUCTOR, spire, SPIRE_MIDDLE, topUp } from './spire';

// The Conductor's attacks (064), picked in data order with their own cooldowns: the arc lash (a line from its rod to
// the player, locked as its 45-tick wind-up starts, 50 with knockback on it), the storm call (068: 5 circles of 40 px on and
// round the player, striking after 60 ticks for 40) and the rod chain (lines between neighbouring standing rods, a
// 60-tick wind-up, then 30 ticks of lightning dealing 45 on a line).

const PHYSICAL = { knock: 0, flash: true, damageType: 'physical' } as const;

/** Only `attack` ready (the others held off), and no blink. */
function only(c: EnemyState, attack: number): void {
  c.conductor.attackCooldowns = [1e6, 1e6, 1e6].map((v, i) => (i === attack ? 0 : v));
  c.conductor.blinkCooldown = 1e6;
}

const health = (s: SimState): number => s.player.health;

describe('the arc lash', () => {
  it('locks its line from its rod toward the player as the wind-up starts, then hits 50 with knockback on it', () => {
    const { s, c } = spire(40);
    only(c, 0);
    run(s, 1);
    expect([c.conductor.attack, c.mode]).toEqual([0, 'windup']);
    expect(s.events.conductorWindups).toEqual([{ id: c.id, attack: 0 }]);
    const line = lashLine(c, CONDUCTOR);
    const o = rodPoint(c.conductor.rod);
    expect([line.x0, line.y0]).toEqual([o.x, o.y]);
    // Still on the locked line at the end (it doesn't track): the player hasn't moved.
    const before = health(s);
    run(s, CONDUCTOR.lash.windupTicks - 1);
    expect(health(s)).toBe(before);
    run(s, 1);
    expect(s.events.lashes).toHaveLength(1);
    expect(health(s)).toBe(before - 50);
    expect(s.player.knockTicks).toBeGreaterThan(0);
  });

  it('misses a player who stepped off the line during the wind-up', () => {
    const { s, c } = spire(40);
    only(c, 0);
    run(s, 1);
    const line = lashLine(c, CONDUCTOR);
    // Square off the line, 60 px.
    const len = Math.hypot(line.x1 - line.x0, line.y1 - line.y0);
    movePlayer(s, s.player.x - ((line.y1 - line.y0) / len) * 60, s.player.y + ((line.x1 - line.x0) / len) * 60);
    const before = health(s);
    run(s, CONDUCTOR.lash.windupTicks + 2);
    expect(s.events.lashes.length + health(s)).toBe(before);
  });
});

describe('the storm call', () => {
  it('calls 5 circles of 40 px (068), one on the player and four round them at the same spread, each striking after 60 ticks for 40', () => {
    const { s, c } = spire(40);
    only(c, 1);
    run(s, 1);
    expect(s.strikes).toHaveLength(5);
    const p = s.player;
    const spread = CONDUCTOR.call.spread;
    expect(spread).toBe(64);
    expect(s.strikes.map((k) => Math.round(Math.hypot(k.x - p.x, k.y - p.y)))).toEqual([0, spread, spread, spread, spread]);
    // The four round the player sit a quarter turn apart.
    const at = s.strikes.slice(1).map((k) => Math.atan2(k.y - p.y, k.x - p.x));
    for (const [i, a] of at.slice(1).entries()) expect(Math.abs(Math.cos(a - (at[i] ?? 0)))).toBeLessThan(1e-9);
    // Called down as the wind-up starts, a tick already gone: they land as it ends.
    expect(s.strikes.every((k) => k.r === 40 && k.damage === 40 && k.delayTicks === 60 && k.delay === 59)).toBe(true);
    const before = health(s);
    run(s, 58);
    expect(health(s)).toBe(before);
    expect(s.strikes).toHaveLength(5);
    run(s, 1);
    expect(s.strikes).toHaveLength(0);
    expect(s.events.strikes).toHaveLength(5);
    expect(health(s)).toBe(before - 40);
  });

  it('misses a player who walked out of every circle', () => {
    const { s, c } = spire(40);
    only(c, 1);
    run(s, 1);
    movePlayer(s, SPIRE_MIDDLE.x - 200, SPIRE_MIDDLE.y + 100);
    const before = health(s);
    run(s, 61);
    expect(health(s)).toBe(before);
  });
});

describe('the rod chain', () => {
  it('runs along neighbouring standing rods only', () => {
    const { s, c } = spire();
    expect(chainLines(c)).toBe(0b111111);
    hitRod(s, c, 1, 200, PHYSICAL);
    // Pairs (0,1) and (1,2) go with rod 1.
    expect(chainLines(c)).toBe(0b111100);
  });

  it('a 60-tick wind-up, then 30 ticks of lightning dealing 45 to a player on a line, once', () => {
    const a = rodPoint(0);
    const b = rodPoint(1);
    const { s, c } = spire();
    movePlayer(s, (a.x + b.x) / 2, (a.y + b.y) / 2);
    only(c, 2);
    run(s, 1);
    expect([c.conductor.attack, c.conductor.chainMask]).toEqual([2, 0b111111]);
    expect(chainSegments(c)).toHaveLength(6);
    const before = health(s);
    run(s, CONDUCTOR.chain.windupTicks - 1);
    expect(health(s)).toBe(before);
    run(s, 1);
    expect(s.events.chains).toHaveLength(1);
    expect(health(s)).toBe(before - 45);
    run(s, CONDUCTOR.chain.activeTicks, (x) => {
      x.player.hurtTicks = 0;
      return {};
    });
    expect(health(s)).toBe(before - 45);
  });

  it('misses a player off every line, and a line whose rod breaks goes dead', () => {
    const a = rodPoint(0);
    const b = rodPoint(1);
    const { s, c } = spire();
    movePlayer(s, (a.x + b.x) / 2, (a.y + b.y) / 2);
    only(c, 2);
    run(s, 1);
    hitRod(s, c, 1, 200, PHYSICAL);
    const before = health(s);
    run(s, CONDUCTOR.chain.windupTicks + CONDUCTOR.chain.activeTicks);
    expect(health(s)).toBe(before);
    expect(c.conductor.chainMask & 0b11).toBe(0);
  });
});

describe('picking attacks', () => {
  it('makes them in data order, each on its own cooldown', () => {
    const { s, c } = spire(60);
    c.conductor.blinkCooldown = 1e6;
    const order: number[] = [];
    for (let t = 0; t < 900; t++) {
      topUp(s);
      run(s, 1);
      for (const w of s.events.conductorWindups) order.push(w.attack);
      c.conductor.blinkCooldown = 1e6;
    }
    expect(order.slice(0, 2)).toEqual([0, 1]);
    expect(new Set(order)).toEqual(new Set([0, 1, 2]));
    // The lash comes round again before the chain's long cooldown is out.
    expect(order.filter((x) => x === 0).length).toBeGreaterThan(order.filter((x) => x === 2).length);
  });

  it('doesn’t attack during a blink’s warning', () => {
    const { s, c } = spire(60);
    c.conductor.attackCooldowns = [1e6, 1e6, 1e6];
    run(s, 1);
    c.conductor.blinkCooldown = 1;
    run(s, 1);
    expect(c.conductor.blinkTo).toBeGreaterThanOrEqual(0);
    c.conductor.attackCooldowns = [0, 0, 0];
    run(s, CONDUCTOR.blink.warnTicks - 1);
    expect(s.events.conductorWindups).toEqual([]);
    expect(c.conductor.attack).toBe(-1);
  });
});
