import { HOLLOWS } from '../data/hollows';
import { STONE_REACH } from '../data/objectives';
import { FEET_BOX } from '../data/player';
import { RESPAWN_ROOM } from '../data/player';
import { SHOT_GATES, TILE, type GateId, type Room } from '../data/rooms';
import { WORLD } from './world';
import { recipeDef, REVEALING_ITEMS } from '../data/recipes';
import { count, type Inventory } from './inventory';
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
  /** Stonefall Hollows' ley barrier (034): down once the shrine is claimed, for good. */
  hollows: boolean;
}

/** The tutorial's gates all shut, or all open (the sandbox and playtest starts); the Hollows' barrier waits on the shrine's claim either way. */
export const createGates = (open: boolean, hollows = false): Gates => ({ foundry: open, shrine: open, hollows });



/** True if a door's gate (if any) is open. */
export const doorOpen = (state: Pick<SimState, 'gates'>, gate: GateId | undefined): boolean => !gate || state.gates[gate];

/**
 * Solid boxes in a room for the tutorial: the tube stone, and doors and gate tiles (017) whose gate is shut. A gate
 * that stops shots too (034's barrier, since 053 a whole circle of tiles) isn't here: roomBodies seals its tiles in
 * the room's grid instead (sealedRoom), so movers don't test hundreds of boxes a tick.
 */
export function tutorialRects(state: Pick<SimState, 'gates'>, roomId: string): Rect[] {
  const room = WORLD[roomId];
  if (!room) return [];
  const gates = (room.gateTiles ?? []).filter((g) => !SHOT_GATES.includes(g.gate));
  const sealed = [...(room.doorways ?? []), ...gates].filter((d) => !doorOpen(state, d.gate)).map(tileRect);
  return room.tubeStone ? [...sealed, tileRect(room.tubeStone)] : sealed;
}

/** Each room's gate tiles that stop shots too, by tile key, with their gate (built once: the world is fixed). */
const SHOT_GATE_TILES = new Map<string, Map<number, GateId>>();

function shotGateTiles(roomId: string): Map<number, GateId> {
  let tiles = SHOT_GATE_TILES.get(roomId);
  if (!tiles) {
    tiles = new Map();
    for (const g of WORLD[roomId]?.gateTiles ?? []) if (SHOT_GATES.includes(g.gate)) tiles.set(g.ty * GATE_KEY + g.tx, g.gate);
    SHOT_GATE_TILES.set(roomId, tiles);
  }
  return tiles;
}

/** Tile keys: a row is never this wide. */
const GATE_KEY = 100_000;

/** True if a tile is sealed by a shut gate that stops shots as well as feet (034: the Hollows' barrier stops every projectile). */
export function shotSealed(state: Pick<SimState, 'gates'>, roomId: string, tx: number, ty: number): boolean {
  const gate = shotGateTiles(roomId).get(ty * GATE_KEY + tx);
  return gate !== undefined && !state.gates[gate];
}

/** The gates that stop shots as well as feet that are shut in a room (034's barrier while the shrine is unclaimed). */
export function shutShotGates(state: Pick<SimState, 'gates'>, roomId: string): GateId[] {
  return [...new Set(shotGateTiles(roomId).values())].filter((g) => !state.gates[g]);
}

/** Each room with its shut shot-stopping gates' tiles turned to wall, by room and gates, built once each (053). */
const SEALED = new Map<string, Room>();

/** The room as movers meet it: its shut shot-stopping gates' tiles solid, like walls. */
export function sealedRoom(state: Pick<SimState, 'gates'>, room: Room): Room {
  const shut = shutShotGates(state, room.id);
  if (shut.length === 0) return room;
  const key = `${room.id}|${shut.join(',')}`;
  let sealed = SEALED.get(key);
  if (!sealed) {
    const rows = room.rows.map((r) => [...r]);
    for (const g of room.gateTiles ?? []) if (shut.includes(g.gate)) (rows[g.ty] ?? [])[g.tx] = TILE.wall;
    sealed = { ...room, rows: rows.map((r) => r.join('')) };
    SEALED.set(key, sealed);
  }
  return sealed;
}

/**
 * Recipes the player knows: those needing attunement once the tube is attuned or (051, B.3: bombs and ley bolts are
 * crafted before the foundry) once the foundry's stairs are open, and those shown after an item (038) once it's been carried.
 */
export function knownRecipe(state: { link: Pick<SimState['link'], 'attuned'>; found: readonly string[]; gates: Pick<Gates, 'foundry'> }, recipeId: string): boolean {
  const def = recipeDef(recipeId);
  const attuned = state.link.attuned || state.gates.foundry;
  return (def.requires !== 'attuned' || attuned) && (def.shownAfter === undefined || state.found.includes(def.shownAfter));
}

/** The revealing items (038) an inventory holds, in REVEALING_ITEMS order. */
export const foundIn = (inventory: Inventory): string[] => REVEALING_ITEMS.filter((id) => count(inventory, id) > 0);

/** Once a tick: a revealing item carried for the first time (picked up, harvested or taken out) is remembered for good. */
export function noteFound(state: Pick<SimState, 'inventory' | 'found'>): void {
  for (const id of foundIn(state.inventory)) if (!state.found.includes(id)) state.found.push(id);
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

/** Opens gates whose condition now holds: the hall clear, the first line full (an entrance at its current cap, 024, 033), the shrine claimed (034). */
export function stepGates(state: SimState): void {
  const cap = entranceCap(state);
  if (!state.firstLineFull && state.link.entrances.some((e) => e.count >= cap)) {
    state.firstLineFull = true;
    // The world pushes back (017): from the first full line, the land fills with packs.
    state.populated = true;
  }
  if (!state.gates.foundry && !state.enemies.some((e) => e.group === FIELD_GROUP)) open(state, 'foundry');
  if (!state.gates.shrine && state.firstLineFull) open(state, 'shrine');
  // Claiming the shrine's pylon drops the Hollows' barrier (034); claims are for good, so it never comes back.
  if (!state.gates.hollows && state.claims.includes(HOLLOWS.opensOn)) open(state, 'hollows');
}

/** Where a death wakes the player: the start room until the foundry is open (012), then the foundry (011). */
export function wakeRoom(state: Pick<SimState, 'gates' | 'start'>): string {
  return state.gates.foundry ? RESPAWN_ROOM : state.start.room;
}
