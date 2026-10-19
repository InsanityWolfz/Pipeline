import { STONE_REACH } from '../data/objectives';
import { FEET_BOX } from '../data/player';
import { RESPAWN_ROOM } from '../data/player';
import { type GateId } from '../data/rooms';
import { WORLD } from './world';
import { recipeDef } from '../data/recipes';
import type { Rect } from './collision';
import { tileRect } from './fixtures';
import type { Command } from './input';
import { roomOf, type SimState } from './state';
import { entranceCap } from './research';

// The tutorial's rules (012): the tube waits on its stone until E takes it; the
// foundry's stairs are sealed until the ruin field's whole pack is dead at once,
// the shrine site's gap until the first line fills the tube; bomb and ley bolt recipes stay
// unknown until the tube attunes. Gates and the tube stay once got, through a KO.


/** The ruin field's pack (017): while any of it lives, rubble seals the foundry's stairs. */
export const FIELD_GROUP = 'field';

export interface Gates {
  foundry: boolean;
  shrine: boolean;
}

/** All shut, or all open (the sandbox and playtest starts). */
export const createGates = (open: boolean): Gates => ({ foundry: open, shrine: open });


/** True if a door's gate (if any) is open. */
export const doorOpen = (state: Pick<SimState, 'gates'>, gate: GateId | undefined): boolean => !gate || state.gates[gate];

/** Solid boxes in a room for the tutorial: the tube stone, and doors and gate tiles (017) whose gate is shut. */
export function tutorialRects(state: Pick<SimState, 'gates'>, roomId: string): Rect[] {
  const room = WORLD[roomId];
  if (!room) return [];
  const sealed = [...(room.doorways ?? []), ...(room.gateTiles ?? [])].filter((d) => !doorOpen(state, d.gate)).map(tileRect);
  return room.tubeStone ? [...sealed, tileRect(room.tubeStone)] : sealed;
}

/** Recipes the player knows: those needing attunement only once the tube is attuned. */
export function knownRecipe(state: { link: Pick<SimState['link'], 'attuned'> }, recipeId: string): boolean {
  return recipeDef(recipeId).requires !== 'attuned' || state.link.attuned;
}


/** True while the tube still rests on the stone in the player's room, in reach. */
export function stoneInReach(state: SimState): boolean {
  const stone = roomOf(state).tubeStone;
  if (!stone || state.hasTube) return false;
  const r = tileRect(stone);
  const p = state.player;
  const gapX = Math.max(0, Math.abs(r.x - p.x) - (FEET_BOX.w + r.w) / 2);
  const gapY = Math.max(0, Math.abs(r.y - p.y) - (FEET_BOX.h + r.h) / 2);
  return Math.hypot(gapX, gapY) <= STONE_REACH;
}

/** E at the stone takes the tube; returns the command the rest of the tick sees. */
export function stepTubeStone(state: SimState, cmd: Command): Command {
  if (!cmd.interact || !stoneInReach(state)) return cmd;
  state.hasTube = true;
  state.events.tubeTaken = true;
  return { ...cmd, interact: false };
}

function open(state: SimState, gate: GateId): void {
  state.gates[gate] = true;
  state.events.gates.push({ gate });
}

/** Opens gates whose condition now holds: the hall clear, the first line full (an entrance at its current cap, 024, 033). */
export function stepGates(state: SimState): void {
  const cap = entranceCap(state);
  if (!state.firstLineFull && state.link.entrances.some((e) => e.count >= cap)) {
    state.firstLineFull = true;
    // The world pushes back (017): from the first full line, the land fills with packs.
    state.populated = true;
  }
  if (!state.gates.foundry && !state.enemies.some((e) => e.group === FIELD_GROUP)) open(state, 'foundry');
  if (!state.gates.shrine && state.firstLineFull) open(state, 'shrine');
}

/** Where a death wakes the player: the start room until the foundry is open (012), then the foundry (011). */
export function wakeRoom(state: Pick<SimState, 'gates' | 'start'>): string {
  return state.gates.foundry ? RESPAWN_ROOM : state.start.room;
}
