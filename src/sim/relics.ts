import { FEET_BOX } from '../data/player';
import { defOf } from './champions';
import { targetable, type EnemyState } from './enemies';
import { isRolling } from './movement';
import { wornRelic } from './stats';
import { attackOf } from '../data/enemies';
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
    if (stun(state, e, breaker.stunTicks)) p.rollStunned.push(e.id);
  }
}

/** Ticks left in a recovery, a Charger's wall stun, or a Stun already running: a new Stun never cuts them short. */
function holdLeft(e: EnemyState): number {
  const def = defOf(e);
  if (e.mode === 'stun' && def.kind === 'charger') return Math.max(e.stunned, def.charge.stunTicks - e.modeTicks);
  if (e.mode === 'recover') return Math.max(e.stunned, attackOf(def).recoverTicks - e.modeTicks);
  return e.stunned;
}

/**
 * Cancels whatever the enemy was doing and holds it in recovery for `ticks`, or longer if it was already held longer
 * (a wall stun stays a stun). Bosses and enemies underground are never stunned. Returns whether it was.
 */
function stun(state: SimState, e: EnemyState, ticks: number): boolean {
  if (defOf(e).boss || !targetable(e)) return false;
  const hold = Math.max(holdLeft(e), ticks);
  if (e.mode !== 'stun') {
    if (e.mode !== 'recover') e.modeTicks = 1;
    e.mode = 'recover';
  }
  e.stunned = hold;
  e.vx = 0;
  e.vy = 0;
  state.events.stuns.push({ id: e.id, x: e.x, y: e.y });
  return true;
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
