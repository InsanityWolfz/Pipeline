import { DYING_TICKS, HIT_INVULN_TICKS } from '../data/player';
import { LAST_EMBER } from '../data/relics';
import { afterArmor } from './stats';
import { emberSaves, wardBlocks } from './relics';
import { startKnock } from './knockback';
import { endRoll, isInvulnerable } from './movement';
import { resetWorld, type SimState } from './state';
import { cancelClaim } from './claims';
import { cancelHarvest } from './harvest';
import type { Inventory } from './inventory';
import { itemRisks } from './banking';
import { wakeRoom } from './tutorial';
import { FOUNDRY_ROOM } from '../data/rooms';
import { introShield } from './bossIntro';
import { wakeSandbox } from './sandbox';

// Player damage, banking and death. Specs 004 and 011.

/**
 * Hits the player for `amount` (less their armor, 036), pushing them `knockback` px along (dirX, dirY)
 * over `knockTicks`. Does nothing during roll i-frames (unless `rollProof`, 041.12: the Bulwark's pound and enraged
 * lobs, which a roll doesn't save from) or hit invulnerability.
 * Returns whether the hit landed (a Wardstone block counts: the attack is spent on it). 080: nothing lands on a player
 * inside an arena whose enemies are in their intro (no hit, knockback or Wardstone use).
 */
export function damagePlayer(
  state: SimState,
  amount: number,
  dirX: number,
  dirY: number,
  knockback: number,
  knockTicks: number,
  rollProof = false,
): boolean {
  const p = state.player;
  if (introShield(state)) return false;
  if ((!rollProof && isInvulnerable(p)) || p.hurtTicks > 0 || p.dying > 0) return false;
  // A ready Wardstone (036) takes the hit whole: nothing lands, and the shot or swing is spent.
  if (wardBlocks(state)) return true;
  const taken = afterArmor(state, amount);
  // 044: god mode lands the hit (its knockback, flash and number) but takes no health, so Last Ember never fires.
  const god = state.sandbox?.god === true;
  // Last Ember (036) turns a killing hit into 1 HP and a longer invulnerability, once a trip.
  const saved = god ? null : emberSaves(state, taken);
  if (!god) p.health = saved === null ? Math.max(0, p.health - taken) : LAST_EMBER.saveHealth;
  p.hurtTicks = saved ?? HIT_INVULN_TICKS;
  p.lastHitTick = state.tick;
  p.wardTicks = 0;
  startKnock(p, dirX, dirY, knockback, knockTicks);
  cancelHarvest(state);
  cancelClaim(state);
  state.events.hits.push({ target: 'player', x: p.x, y: p.y, damage: taken });
  return true;
}

/**
 * Death (011). At 0 health the player starts dying: no input, no hits, enemies
 * lose them. When the animation ends they wake in the foundry at full health (the stats' max, 036),
 * keeping only what was banked of what they carry; the rest is lost and
 * reported on the KO. Until the tube attunes (the first foundry entry), nothing carried is lost (067.16).
 * Unclaimed rooms reset; everything kept by design stays.
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
  endRoll(p);
  p.knockTicks = 0;
  cancelHarvest(state);
  cancelClaim(state);
}

function wake(state: SimState): void {
  // 044.6: in the sandbox nothing is at risk.
  if (state.sandbox) {
    wakeSandbox(state);
    return;
  }
  const lost: Inventory = {};
  const kept: Inventory = {};
  // The at-risk helper (031) is the rule: the safe part is kept, the at-risk part lost (before the foundry, all safe: 067.16).
  for (const [itemId, r] of Object.entries(itemRisks(state))) {
    if (r.safe > 0) kept[itemId] = r.safe;
    if (r.atRisk > 0) lost[itemId] = r.atRisk;
  }
  state.inventory = kept;
  const room = wakeRoom(state);
  resetWorld(state, room);
  state.banked = { ...kept };
  state.events.ko = true;
  state.events.woke = true;
  state.events.lost = lost;
  // Waking in the foundry is entering it (042.2): render saves.
  if (room === FOUNDRY_ROOM) state.events.foundryArrivals.push({ via: 'wake' });
}



