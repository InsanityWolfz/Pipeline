import { HIT_INVULN_TICKS } from '../data/player';
import { startKnock } from './knockback';
import { isInvulnerable } from './movement';
import { resetWorld, type SimState } from './state';
import { cancelClaim } from './claims';
import { cancelHarvest } from './harvest';

// Player damage and the placeholder KO. Spec 004; 011 replaces the KO with death.

/**
 * Hits the player for `amount`, pushing them `knockback` px along (dirX, dirY)
 * over `knockTicks`. Does nothing during roll i-frames or hit invulnerability.
 * Returns whether the hit landed.
 */
export function damagePlayer(
  state: SimState,
  amount: number,
  dirX: number,
  dirY: number,
  knockback: number,
  knockTicks: number,
): boolean {
  const p = state.player;
  if (isInvulnerable(p) || p.hurtTicks > 0) return false;
  p.health = Math.max(0, p.health - amount);
  p.hurtTicks = HIT_INVULN_TICKS;
  startKnock(p, dirX, dirY, knockback, knockTicks);
  cancelHarvest(state);
  cancelClaim(state);
  state.events.hits.push({ target: 'player', x: p.x, y: p.y, damage: amount });
  return true;
}

/** At 0 health, resets the world and flags the KO for this tick. */
export function checkKo(state: SimState): void {
  if (state.player.health > 0) return;
  resetWorld(state);
  state.events.ko = true;
}
