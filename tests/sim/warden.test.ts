import { describe, expect, it } from 'vitest';
import { enemyDef, type SlammerDef } from '../../src/data/enemies';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { arena, HALL, PLAYER_AT, run, runUntil } from './fight';

const WARDEN = enemyDef('pylon-warden') as SlammerDef;
const { slam } = WARDEN;

function placeWarden(s: SimState, x: number, y: number): EnemyState {
  const e = createEnemy(s.nextEnemyId++, 'pylon-warden', { x, y }, HALL);
  s.enemies.push(e);
  return e;
}

describe('the Pylon Warden', () => {
  it('chases within aggroRange and winds up close in', () => {
    const s = arena();
    const e = placeWarden(s, PLAYER_AT.x + slam.aggroRange - 20, PLAYER_AT.y);
    run(s, 2);
    expect(e.mode).toBe('chase');
    runUntil(s, () => e.mode === 'windup', 600);
    expect(Math.hypot(e.x - PLAYER_AT.x, e.y - PLAYER_AT.y)).toBeLessThanOrEqual(slam.triggerRange + 1);
  });

  it('slams a player inside the circle after the wind-up', () => {
    const s = arena();
    placeWarden(s, PLAYER_AT.x + 40, PLAYER_AT.y);
    run(s, slam.windupTicks + 1);
    expect(s.player.health).toBe(100 - slam.damage);
  });

  it('misses a player who stepped outside, or rolled', () => {
    const out = arena();
    const e = placeWarden(out, PLAYER_AT.x + 40, PLAYER_AT.y);
    run(out, 2);
    expect(e.mode).toBe('windup');
    out.player.x = e.x - slam.radius - 10;
    run(out, slam.windupTicks);
    expect(out.player.health).toBe(100);

    const rolled = arena();
    placeWarden(rolled, PLAYER_AT.x + 40, PLAYER_AT.y);
    run(rolled, slam.windupTicks - 4);
    run(rolled, 1, { dodge: true, moveY: 1 });
    run(rolled, 6);
    expect(rolled.player.health).toBe(100);
  });

  it('stands still while it recovers, then cools down before the next wind-up', () => {
    const s = arena();
    const e = placeWarden(s, PLAYER_AT.x + 40, PLAYER_AT.y);
    runUntil(s, () => e.mode === 'recover', slam.windupTicks + slam.swipeTicks + 5);
    s.player.health = 100;
    s.player.hurtTicks = 0;
    const x = e.x;
    s.player.x = PLAYER_AT.x - 60;
    run(s, slam.recoverTicks - 2);
    expect(e.x).toBe(x);
    runUntil(s, () => e.mode === 'chase', 10);
    const recovered = s.tick;
    s.player.x = e.x - 30;
    runUntil(s, () => e.mode === 'windup', 400);
    // 120 ticks of cooldown after the recovery before the next wind-up.
    expect(s.tick - recovered).toBeGreaterThanOrEqual(120 - 2);
  });

  it('drops a warden core and two or three stone', () => {
    for (const seed of [1, 2, 3]) {
      const s = arena(seed);
      const e = placeWarden(s, PLAYER_AT.x + 200, PLAYER_AT.y);
      e.health = 0;
      run(s, 1);
      const by = (id: string) => s.groundItems.filter((g) => g.itemId === id).length;
      expect(by('warden-core')).toBe(1);
      expect(by('stone')).toBeGreaterThanOrEqual(2);
      expect(by('stone')).toBeLessThanOrEqual(3);
    }
  });
});
