import { AMMO } from '../data/ammo';
import { CARRIED_SLOTS } from '../data/tube';
import { count } from './inventory';
import type { SimState } from './state';

// The carried bar (047, note 11): five slots (keys 1–5), each holding one usable item kind, one selected. Right click
// uses the selected item (src/sim/tube.ts). A usable kind carried for the first time fills the first empty slot by
// itself; a stack dragged from the inventory onto a slot puts its kind there. A slot keeps its kind when its items run
// out or are lost (047.3): it shows empty and refills when that kind is picked up again. Kept through a KO.

export interface HotbarState {
  /** Each slot's item kind, or null for an empty slot. A kind sits in one slot at most. */
  slots: (string | null)[];
  /** The selected slot's index (0 for key 1). */
  selected: number;
}

export function createHotbar(): HotbarState {
  return { slots: Array.from({ length: CARRIED_SLOTS }, () => null), selected: 0 };
}

/** Kinds the bar takes: anything right click can use (every round, bombs and landmines included). */
export const usableItem = (itemId: string): boolean => AMMO[itemId] !== undefined;

/** The selected slot's kind, or null. */
export const selectedItem = (state: Pick<SimState, 'hotbar'>): string | null => state.hotbar.slots[state.hotbar.selected] ?? null;

/** The selected slot's kind if any of it is carried, else null: what right click would use. */
export function readyItem(state: Pick<SimState, 'hotbar' | 'inventory'>): string | null {
  const id = selectedItem(state);
  return id !== null && count(state.inventory, id) > 0 ? id : null;
}

/** Selects a slot (keys 1–5). Out of range, or the slot already selected, does nothing. */
export function selectSlot(state: SimState, slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.hotbar.slots.length || slot === state.hotbar.selected) return;
  state.hotbar.selected = slot;
  state.events.selects.push({ slot });
}

/**
 * Puts a usable kind on a slot (a stack dragged onto it). If the kind is already on another slot, that slot takes
 * what the target held: the two swap, so a kind is never on the bar twice. Anything else does nothing.
 */
export function assignSlot(state: SimState, slot: number, itemId: string): void {
  const { slots } = state.hotbar;
  if (!usableItem(itemId) || !Number.isInteger(slot) || slot < 0 || slot >= slots.length) return;
  const from = slots.indexOf(itemId);
  if (from >= 0) slots[from] = slots[slot] ?? null;
  slots[slot] = itemId;
}

/** A usable kind carried for the first time takes the first empty slot, if any (and if it isn't on the bar already). */
export function fillFirstEmpty(state: Pick<SimState, 'hotbar'>, itemId: string): void {
  const { slots } = state.hotbar;
  if (!usableItem(itemId) || slots.includes(itemId)) return;
  const empty = slots.indexOf(null);
  if (empty >= 0) slots[empty] = itemId;
}
