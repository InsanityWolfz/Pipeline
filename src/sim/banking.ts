import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimState } from './state';

// Banking (011): what a death keeps. Walking into the foundry, by any way in,
// and a pylon deposit set the banked snapshot to what the player holds.

/** Banks everything the player carries right now, recording it. */
export function bank(state: SimState): void {
  state.banked = { ...state.inventory };
  state.events.banks.push({ ...state.inventory });
}

/** Banks on arriving in the foundry; called by doors and travel. */
export function arrived(state: SimState, roomId: string): void {
  if (roomId === FOUNDRY_ROOM) bank(state);
}
