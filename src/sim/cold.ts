import { enemyDef } from '../data/enemies';
import { COLD } from '../data/tags';
import type { EnemyState } from './enemies';
import type { SimState } from './state';
import { statOf, statusEmission, type Statted } from './statResolve';

// Cold (029): each cold hit adds a chill stack, up to COLD.stacksToFreeze, and
// refreshes the chill for COLD.stackTicks; each stack slows the enemy's own
// movement. The hit that reaches COLD.stacksToFreeze freezes it (a boss for less):
// it doesn't move or think, so a wind-up pauses, but it still takes damage and,
// unless a boss, knockback. After the thaw it gains no stacks for COLD.refreezeTicks.

/** The Chill stacks that Freeze, with the player's stats (037: Rimecraft takes one off, through resolveStat, 039); never below 1. */
export const freezeAt = (state: Statted): number => Math.max(1, statOf(state, 'stacks-to-freeze', statusEmission('chill'), COLD.stacksToFreeze));

/** Cold hits from no Chill to a Freeze (040's "Freeze in N hits"): the stacks that Freeze, COLD.chillPerHit a hit. */
export const hitsToFreeze = (state: Statted): number => Math.ceil(freezeAt(state) / COLD.chillPerHit);

/** A cold hit on a live enemy: a stack, or the freeze on the stack that reaches the cap (the player's stats', 037). Nothing while frozen or in the refreeze window. */
export function chillEnemy(state: SimState, e: EnemyState): void {
  if (e.frozen > 0 || e.refreeze > 0) return;
  // Rimecraft (037) takes a stack off the Freeze and adds to its length (a boss's too), through resolveStat (039).
  const chill = statusEmission('chill');
  const at = freezeAt(state);
  e.chill = Math.min(at, e.chill + COLD.chillPerHit);
  e.chillTicks = statOf(state, 'duration', chill, COLD.stackTicks);
  if (e.chill < at) return;
  e.chill = 0;
  e.chillTicks = 0;
  e.frozen = statOf(state, 'duration', statusEmission('freeze'), enemyDef(e.enemyId).boss ? COLD.bossFreezeTicks : COLD.freezeTicks);
  state.events.freezes.push({ id: e.id, x: e.x, y: e.y });
}

/** Chill's slow per stack now (039: resolveStat). */
export const chillSlow = (state: Statted): number => statOf(state, 'slow', statusEmission('chill'), COLD.slowPerStack);

/** How much of its own walk a chilled enemy keeps, 0..1, at `slow` a stack. */
export const chillScale = (e: Pick<EnemyState, 'chill'>, slow: number = COLD.slowPerStack): number => Math.max(0, 1 - e.chill * slow);

/**
 * Counts an enemy's cold down by a tick, after it has moved: the refreeze window, the freeze (a thaw starts the
 * window), and the chill (its stacks drop to 0 when it runs out).
 */
export function tickCold(state: SimState, e: EnemyState): void {
  if (e.refreeze > 0) e.refreeze = Math.max(0, e.refreeze - 1);
  if (e.frozen > 0) {
    e.frozen = Math.max(0, e.frozen - 1);
    if (e.frozen === 0) {
      e.refreeze = statOf(state, 'immunity', statusEmission('freeze'), COLD.refreezeTicks);
      state.events.thaws.push({ id: e.id, x: e.x, y: e.y });
    }
  }
  if (e.chillTicks > 0) {
    e.chillTicks = Math.max(0, e.chillTicks - 1);
    if (e.chillTicks === 0) e.chill = 0;
  }
}
