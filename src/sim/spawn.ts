import type { Ring } from '../data/ringScale';
import { defOf, makeChampion } from './champions';
import { createEnemy, type EnemyState } from './enemies';
import type { SimState } from './state';

// Putting one enemy down outside a room's own placements (the dev hook's spawns, 032 and
// 035; the sandbox's pens and spawn panel, 044): homed where it stands, at its home's ring
// unless told another (041), and a champion named with the seeded RNG if asked.

export interface SpawnOptions {
  /** What it belongs to (017): a pen, the spawn panel, the dev hook's `dev`. */
  group?: string;
  /** Its danger ring in place of its home's (044: the sandbox has none of its own); its health follows. */
  ring?: Ring;
  champion?: boolean;
}

/** Creates the enemy at `at` in `roomId`, adds it to the sim and returns it. */
export function spawnEnemy(state: SimState, enemyId: string, at: { x: number; y: number }, roomId: string, opts: SpawnOptions = {}): EnemyState {
  const e = createEnemy(state.nextEnemyId++, enemyId, at, roomId, opts.group);
  if (opts.ring !== undefined) {
    e.ring = opts.ring;
    e.health = defOf(e).maxHealth;
  }
  if (opts.champion) makeChampion(state.rng, e);
  state.enemies.push(e);
  return e;
}
