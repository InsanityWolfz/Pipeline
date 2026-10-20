import { describe, expect, it } from 'vitest';
import { enemyDef, type BulwarkDef } from '../../src/data/enemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { shieldBlocks } from '../../src/sim/shield';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, HALL, hold, HUSK, placeHusk, PLAYER_AT, run, runUntil, volleyAt } from './fight';

// The shield rule (034, shared with 035): a straight shot or a punch into a shielded
// enemy's front arc is blocked; from outside the arc it lands. Lobbed bursts always land.

const BULWARK = enemyDef('bulwark') as BulwarkDef;
const ARROW_DAMAGE = 14; // 041: was 10

/** A Bulwark `dx` px right of the player, held still (frozen) facing `angle` radians. */
function shielded(s: SimState, dx: number, angle: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'bulwark', { x: PLAYER_AT.x + dx, y: PLAYER_AT.y }, HALL);
  e.angle = angle;
  e.frozen = 10_000;
  s.enemies.push(e);
  return e;
}

describe('the shield rule', () => {
  it('is data: the Bulwark a 180° arc turning 40°/s; enemies without one have none', () => {
    expect(BULWARK.shield).toEqual({ arcDegrees: 180, turnDegPerSec: 40 });
    expect(enemyDef('husk').shield).toBeUndefined();
  });

  it('blocks by the bearing of the hit point from the centre, within half the arc of the facing', () => {
    const s = arena();
    const e = shielded(s, 100, 0);
    expect(shieldBlocks(e, e.x + 10, e.y)).toBe(true);
    expect(shieldBlocks(e, e.x + 1, e.y - 10)).toBe(true);
    expect(shieldBlocks(e, e.x - 10, e.y)).toBe(false);
    expect(shieldBlocks(e, e.x - 1, e.y + 10)).toBe(false);
    expect(shieldBlocks(createEnemy(99, 'husk', { x: 0, y: 0 }, HALL), 10, 0)).toBe(false);
  });

  it('stops an arrow into the front, piercing or not, for no damage: a blocked event, and nothing behind is hit', () => {
    const s = arena();
    // Facing the player (west); a Husk stands right behind it on the arrow's line.
    const e = shielded(s, 120, Math.PI);
    const behind = placeHusk(s, PLAYER_AT.x + 170, PLAYER_AT.y);
    behind.frozen = 10_000;
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    const blocked: unknown[] = [];
    runUntil(s, () => {
      blocked.push(...s.events.blocked);
      return s.arrows.length === 0;
    }, 60);
    expect(e.health).toBe(BULWARK.maxHealth);
    expect(behind.health).toBe(HUSK.maxHealth);
    expect(blocked).toEqual([expect.objectContaining({ id: e.id })]);
  });

  it('lets an arrow into the back land', () => {
    const s = arena();
    const e = shielded(s, 120, 0);
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 60);
    expect(e.health).toBe(BULWARK.maxHealth - ARROW_DAMAGE);
  });

  it('makes a punch into the front do nothing, with no knockback', () => {
    const s = arena();
    s.inventory = {};
    const e = shielded(s, 24, Math.PI);
    run(s, 1, volleyAt(PLAYER_AT.x + 24, PLAYER_AT.y));
    expect(s.events.melees).toHaveLength(1);
    expect(e.health).toBe(BULWARK.maxHealth);
    expect(e.knockTicks).toBe(0);
    expect(s.events.blocked).toEqual([expect.objectContaining({ id: e.id })]);
  });

  it('never blocks a bomb, even bursting on its front side', () => {
    const s = arena();
    s.inventory = { bomb: 1 };
    hold(s, 'bomb');
    const e = shielded(s, 120, Math.PI);
    run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
    runUntil(s, () => s.events.bursts.length > 0, 120);
    expect(e.health).toBeLessThan(BULWARK.maxHealth);
    expect(s.events.blocked).toEqual([]);
  });

  it('turns toward the player at no more than turnDegPerSec, never snapping', () => {
    const s = arena();
    const e = shielded(s, 100, 0);
    e.frozen = 0;
    e.mode = 'chase';
    const turned: number[] = [];
    for (let t = 0; t < 60; t++) {
      const before = e.angle;
      run(s, 1);
      turned.push(Math.abs(e.angle - before));
    }
    const perTick = (BULWARK.shield?.turnDegPerSec ?? 0) / 60;
    for (const d of turned) expect((d * 180) / Math.PI).toBeLessThanOrEqual(perTick + 1e-9);
    // A second's turn toward the player behind it: 40° of the 180°.
    expect((Math.abs(e.angle) * 180) / Math.PI).toBeCloseTo(40, 5);
  });
});
