import { itemDef } from '../data/items';
import { FOUNDRY_ROOM } from '../data/rooms';
import { ATTUNE_TICKS, RESERVOIR_CAP } from '../data/tube';
import type { SimState } from './state';

// The tube's link to the foundry: it attunes the first time the player walks
// into the foundry, and from then on a tube socket fills its one reservoir.
// Both survive a KO.

export interface ReservoirState {
  /** The one ammo it holds, or null when empty. */
  ammoId: string | null;
  count: number;
}

export interface LinkState {
  attuned: boolean;
  /** Ticks left on the attuning pulse. Cosmetic. */
  attunePulse: number;
  reservoir: ReservoirState;
}

export function createLink(): LinkState {
  return { attuned: false, attunePulse: 0, reservoir: { ammoId: null, count: 0 } };
}

/** Runs after doorways: the first entry into the foundry attunes the tube. Counts the pulse down. */
export function stepLink(state: SimState): void {
  const { link } = state;
  if (link.attunePulse > 0) link.attunePulse -= 1;
  if (link.attuned || state.roomId !== FOUNDRY_ROOM) return;
  link.attuned = true;
  link.attunePulse = ATTUNE_TICKS;
  state.events.attunes.push({});
}

/** Whether the reservoir would take one of this item: ammo only, its own type (or empty), under the cap. */
export function reservoirAccepts(reservoir: ReservoirState, itemId: string): boolean {
  if (itemDef(itemId).kind !== 'ammo') return false;
  if (reservoir.ammoId !== null && reservoir.ammoId !== itemId) return false;
  return reservoir.count < RESERVOIR_CAP;
}

/** Puts one item in the reservoir if it accepts it. Returns whether it was taken. */
export function fillReservoir(reservoir: ReservoirState, itemId: string): boolean {
  if (!reservoirAccepts(reservoir, itemId)) return false;
  reservoir.ammoId = itemId;
  reservoir.count += 1;
  return true;
}

/** Takes one round of the ammo from the reservoir. It forgets its type at 0. */
export function takeFromReservoir(link: LinkState, ammoId: string): boolean {
  const r = link.reservoir;
  if (r.ammoId !== ammoId || r.count < 1) return false;
  r.count -= 1;
  if (r.count === 0) r.ammoId = null;
  return true;
}
