import { FOUNDRY_ROOM } from '../data/rooms';
import type { Command } from './input';
import { pickUp, place } from './placement';
import { areaPickUp } from './area';
import { deleteBlueprint, saveBlueprint } from './blueprints';
import { stamp } from './stamp';
import { setStageRound } from './stages';
import type { SimState } from './state';

// Build mode: toggled in the foundry. While it's on the player can still walk,
// roll and use hoppers and crates, but not fire, switch ammo or harvest.

/** The command the rest of the tick sees: build mode drops fire, ammo select and harvest. */
export function maskCommand(state: SimState, cmd: Command): Command {
  return state.building ? { ...cmd, fire: false, use: false, selectSlot: null } : cmd;
}

/** Toggles build mode, then places and picks up, one piece or a box of them (063). All but the toggle only work in the foundry. */
export function stepBuild(state: SimState, cmd: Command): void {
  if (cmd.toggleBuild) state.building = !state.building && state.roomId === FOUNDRY_ROOM;
  if (cmd.place) {
    const { pieceId, tx, ty, facing, inFrom, mirrored, round } = cmd.place;
    const piece = place(state, pieceId, tx, ty, facing, { ...(inFrom ? { inFrom } : {}), ...(mirrored ? { mirrored } : {}) });
    // 069: the pipette's copy of a stage's round.
    if (piece?.kind === 'machine' && round !== undefined) setStageRound(piece, round);
  }
  if (cmd.pickUp) pickUp(state, cmd.pickUp.tx, cmd.pickUp.ty);
  // 063: the area tool's box: saved first (so a save and pick-up keeps what it lifts), then picked up; a save and
  // pick-up whose save fails (all slots full, none named) picks nothing up.
  const area = cmd.area;
  const saved = area && area.action !== 'pickUp' ? saveBlueprint(state, area.box, area.slot) : null;
  if (area && (area.action === 'pickUp' || (area.action === 'saveAndPickUp' && saved !== null))) areaPickUp(state, area.box);
  if (cmd.deleteBlueprint !== null) deleteBlueprint(state, cmd.deleteBlueprint);
  if (cmd.stamp) stamp(state, cmd.stamp);
}
