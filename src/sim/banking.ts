import { FOUNDRY_ROOM } from '../data/rooms';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';
import { revealBanked } from './schematics';
import { rechargeEmber } from './relics';

// Banking (011): what a death keeps. Walking into the foundry, by any way in,
// and a pylon deposit set the banked snapshot to what the player holds; in the
// foundry, gains are banked at once (050). Banking a schematic reveals its node (033).

/** Banks everything the player carries right now, recording it, reveals the nodes of carried schematics, and recharges Last Ember (036). */
export function bank(state: SimState): void {
  state.banked = { ...state.inventory };
  state.events.banks.push({ ...state.inventory });
  revealBanked(state);
  rechargeEmber(state);
}

/**
 * 050 (A.10, Shaun): in the foundry, anything gained (picked up, crafted, taken from a crate, a hopper or the stash) is
 * banked at once: each item held above what's banked is banked up to what's held, revealing a schematic's node as
 * banking does. Once a tick, after the tick's pickups; spending never lowers what's banked (031).
 */
export function bankGains(state: SimState): void {
  if (state.roomId !== FOUNDRY_ROOM) return;
  let gained = false;
  for (const [itemId, held] of Object.entries(state.inventory)) {
    if (held <= count(state.banked, itemId)) continue;
    state.banked[itemId] = held;
    gained = true;
  }
  if (gained) revealBanked(state);
}

/** Banks on arriving in the foundry, called by doors and travel, and records the arrival (042: render saves on it). */
export function arrived(state: SimState, roomId: string, via: 'door' | 'travel'): void {
  if (roomId !== FOUNDRY_ROOM) return;
  bank(state);
  state.events.foundryArrivals.push({ via });
}

/** One carried item's split (031): how many a death would keep and how many it would take. */
export interface ItemRisk {
  held: number;
  safe: number;
  atRisk: number;
}

/**
 * Per carried item (count above 0): safe = min(held, banked), at risk = the rest (031).
 * A death keeps the safe counts and loses the at-risk ones (`wake()`); spending takes the
 * at-risk count down first. Identified gear isn't carried, so it never shows here.
 */
export function itemRisks(state: Pick<SimState, 'inventory' | 'banked'>): Record<string, ItemRisk> {
  const out: Record<string, ItemRisk> = {};
  for (const [itemId, held] of Object.entries(state.inventory)) {
    if (held <= 0) continue;
    const safe = Math.min(held, count(state.banked, itemId));
    out[itemId] = { held, safe, atRisk: held - safe };
  }
  return out;
}

/** The items with at least one at risk, and how many (`getState().atRisk`). */
export function atRiskCounts(state: Pick<SimState, 'inventory' | 'banked'>): Inventory {
  return Object.fromEntries(Object.entries(itemRisks(state)).flatMap(([id, r]) => (r.atRisk > 0 ? [[id, r.atRisk]] : [])));
}
