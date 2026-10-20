import { FEET_BOX } from '../data/player';
import { defOf } from './champions';
import type { EnemyState } from './enemies';
import { isRolling } from './movement';
import { wornRelic } from './stats';
import { statOf, statusEmission } from './statResolve';
import { applyStun } from './stun';
import type { SimState } from './state';

// The relics' rules (036), each read from its data entry: Rollbreaker's Stun, the
// Wardstone's ward, Last Ember's save (Featherplate's is a stat, in stats.ts). No relic
// deals damage or touches the factory, the haul or pickups.

/** The Wardstone is worn and has built up: the next hit is blocked. */
export function wardReady(state: SimState): boolean {
  const ward = wornRelic(state, 'ward');
  return ward !== null && state.player.wardTicks >= ward.wardTicks;
}

/** True if the rolling player's feet box overlaps the enemy's. */
function rolledThrough(state: SimState, e: EnemyState): boolean {
  const p = state.player;
  const box = defOf(e).feetBox;
  return Math.abs(p.x - e.x) < (FEET_BOX.w + box.w) / 2 && Math.abs(p.y - e.y) < (FEET_BOX.h + box.h) / 2;
}

/**
 * One tick of the relics, after the player moves and before enemies act (nothing while dying): the Wardstone builds
 * while worn (any other time it's 0); Rollbreaker stuns each enemy the rolling player passes through, once a roll.
 */
export function stepRelics(state: SimState): void {
  const p = state.player;
  if (p.dying > 0) return;
  const ward = wornRelic(state, 'ward');
  p.wardTicks = ward ? Math.min(ward.wardTicks, p.wardTicks + 1) : 0;
  const breaker = wornRelic(state, 'stun');
  if (!breaker || !isRolling(p)) return;
  for (const e of state.enemies) {
    if (e.roomId !== state.roomId || p.rollStunned.includes(e.id) || !rolledThrough(state, e)) continue;
    if (applyStun(state, e, statOf(state, 'duration', statusEmission('stun'), breaker.stunTicks))) p.rollStunned.push(e.id);
  }
}

/** What the relics make of a hit before armor: `blocked` (the ward took it whole), or the hit goes on. */
export function wardBlocks(state: SimState): boolean {
  if (!wardReady(state)) return false;
  state.player.wardTicks = 0;
  state.events.wardBlocks.push({ x: state.player.x, y: state.player.y });
  return true;
}

/**
 * Last Ember (036): a hit of `taken` that would kill leaves the player on 1 HP instead, once until the next bank.
 * Returns the hit invulnerability it grants, or null when it doesn't step in.
 */
export function emberSaves(state: SimState, taken: number): number | null {
  const p = state.player;
  const ember = wornRelic(state, 'ember');
  if (!ember || p.emberSpent || taken < p.health) return null;
  p.emberSpent = true;
  state.events.emberSaves.push({ x: p.x, y: p.y });
  return ember.saveInvulnTicks;
}

/** A bank (entering the foundry, a pylon deposit) recharges Last Ember. */
export function rechargeEmber(state: SimState): void {
  state.player.emberSpent = false;
}
