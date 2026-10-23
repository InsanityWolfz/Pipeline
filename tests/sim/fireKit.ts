import type { EnemyState } from '../../src/sim/enemies';
import type { SimState } from '../../src/sim/state';
import { placeHusk } from './fight';

// Fire's sim tests' shared pieces (060): fire.test.ts (the tag, the rune, burn, every source) and fireSpread.test.ts
// (spread on death, the two talents).

export const FIRE_HIT = { knock: 0, flash: false, damageType: 'fire' } as const;

/** A Husk held where it stands, with health enough to burn for a while. */
export function still(s: SimState, x: number, y: number, health = 10_000): EnemyState {
  const e = placeHusk(s, x, y);
  e.mode = 'windup';
  e.modeTicks = -10_000;
  e.health = health;
  return e;
}

export const burnHits = (s: SimState) => s.events.hits.filter((h) => h.target === 'enemy' && h.burn);
