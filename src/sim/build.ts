import { FOUNDRY_ROOM } from '../data/rooms';
import type { Command } from './input';
import { pickUp, place } from './placement';
import { cycleAngle } from './spread';
import type { SimState } from './state';

// Build mode: toggled in the foundry. While it's on the player can still walk,
// roll and use hoppers and crates, but not fire, switch ammo or harvest.

/** The command the rest of the tick sees: build mode drops fire, ammo select and harvest. */
export function maskCommand(state: SimState, cmd: Command): Command {
  return state.building ? { ...cmd, fire: false, selectAmmo: null } : cmd;
}

/** Toggles build mode, then places, picks up and turns stagers. All but the toggle only work in the foundry. */
export function stepBuild(state: SimState, cmd: Command): void {
  if (cmd.toggleBuild) state.building = !state.building && state.roomId === FOUNDRY_ROOM;
  if (cmd.place) place(state, cmd.place.pieceId, cmd.place.tx, cmd.place.ty, cmd.place.facing);
  if (cmd.pickUp) pickUp(state, cmd.pickUp.tx, cmd.pickUp.ty);
  if (cmd.setAngle && state.roomId === FOUNDRY_ROOM) cycleAngle(state, cmd.setAngle.id);
}
