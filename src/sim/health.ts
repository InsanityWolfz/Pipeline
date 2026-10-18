import { DYING_TICKS, HIT_INVULN_TICKS } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import { afterArmor } from './armor';
import { startKnock } from './knockback';
import { isInvulnerable } from './movement';
import { resetWorld, type SimState } from './state';
import { cancelClaim } from './claims';
import { cancelHarvest } from './harvest';
import { count, type Inventory } from './inventory';

// Player damage, banking and death. Specs 004 and 011.

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
  if (isInvulnerable(p) || p.hurtTicks > 0 || p.dying > 0) return false;
  const taken = afterArmor(state, amount);
  p.health = Math.max(0, p.health - taken);
  p.hurtTicks = HIT_INVULN_TICKS;
  startKnock(p, dirX, dirY, knockback, knockTicks);
  cancelHarvest(state);
  cancelClaim(state);
  state.events.hits.push({ target: 'player', x: p.x, y: p.y, damage: taken });
  return true;
}

/**
 * Death (011). At 0 health the player starts dying: no input, no hits, enemies
 * lose them. When the animation ends they wake in the foundry at full health,
 * keeping only what was banked of what they carry; the rest is lost and
 * reported on the KO. Unclaimed rooms reset; everything kept by design stays.
 */
export function checkKo(state: SimState): void {
  const p = state.player;
  if (p.dying > 0) {
    p.dying -= 1;
    if (p.dying === 0) wake(state);
    return;
  }
  if (p.health > 0) return;
  p.dying = DYING_TICKS;
  p.vx = 0;
  p.vy = 0;
  p.rollTick = 0;
  p.knockTicks = 0;
  cancelHarvest(state);
  cancelClaim(state);
  state.events.dies = true;
}

function wake(state: SimState): void {
  const lost: Inventory = {};
  const kept: Inventory = {};
  for (const [itemId, held] of Object.entries(state.inventory)) {
    const keep = Math.min(held, count(state.banked, itemId));
    if (keep > 0) kept[itemId] = keep;
    if (held > keep) lost[itemId] = held - keep;
  }
  state.inventory = kept;
  resetWorld(state, RESPAWN_ROOM);
  state.banked = { ...kept };
  state.events.ko = true;
  state.events.lost = lost;
}

/** Banks what the player carries: on walking into the foundry, and on a pylon deposit. */
export function stepBanking(state: SimState): void {
  const home = state.events.roomChanges.some((c) => c.to === FOUNDRY_ROOM);
  if (!home && state.events.stashDeposits.length === 0) return;
  state.banked = { ...state.inventory };
  state.events.banks.push({ ...state.inventory });
}

/** Where the player wakes after dying. */
const RESPAWN_ROOM = FOUNDRY_ROOM;
