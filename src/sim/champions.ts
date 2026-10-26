import { CHAMPIONS } from '../data/champions';
import { enemyDef, type EnemyDef } from '../data/enemies';
import { scaledDef } from './ringScale';
import type { EnemyState } from './enemies';
import { nextFloat, nextInt, type RngState } from './rng';

// Champions (032): a rule over enemy data, so any non-boss enemy, including ones added
// later, can be one with no new code. The sim reads an enemy's def through `defOf`,
// which scales it for its ring (041) and then as its champion (ringScale.ts): a champion's
// size, health, damage and speed; timings and reach stay its own, so every attack still
// reads and dodges the same.

/** The def the sim reads for an enemy (041.3): scaled for its ring, then as its champion; a boss's own. */
export function defOf(e: Pick<EnemyState, 'enemyId' | 'champion' | 'ring'>): EnemyDef {
  return scaledDef(enemyDef(e.enemyId), e.ring, e.champion !== null);
}

/** Makes an enemy a champion, named from its list with the RNG, at its champion's full health (in its ring, 041). */
export function makeChampion(rng: RngState, e: EnemyState): void {
  const names = CHAMPIONS.names[e.enemyId] ?? [enemyDef(e.enemyId).name];
  e.champion = { name: names[nextInt(rng, 0, names.length - 1)] ?? enemyDef(e.enemyId).name };
  e.health = defOf(e).maxHealth;
}

/**
 * A pack spawning in `ring` rolls once against the ring's chance; on a hit, one member that isn't a boss, picked by
 * the RNG, becomes a champion (065: with its whole trio, a mite's). Returns it, or null.
 */
export function rollChampions(rng: RngState, members: readonly EnemyState[], ring: number): EnemyState | null {
  const chance = CHAMPIONS.chanceByRing[ring] ?? 0;
  // An empty pack (a spring's, a claimed site's) or one of only bosses draws nothing.
  if (chance <= 0 || !members.some((e) => !enemyDef(e.enemyId).boss) || nextFloat(rng) >= chance) return null;
  const able = members.filter((e) => !enemyDef(e.enemyId).boss);
  const pick = able[nextInt(rng, 0, able.length - 1)];
  if (!pick) return null;
  makeChampion(rng, pick);
  // 065: a champion mite makes a champion trio.
  if (pick.trio >= 0) for (const o of members) if (o !== pick && o.trio === pick.trio) makeChampion(rng, o);
  return pick;
}

/** How many times a champion's drop table is rolled: 2 or 3, with the RNG. */
export const championDropRolls = (rng: RngState): number => nextInt(rng, CHAMPIONS.dropRolls[0], CHAMPIONS.dropRolls[1]);
