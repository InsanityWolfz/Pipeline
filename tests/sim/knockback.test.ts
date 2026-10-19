import { describe, expect, it } from 'vitest';
import { straightAmmo } from '../../src/data/ammo';
import { BOSS_WEIGHT } from '../../src/data/combat';
import { enemyDef } from '../../src/data/enemies';
import { createArrow } from '../../src/sim/arrows';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, PLAYER_AT, run, runUntil } from './fight';

// Knockback on rounds (039, Q11): each arrow and ley-bolt round carries a push (6 px), its
// Shards carry it too, Bursts push nothing. A hit pushes `knockback × weight` px over the
// enemy's hitKnockTicks. Every non-boss is pushed exactly as far as before; a boss weighs 0.

const WEIGHTS: Readonly<Record<string, number>> = { husk: 1, wisp: 4 / 3, charger: 1 / 2, burrower: 1, shardback: 1 / 3, sniper: 1, 'pylon-warden': 0, bulwark: 0 };
/** Each enemy's push from an arrow before 039 (its old hitKnockback), but the Warden's 1 px. */
const BEFORE: Readonly<Record<string, number>> = { husk: 6, wisp: 8, charger: 3, burrower: 6, shardback: 2, sniper: 6, bulwark: 0 };

/** The push an enemy, frozen in place, takes from one `ammoId` round flying into it from the left. */
function push(enemyId: string, ammoId: string): { push: number; ticks: number; e: EnemyState; s: SimState } {
  const s = arena();
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + 120, y: PLAYER_AT.y }, HALL);
  e.frozen = 10_000;
  // A shielded enemy turned away, so the round meets its back (034).
  e.angle = 0;
  s.enemies.push(e);
  s.arrows.push(createArrow(s.nextArrowId++, ammoId, s.roomId, PLAYER_AT.x + 40, PLAYER_AT.y + enemyDef(enemyId).hurtbox.offsetY, 1, 0));
  runUntil(s, () => s.events.hits.length > 0, 60);
  return { push: Math.hypot(e.knockX, e.knockY) * e.knockTicks, ticks: e.knockTicks, e, s };
}

describe('Knockback on rounds (039)', () => {
  it('arrows and ley bolts carry 6 px', () => {
    expect(straightAmmo('arrow').knockback).toBe(6);
    expect(straightAmmo('ley-bolt').knockback).toBe(6);
    expect(BOSS_WEIGHT).toBe(0);
  });

  it('every enemy has its weight, bosses 0', () => {
    for (const [id, w] of Object.entries(WEIGHTS)) expect(enemyDef(id).weight, id).toBeCloseTo(w, 12);
    for (const id of ['pylon-warden', 'bulwark']) expect(enemyDef(id).boss, id).toBe(true);
  });

  it('every non-boss is pushed exactly as far as before, by an arrow and by a ley bolt', () => {
    for (const [id, px] of Object.entries(BEFORE)) {
      if (id === 'bulwark') continue;
      for (const ammo of ['arrow', 'ley-bolt']) {
        const r = push(id, ammo);
        expect(r.push, `${id} by ${ammo}`).toBeCloseTo(px, 9);
        expect(r.ticks, id).toBe(enemyDef(id).hitKnockTicks);
      }
    }
  });

  it('changed: the Pylon Warden isn’t pushed (it took 1 px), frozen or not; the Bulwark isn’t either', () => {
    expect(push('pylon-warden', 'arrow').push).toBe(0);
    expect(push('bulwark', 'arrow').push).toBe(0);
  });

  it('a Split’s Shards carry their bolt’s Knockback; a Burst pushes nothing', () => {
    const s = arena();
    s.inventory = { 'ley-bolt+split': 2, bomb: 2 };
    const target = createEnemy(s.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 100, y: PLAYER_AT.y }, HALL);
    target.frozen = 10_000;
    s.enemies.push(target);
    run(s, 1, { selectAmmo: 'ley-bolt' });
    run(s, 1, { fire: true, aimX: PLAYER_AT.x + 1000, aimY: PLAYER_AT.y });
    runUntil(s, () => s.arrows.some((a) => a.ammoId === 'shard'), 60);
    for (const sh of s.arrows.filter((a) => a.ammoId === 'shard')) expect(sh.knockback).toBe(6);
    const b = arena();
    b.inventory = { bomb: 2 };
    const near = createEnemy(b.nextEnemyId++, 'husk', { x: PLAYER_AT.x + 100, y: PLAYER_AT.y }, HALL);
    near.frozen = 10_000;
    b.enemies.push(near);
    run(b, 1, { selectAmmo: 'bomb' });
    run(b, 1, { fire: true, aimX: PLAYER_AT.x + 90, aimY: PLAYER_AT.y });
    runUntil(b, () => b.events.bursts.length > 0, 60);
    expect(near.knockTicks).toBe(0);
  });
});

describe('getState (039)', () => {
  it('reports each enemy’s weight and stunned, and each shot’s keywords', () => {
    const s = arena();
    s.enemies.push(createEnemy(s.nextEnemyId++, 'wisp', { x: PLAYER_AT.x + 200, y: PLAYER_AT.y }, HALL));
    s.inventory = { arrow: 3 };
    run(s, 1, { selectAmmo: 'arrow' });
    run(s, 1, { fire: true, aimX: PLAYER_AT.x + 1000, aimY: PLAYER_AT.y });
    const sum = summarize(s);
    expect(sum.enemies[0]).toMatchObject({ weight: 4 / 3, stunned: 0, chill: 0, frozen: 0 });
    expect(sum.arrows[0]?.keywords).toEqual(['arrow', 'shot', 'pierce', 'knockback', 'physical']);
  });
});
