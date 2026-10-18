import { RESERVOIR_CAP } from '../data/tube';
import { TILE_SIZE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM, ROOMS, type GateId } from '../data/rooms';
import { recipeDef, RECIPES } from '../data/recipes';
import type { Rect } from './collision';
import type { Command } from './input';
import { roomOf, type SimState } from './state';

// The tutorial's rules (012): the tube waits on its stone until E takes it; the
// foundry door is sealed until the hall's whole pack is dead at once, the shrine
// door until the first line fills the tube; bomb and ley bolt recipes stay
// unknown until the tube attunes. Gates and the tube stay once got, through a KO.

/** How close the player's feet box must be to the tube stone to take the tube, px. */
const STONE_REACH = 20;

export interface Gates {
  foundry: boolean;
  shrine: boolean;
}

/** All shut, or all open (the sandbox and playtest starts). */
export const createGates = (open: boolean): Gates => ({ foundry: open, shrine: open });

const tileRect = (t: { tx: number; ty: number }): Rect => ({
  x: (t.tx + 0.5) * TILE_SIZE,
  y: (t.ty + 0.5) * TILE_SIZE,
  w: TILE_SIZE,
  h: TILE_SIZE,
});

/** True if a door's gate (if any) is open. */
export const doorOpen = (state: Pick<SimState, 'gates'>, gate: GateId | undefined): boolean => !gate || state.gates[gate];

/** Solid boxes in a room for the tutorial: the tube stone, and doors whose gate is shut. */
export function tutorialRects(state: Pick<SimState, 'gates'>, roomId: string): Rect[] {
  const room = ROOMS[roomId];
  if (!room) return [];
  const sealed = (room.doorways ?? []).filter((d) => !doorOpen(state, d.gate)).map(tileRect);
  return room.tubeStone ? [...sealed, tileRect(room.tubeStone)] : sealed;
}

/** Recipes the player knows: those needing attunement only once the tube is attuned. */
export function knownRecipe(state: Pick<SimState, 'link'>, recipeId: string): boolean {
  return recipeDef(recipeId).requires !== 'attuned' || state.link.attuned;
}

export const knownRecipes = (state: Pick<SimState, 'link'>): string[] => Object.keys(RECIPES).filter((id) => knownRecipe(state, id));

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

/** Opens gates whose condition now holds: the hall clear, the first line full. */
export function stepGates(state: SimState): void {
  if (!state.firstLineFull && state.link.reservoir.count >= RESERVOIR_CAP) state.firstLineFull = true;
  if (!state.gates.foundry && !state.enemies.some((e) => e.roomId === 'ruin-hall')) open(state, 'foundry');
  if (!state.gates.shrine && state.firstLineFull) open(state, 'shrine');
}

/** The foundry is where the line runs; used by the last objective. */
export const inFoundry = (state: Pick<SimState, 'roomId'>): boolean => state.roomId === FOUNDRY_ROOM;
