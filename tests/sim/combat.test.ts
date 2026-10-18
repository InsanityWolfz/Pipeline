import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { damageEnemy } from '../../src/sim/enemies';
import { arena, fireAt, HUSK, loadFull, placeHusk, PLAYER_AT, run, runUntil } from './fight';

const DAMAGE = AMMO.arrow?.damage ?? 0;

describe('arrows hitting Husks', () => {
  it('removes the arrow and deals its damage', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(DAMAGE).toBe(10);
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });

  it('records the hit and flashes the Husk', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.events.hits.length > 0, 30);
    expect(s.events.hits).toEqual([{ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: DAMAGE }]);
    expect(e.flash).toBe(HUSK.hitFlashTicks);
    run(s, HUSK.hitFlashTicks);
    expect(e.flash).toBe(0);
  });

  it('does not pierce: only the first Husk in line is hit', () => {
    const s = arena();
    loadFull(s);
    const first = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y);
    const second = placeHusk(s, PLAYER_AT.x + 130, PLAYER_AT.y);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(first.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(second.health).toBe(HUSK.maxHealth);
  });

  it('hits the Husk the arrow reaches first when hurtboxes overlap', () => {
    const s = arena();
    loadFull(s);
    // First in the array but 1 px further along the flight, with hurtboxes overlapping.
    const far = placeHusk(s, PLAYER_AT.x + 101, PLAYER_AT.y);
    const near = placeHusk(s, PLAYER_AT.x + 100, PLAYER_AT.y + HUSK.feetBox.h);
    run(s, 1, fireAt(1000, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 30);
    expect(near.health).toBe(HUSK.maxHealth - DAMAGE);
    expect(far.health).toBe(HUSK.maxHealth);
  });

  it('hits a Husk standing against a wall', () => {
    const s = arena(undefined, { x: 1000, y: PLAYER_AT.y });
    loadFull(s);
    const e = placeHusk(s, 1240, PLAYER_AT.y);
    e.mode = 'recover';
    e.modeTicks = 1;
    run(s, 1, fireAt(1300, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 40);
    expect(e.health).toBe(HUSK.maxHealth - DAMAGE);
  });
});

describe('Husk knockback', () => {
  it('pushes the Husk 6 px along the arrow over 4 ticks', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 28, PLAYER_AT.y);
    run(s, 1);
    expect(e.mode).toBe('windup');
    damageEnemy(s, e, DAMAGE, 0, -1);
    run(s, HUSK.hitKnockTicks - 1);
    expect(e.y).toBeGreaterThan(PLAYER_AT.y - HUSK.hitKnockback);
    run(s, 1);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - HUSK.hitKnockback, 6);
    run(s, 4);
    expect(e.y).toBeCloseTo(PLAYER_AT.y - HUSK.hitKnockback, 6);
  });

  it('stops at a wall', () => {
    const s = arena(undefined, { x: 60, y: PLAYER_AT.y });
    const e = placeHusk(s, 40, PLAYER_AT.y);
    run(s, 1);
    damageEnemy(s, e, DAMAGE, -1, 0);
    run(s, HUSK.hitKnockTicks);
    expect(e.x).toBe(40);
  });
});

describe('Husk death', () => {
  it('dies to 4 arrows, recording a death and dropping items', () => {
    const s = arena();
    loadFull(s);
    const e = placeHusk(s, PLAYER_AT.x + 160, PLAYER_AT.y);
    const deaths: unknown[] = [];
    runUntil(
      s,
      (st) => {
        deaths.push(...st.events.deaths);
        return st.enemies.length === 0;
      },
      120,
      fireAt(1000, PLAYER_AT.y),
    );
    expect(s.tube.loaded).toBe(2);
    expect(deaths).toEqual([{ id: e.id, enemyId: 'husk', x: e.x, y: e.y, facing: e.facing }]);
    expect(s.groundItems.length).toBeGreaterThanOrEqual(1);
    expect(s.groundItems.length).toBeLessThanOrEqual(3);
  });
});
