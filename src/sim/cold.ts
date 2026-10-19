import { enemyDef } from '../data/enemies';
import { COLD } from '../data/tags';
import type { EnemyState } from './enemies';
import type { SimState } from './state';
import { playerStats } from './stats';

// Cold (029): each cold hit adds a chill stack, up to COLD.stacksToFreeze, and
// refreshes the chill for COLD.stackTicks; each stack slows the enemy's own
// movement. The hit that reaches COLD.stacksToFreeze freezes it (a boss for less):
// it doesn't move or think, so a wind-up pauses, but it still takes damage and,
// unless a boss, knockback. After the thaw it gains no stacks for COLD.refreezeTicks.

/** A cold hit on a live enemy: a stack, or the freeze on the stack that reaches the cap (the player's stats', 037). Nothing while frozen or in the refreeze window. */
export function chillEnemy(state: SimState, e: EnemyState): void {
  if (e.frozen > 0 || e.refreeze > 0) return;
  // Rimecraft (037) takes a hit off the freeze and adds to its length, through the player's stats.
  const cold = playerStats(state).ammo;
  e.chill = Math.min(cold.freezeHits, e.chill + 1);
  e.chillTicks = COLD.stackTicks;
  if (e.chill < cold.freezeHits) return;
  e.chill = 0;
  e.chillTicks = 0;
  e.frozen = enemyDef(e.enemyId).boss ? cold.bossFreezeTicks : cold.freezeTicks;
  state.events.freezes.push({ id: e.id, x: e.x, y: e.y });
}

/** How much of its own walk a chilled enemy keeps, 0..1. */
export const chillScale = (e: Pick<EnemyState, 'chill'>): number => Math.max(0, 1 - e.chill * COLD.slowPerStack);

/** True if the enemy is frozen and shrugs off knockback (a boss). */
export const frozenFast = (e: EnemyState): boolean => e.frozen > 0 && enemyDef(e.enemyId).boss;

/**
 * Counts an enemy's cold down by a tick, after it has moved: the refreeze window, the freeze (a thaw starts the
 * window), and the chill (its stacks drop to 0 when it runs out).
 */
export function tickCold(state: SimState, e: EnemyState): void {
  if (e.refreeze > 0) e.refreeze -= 1;
  if (e.frozen > 0) {
    e.frozen -= 1;
    if (e.frozen === 0) {
      e.refreeze = COLD.refreezeTicks;
      state.events.thaws.push({ id: e.id, x: e.x, y: e.y });
    }
  }
  if (e.chillTicks > 0) {
    e.chillTicks -= 1;
    if (e.chillTicks === 0) e.chill = 0;
  }
}
