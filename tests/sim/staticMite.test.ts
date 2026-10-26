import { describe, expect, it } from 'vitest';
import { enemyDef } from '../../src/data/enemies';
import type { MiteDef } from '../../src/data/stormcrownEnemies';
import { createEnemy, damageEnemy, type EnemyState } from '../../src/sim/enemies';
import { linkTrios } from '../../src/sim/miteAi';
import { spawnDrops } from '../../src/sim/drops';
import { rollChampions } from '../../src/sim/champions';
import { createRng } from '../../src/sim/rng';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, PLAYER_AT, placeHusk, run, runUntil } from './fight';

// Static mites (065): trios that wake together; each runs at the player, winds up a red pulse under it at contact and
// zaps a player inside (a roll dodges), then backs off. Killed, a mite discharges lightning into every other mite near
// it, which can kill them in turn, chaining, and never hurts the player or another kind. A mite drops a third as often.

const DEF = enemyDef('static-mite') as MiteDef;
const { zap, discharge } = DEF;

function placeMite(s: SimState, dx: number, dy = 0): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'static-mite', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y + dy }, HALL, 'pack');
  s.enemies.push(e);
  return e;
}

describe('the static mite', () => {
  it("has the spec's starting values", () => {
    expect(DEF).toMatchObject({ kind: 'mite', boss: false, maxHealth: 12, walkSpeed: 90, xp: 3, swarm: 3, dropShare: 1 / 3 });
    expect(zap).toMatchObject({ triggerRange: 16, radius: 20, windupTicks: 30, recoverTicks: 40, cooldownTicks: 60, damage: 8, knockback: 8 });
    expect(discharge).toEqual({ radius: 40, damage: 12 });
  });

  it('links a pack’s mites into trios, in order, and a trio wakes together', () => {
    const s = arena();
    const mites = [placeMite(s, 600), placeMite(s, 260, 150), placeMite(s, 640), placeMite(s, 660), placeMite(s, 680), placeMite(s, 700)];
    const husk = placeHusk(s, PLAYER_AT.x + 620, PLAYER_AT.y);
    linkTrios(s.enemies);
    expect(mites.map((m) => m.trio)).toEqual([mites[0]?.id, mites[0]?.id, mites[0]?.id, mites[3]?.id, mites[3]?.id, mites[3]?.id]);
    expect(husk.trio).toBe(-1);
    // Only the second is in view; its trio wakes with it, the other trio sleeps.
    run(s, 2);
    expect(mites.map((m) => m.mode)).toEqual(['chase', 'chase', 'chase', 'idle', 'idle', 'idle']);
  });

  it('runs at the player and, at contact, stops and winds up its pulse, then zaps a player inside with knockback', () => {
    const s = arena();
    const e = placeMite(s, 80);
    runUntil(s, () => e.mode === 'windup', 60);
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeLessThanOrEqual(zap.triggerRange);
    expect(summarize(s).enemies[0]?.pulse).toEqual({ radius: zap.radius, ticks: 1 });
    const at = { x: e.x, y: e.y };
    runUntil(s, (x) => x.events.zaps.length > 0, zap.windupTicks + 2);
    expect({ x: e.x, y: e.y }).toEqual(at);
    expect(s.player.health).toBe(100 - zap.damage);
    expect(s.player.knockX).toBeLessThan(0);
  });

  it('misses a player outside its pulse, and a rolling one', () => {
    const s = arena();
    const e = placeMite(s, 14);
    runUntil(s, () => e.mode === 'windup', 5);
    run(s, 10, { moveX: -1 });
    runUntil(s, (x) => x.events.zaps.length > 0, zap.windupTicks);
    expect(s.player.health).toBe(100);
    const r = arena();
    const m = placeMite(r, 14);
    runUntil(r, () => m.mode === 'windup', 5);
    run(r, zap.windupTicks - 6);
    runUntil(r, (x) => x.events.zaps.length > 0, 10, { dodge: true, moveY: 1 });
    expect(r.player.health).toBe(100);
  });

  it('backs off after its zap, then runs in again once its cooldown (from the wind-up’s start) is up', () => {
    const s = arena();
    const e = placeMite(s, 14);
    runUntil(s, (x) => x.events.zaps.length > 0, zap.windupTicks + 5);
    s.player.hurtTicks = 0;
    runUntil(s, () => e.mode === 'recover', zap.swipeTicks + 2);
    const near = Math.hypot(e.x - s.player.x, e.y - s.player.y);
    run(s, 20);
    expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeGreaterThan(near + 20);
    runUntil(s, () => e.mode === 'windup', zap.recoverTicks + 120);
  });

  it('discharges as it dies into every other mite within its radius, killing them in a chain, never the player or another kind', () => {
    const s = arena();
    const a = placeMite(s, 200);
    const b = placeMite(s, 235);
    const c = placeMite(s, 270);
    const far = placeMite(s, 360);
    const husk = placeHusk(s, PLAYER_AT.x + 220, PLAYER_AT.y + 10);
    for (const e of s.enemies) e.frozen = 100;
    s.player.x = PLAYER_AT.x + 200;
    damageEnemy(s, a, 100, 1, 0);
    run(s, 1);
    expect(s.enemies).not.toContain(a);
    expect(s.enemies).not.toContain(b);
    expect(s.enemies).not.toContain(c);
    expect(s.enemies).toContain(far);
    expect(husk.health).toBe(enemyDef('husk').maxHealth);
    expect(s.player.health).toBe(100);
    expect(s.events.discharges.map((d) => [d.id, d.hit.map((h) => h.id)])).toEqual([
      [a.id, [b.id]],
      [b.id, [c.id]],
      [c.id, []],
    ]);
    expect(s.events.deaths.map((d) => d.id)).toEqual([a.id, b.id, c.id]);
  });

  it('drops at all only a third as often as a hawk (its whole drop)', () => {
    const s = arena();
    const count = (id: string) => {
      s.groundItems = [];
      for (let i = 0; i < 600; i++) spawnDrops(s, enemyDef(id), PLAYER_AT.x, PLAYER_AT.y, HALL);
      return s.groundItems.filter((g) => g.itemId === 'stormglass').length;
    };
    const hawk = count('thunderhawk');
    const mite = count('static-mite');
    expect(hawk).toBe(600);
    expect(mite / hawk).toBeGreaterThan(0.27);
    expect(mite / hawk).toBeLessThan(0.4);
  });

  it('makes a champion mite’s whole trio champions', () => {
    const s = arena();
    for (let seed = 1; seed < 60; seed++) {
      const pack = [placeMite(s, 0), placeMite(s, 10), placeMite(s, 20), createEnemy(s.nextEnemyId++, 'thunderhawk', PLAYER_AT, HALL)];
      linkTrios(pack);
      const pick = rollChampions(createRng(seed), pack, 4);
      if (pick?.enemyId !== 'static-mite') continue;
      expect(pack.slice(0, 3).every((m) => m.champion !== null)).toBe(true);
      expect(pack[3]?.champion).toBeNull();
      return;
    }
    throw new Error('no seed made a champion mite');
  });
});
