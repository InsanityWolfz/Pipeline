import { FOUNDRY_ROOM } from '../data/rooms';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';
import { revealBanked } from './schematics';
import { rechargeEmber } from './relics';

// Banking (011): what a death keeps. Walking into the foundry, by any way in,
// and a pylon deposit set the banked snapshot to what the player holds. Banking a
// schematic reveals its node (033).

/** Banks everything the player carries right now, recording it, reveals the nodes of carried schematics, and recharges Last Ember (036). */
export function bank(state: SimState): void {
  state.banked = { ...state.inventory };
  state.events.banks.push({ ...state.inventory });
  revealBanked(state);
  rechargeEmber(state);
}

/** Banks on arriving in the foundry; called by doors and travel. */
export function arrived(state: SimState, roomId: string): void {
  if (roomId === FOUNDRY_ROOM) bank(state);
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
