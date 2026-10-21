import { describe, expect, it } from 'vitest';
import { createEnemy, immune, targetable, type EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { arena, HALL, PLAYER_AT } from './fight';

// 054 (E.1): an enemy is immune while nothing can damage it — a Burrower under the ground (035), an add still rising
// (041). A shield's front (the Shardback, the Bulwark) isn't immunity: it can be hit from behind. The flag is the
// sim's, so any future immune state shows the blue bar too.

function place(s: SimState, enemyId: string, dx = 60): EnemyState {
  const e = createEnemy(s.nextEnemyId++, enemyId, { x: PLAYER_AT.x + dx, y: PLAYER_AT.y }, HALL);
  s.enemies.push(e);
  return e;
}

const flagOf = (s: SimState, e: EnemyState): boolean | undefined => summarize(s).enemies.find((x) => x.id === e.id)?.immune;

describe('the immune flag (054)', () => {
  it('is set while a Burrower is under the ground, and clears as it surfaces', () => {
    const s = arena();
    const e = place(s, 'burrower');
    expect(immune(e)).toBe(false);
    e.underground = true;
    expect(immune(e)).toBe(true);
    expect(flagOf(s, e)).toBe(true);
    e.underground = false;
    expect(immune(e)).toBe(false);
    expect(flagOf(s, e)).toBe(false);
  });

  it('is set while an add is still rising, and clears once it is up', () => {
    const s = arena();
    const e = place(s, 'charger');
    e.rising = 30;
    expect(immune(e)).toBe(true);
    expect(flagOf(s, e)).toBe(true);
    e.rising = 0;
    expect(immune(e)).toBe(false);
  });

  it('is never set by a shielded front: the Shardback and the Bulwark', () => {
    const s = arena();
    for (const id of ['shardback', 'bulwark']) {
      const e = place(s, id, 120);
      expect(immune(e)).toBe(false);
      expect(flagOf(s, e)).toBe(false);
    }
  });

  it('is exactly what keeps shots, punches and Bursts off it', () => {
    const s = arena();
    const e = place(s, 'burrower');
    for (const [underground, rising] of [[false, 0], [true, 0], [false, 10], [true, 10]] as const) {
      e.underground = underground;
      e.rising = rising;
      expect(targetable(e)).toBe(!immune(e));
    }
  });
});
