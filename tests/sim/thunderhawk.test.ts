import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { HawkDef } from '../../src/data/stormcrownEnemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, PLAYER_AT, placeHusk, run, runUntil } from './fight';

// The thunderhawk (065): it circles the player at its orbit, turning no faster than its turn rate; with its cooldown
// ready it marks a dive line through the player's feet, locked at the wind-up's start, dives down it (one hit, with
// knockback; a sidestep dodges), and climbs away to its orbit. Flight itself (over terrain, arenas, safe zones,
// separation, drops) is in flight.test.ts; homing tracking it there too.

const DEF = enemyDef('thunderhawk') as HawkDef;
const { dive, orbit } = DEF;

function placeHawk(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'thunderhawk', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

const dist = (s: SimState, e: EnemyState) => Math.hypot(e.x - s.player.x, e.y - s.player.y);

describe('the thunderhawk', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'hawk', flies: true, boss: false, maxHealth: 40, walkSpeed: 110, xp: 8 });
    expect(orbit).toEqual({ radius: 160, turnDegPerSec: 180, pull: 1.5 });
    expect(dive).toMatchObject({ distance: 260, width: 20, speed: 480, windupTicks: 45, recoverTicks: 60, cooldownTicks: 210, damage: 24, knockback: 32 });
  });

  it('circles the player at about its orbit, its heading turning no faster than its turn rate', () => {
    const s = arena();
    const e = placeHawk(s, 300);
    e.cooldown = 100_000;
    run(s, 1);
    const max = orbit.turnDegPerSec / 60 + 1e-6;
    const seen: number[] = [];
    let last = e.angle;
    let swept = 0;
    let bearing = Math.atan2(e.y - s.player.y, e.x - s.player.x);
    for (let t = 0; t < 900; t++) {
      run(s, 1);
      const turn = (Math.abs(Math.atan2(Math.sin(e.angle - last), Math.cos(e.angle - last))) * 180) / Math.PI;
      expect(turn).toBeLessThanOrEqual(max);
      last = e.angle;
      if (t >= 300) {
        seen.push(dist(s, e));
        const b = Math.atan2(e.y - s.player.y, e.x - s.player.x);
        swept += Math.atan2(Math.sin(b - bearing), Math.cos(b - bearing));
      }
      bearing = Math.atan2(e.y - s.player.y, e.x - s.player.x);
    }
    expect(Math.min(...seen)).toBeGreaterThan(orbit.radius * 0.75);
    expect(Math.max(...seen)).toBeLessThan(orbit.radius * 1.25);
    // It goes round, not back and forth: most of a lap in 10 s.
    expect(Math.abs(swept)).toBeGreaterThan(Math.PI);
    expect(e.mode).toBe('chase');
  });

  it('marks its dive line through the player’s feet, locked at the wind-up’s start, and holds still to mark it', () => {
    const s = arena();
    const e = placeHawk(s, 150, 40);
    runUntil(s, () => e.mode === 'windup', 5);
    const at = { x: e.x, y: e.y };
    const lane = summarize(s).enemies[0]?.lane;
    const d = Math.hypot(150, 40);
    expect(lane).toMatchObject({ length: dive.distance, width: dive.width });
    expect(lane?.dx).toBeCloseTo(-150 / d, 2);
    expect(lane?.dy).toBeCloseTo(-40 / d, 2);
    run(s, 20, { moveY: -1 });
    expect({ x: e.x, y: e.y }).toEqual(at);
    expect(summarize(s).enemies[0]?.lane).toEqual(lane);
  });

  it('dives once down the line, hitting a player who stays for its damage with knockback along it, then climbs away', () => {
    const s = arena();
    const e = placeHawk(s, 150);
    runUntil(s, () => e.mode === 'windup', 5);
    let hits = 0;
    let dives = 0;
    runUntil(
      s,
      (x) => {
        hits += x.events.hits.filter((h) => h.target === 'player').length;
        dives += x.events.dives.length;
        return e.mode === 'recover';
      },
      dive.windupTicks + dive.swipeTicks + 5,
    );
    expect(dives).toBe(1);
    expect(hits).toBe(1);
    expect(s.player.health).toBe(100 - dive.damage);
    expect(s.player.knockX).toBeLessThan(0);
    // It ran on past the player down the line.
    expect(e.x).toBeLessThan(PLAYER_AT.x);
    // Climbing away it flies on, and dives again only once its cooldown (from the wind-up's start) is up.
    const climb = { x: e.x, y: e.y };
    run(s, 10);
    expect(Math.hypot(e.x - climb.x, e.y - climb.y)).toBeGreaterThan(10);
    expect(e.mode).toBe('recover');
    runUntil(s, () => e.mode === 'chase', dive.recoverTicks);
    expect(e.cooldown).toBeGreaterThan(0);
  });

  it('misses a player who sidesteps the line during the wind-up', () => {
    const s = arena();
    const e = placeHawk(s, 150);
    runUntil(s, () => e.mode === 'windup', 5);
    run(s, 30, { moveY: 1 });
    let hits = 0;
    runUntil(
      s,
      (x) => {
        hits += x.events.hits.filter((h) => h.target === 'player').length;
        return e.mode === 'recover';
      },
      dive.windupTicks + dive.swipeTicks + 5,
    );
    expect(hits).toBe(0);
    expect(s.player.health).toBe(100);
  });

  it('dives through enemies in its way', () => {
    const s = arena();
    const e = placeHawk(s, 150);
    const husk = placeHusk(s, PLAYER_AT.x + 75, PLAYER_AT.y);
    husk.frozen = 10_000;
    runUntil(s, () => e.mode === 'swipe', dive.windupTicks + 5);
    runUntil(s, () => e.mode === 'recover', dive.swipeTicks + 2);
    expect(e.x).toBeLessThan(PLAYER_AT.x);
    expect(husk.x).toBeCloseTo(PLAYER_AT.x + 75);
  });

  it('waits its cooldown from the wind-up’s start between dives', () => {
    const s = arena();
    const e = placeHawk(s, 150);
    const starts: number[] = [];
    for (let t = 0; t < 500 && starts.length < 2; t++) {
      const before = e.mode;
      run(s, 1);
      if (e.mode === 'windup' && before !== 'windup') starts.push(s.tick);
      // Keep the player standing.
      s.player.health = 100;
    }
    expect(starts).toHaveLength(2);
    expect((starts[1] ?? 0) - (starts[0] ?? 0)).toBe(dive.cooldownTicks);
  });

  it('starts a dive only with the player within its line’s length', () => {
    const s = arena();
    const e = placeHawk(s, dive.distance + 40);
    run(s, 1);
    expect(e.mode).toBe('chase');
    expect(dist(s, e)).toBeGreaterThan(dive.distance);
  });
});
