import { describe, expect, it } from 'vitest';
import { roomBodies } from '../../src/sim/bodies';
import { createEnemy, NEAR, separate, type EnemyState } from '../../src/sim/enemies';
import { createRng, nextInt } from '../../src/sim/rng';
import { arena, HALL, PLAYER_AT } from './fight';

// Separation (053): only pairs within NEAR at the pass's start are tried, in array order. It must push exactly as
// trying every pair (i < j) in order would.

const KINDS = ['husk', 'wisp', 'shardback', 'charger', 'burrower', 'sniper', 'bulwark', 'pylon-warden'];

/** The reference: every pair in order, each separated on its own. */
function separateAllPairs(enemies: EnemyState[], bodies: Parameters<typeof separate>[1]): void {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      if (a && b) separate([a, b], bodies);
    }
  }
}

/** A dense crowd round the meadow, some champions, all in one room. */
function crowd(seed: number, n: number, spread: number): EnemyState[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => {
    const kind = KINDS[nextInt(rng, 0, KINDS.length - 1)] ?? 'husk';
    const e = createEnemy(i, kind, { x: PLAYER_AT.x + nextInt(rng, -spread, spread), y: PLAYER_AT.y + nextInt(rng, -spread, spread) }, HALL);
    if (nextInt(rng, 0, 3) === 0 && kind !== 'bulwark' && kind !== 'pylon-warden') e.champion = { name: 'Test' };
    return e;
  });
}

describe('separation (053)', () => {
  it('NEAR covers any two of the largest feet boxes side by side, twice over', () => {
    expect(NEAR).toBeGreaterThanOrEqual(4 * 36);
  });

  for (const [seed, n, spread] of [
    [1, 40, 60],
    [2, 80, 120],
    [3, 150, 300],
    [4, 30, 20],
  ] as const) {
    it(`pushes exactly as the all-pairs reference (seed ${seed}, ${n} enemies within ${spread} px)`, () => {
      const s = arena();
      const bodies = (roomId: string) => roomBodies(s, roomId);
      const fast = crowd(seed, n, spread);
      const ref = crowd(seed, n, spread);
      for (let pass = 0; pass < 10; pass++) {
        separate(fast, bodies);
        separateAllPairs(ref, bodies);
        expect(fast.map((e) => [e.x, e.y])).toEqual(ref.map((e) => [e.x, e.y]));
      }
    });
  }
});
