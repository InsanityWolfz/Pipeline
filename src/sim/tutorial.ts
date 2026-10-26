import { EMBERWORKS } from '../data/emberworks';
import { STORMCROWN } from '../data/stormcrown';
import { HOLLOWS } from '../data/hollows';
import { STONE_REACH } from '../data/objectives';
import { FEET_BOX } from '../data/player';
import { SEALED_DOOR_REACH } from '../data/hints';
import { RESPAWN_ROOM } from '../data/player';
import { SHOT_GATES, SHRINE_SITE, TILE, type GateId, type Room } from '../data/rooms';
import { WORLD } from './world';
import { recipeDef, REVEALING_ITEMS, revealsOf } from '../data/recipes';
import { count, type Inventory } from './inventory';
import type { Rect } from './collision';
import { tileRect } from './fixtures';
import type { Command } from './input';
import { roomOf, type SimState } from './state';
import { entranceCap } from './research';

// The tutorial's rules (012): the tube waits on its stone until E takes it; the foundry's stairs are sealed until the
// shrine's pylon is claimed (067: the foundry comes after the first boss), saying so to E or a push; the shrine's door
// is open from the start (067). The ruin field's clearing sends the land's packs out (067). Gates and the tube stay
// once got, through a KO.


/** The ruin field's pack (017): killing its last Husk clears the field (067). */
export const FIELD_GROUP = 'field';

export interface Gates {
  foundry: boolean;
  shrine: boolean;
  /** Stonefall Hollows' ley barrier (034): down once the shrine is claimed, for good. */
  hollows: boolean;
  /** The Emberworks' ley barrier across its ramps (060): down on the Bulwark's first kill, for good. */
  emberworks: boolean;
  /** The Stormcrown's ley barrier across its ramps (064): down on the Forgewright's first kill, for good. */
  stormcrown: boolean;
}

/**
 * The foundry's gate shut, or open (the sandbox and playtest starts); the shrine's open on every start (067); the
 * Hollows' barrier waits on the shrine's claim, the Emberworks' on the Bulwark's first kill and the Stormcrown's on the
 * Forgewright's either way.
 */
export const createGates = (open: boolean, hollows = false): Gates => ({ foundry: open, shrine: true, hollows, emberworks: false, stormcrown: false });



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
  const sealed = [...(room.doorways ?? []), ...gatesOf(roomId).feetOnly].filter((d) => !doorOpen(state, d.gate)).map(tileRect);
  return room.tubeStone ? [...sealed, tileRect(room.tubeStone)] : sealed;
}

/** A room's gate tiles, sorted once (the world is fixed): those that stop shots too by tile key, their gates, and the rest. */
interface RoomGates {
  /** The room's width in tiles: a tile's key is `ty * width + tx`. */
  width: number;
  shot: Map<number, GateId>;
  shotGates: GateId[];
  feetOnly: { tx: number; ty: number; gate: GateId }[];
}

const ROOM_GATES = new Map<string, RoomGates>();

function gatesOf(roomId: string): RoomGates {
  let g = ROOM_GATES.get(roomId);
  if (!g) {
    const all = WORLD[roomId]?.gateTiles ?? [];
    const width = WORLD[roomId]?.rows[0]?.length ?? 0;
    const shot = new Map<number, GateId>();
    for (const t of all) if (SHOT_GATES.includes(t.gate)) shot.set(t.ty * width + t.tx, t.gate);
    g = { width, shot, shotGates: [...new Set(shot.values())], feetOnly: all.filter((t) => !SHOT_GATES.includes(t.gate)) };
    ROOM_GATES.set(roomId, g);
  }
  return g;
}

/** True if a tile is sealed by a shut gate that stops shots as well as feet (034: the Hollows' barrier stops every projectile). */
export function shotSealed(state: Pick<SimState, 'gates'>, roomId: string, tx: number, ty: number): boolean {
  const g = gatesOf(roomId);
  if (tx < 0 || tx >= g.width) return false;
  const gate = g.shot.get(ty * g.width + tx);
  return gate !== undefined && !state.gates[gate];
}

/** The gates that stop shots as well as feet that are shut in a room (034's barrier while the shrine is unclaimed). */
export function shutShotGates(state: Pick<SimState, 'gates'>, roomId: string): GateId[] {
  return gatesOf(roomId).shotGates.filter((g) => !state.gates[g]);
}

/** Each room's grid with its shut shot-stopping gates' tiles turned to wall, by the grid it was built from and the gates, built once each (053). */
const SEALED = new WeakMap<readonly string[], Map<string, Room>>();

/** The room as movers meet it: its shut shot-stopping gates' tiles solid, like walls. */
export function sealedRoom(state: Pick<SimState, 'gates'>, room: Room): Room {
  const shut = shutShotGates(state, room.id);
  if (shut.length === 0) return room;
  const key = shut.join(',');
  let byGates = SEALED.get(room.rows);
  if (!byGates) SEALED.set(room.rows, (byGates = new Map()));
  let sealed = byGates.get(key);
  if (!sealed) {
    const rows = room.rows.map((r) => [...r]);
    for (const g of room.gateTiles ?? []) if (shut.includes(g.gate)) (rows[g.ty] ?? [])[g.tx] = TILE.wall;
    sealed = { ...room, rows: rows.map((r) => r.join('')) };
    byGates.set(key, sealed);
  }
  return sealed;
}

/** Recipes the player knows: each once what it's shown after (038) has been carried (067: never waiting on attunement). */
export function knownRecipe(state: { found: readonly string[] }, recipeId: string): boolean {
  return revealsOf(recipeDef(recipeId)).every((id) => state.found.includes(id));
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

/**
 * Notes the first full line (an entrance at its current cap, 024, 033) and the ruin field's clearing (067), and opens
 * gates whose condition now holds: the foundry's and the Hollows' on the shrine's claim (067, 034), the Emberworks' on
 * the Bulwark's first kill (060), the Stormcrown's on the Forgewright's (064).
 */
export function stepGates(state: SimState): void {
  const cap = entranceCap(state);
  if (!state.firstLineFull && state.link.entrances.some((e) => e.count >= cap)) state.firstLineFull = true;
  // 067: the field's last Husk killed (a death, not just an empty pack, so a start without the pack never counts), on
  // every start. The world pushes back (017): from then on the land fills with packs, but only on the real game's start,
  // whose gates start shut: the test starts past the tutorial keep their own `populated` (067.5: they start calm,
  // whatever is killed).
  if (!state.fieldCleared && state.events.deaths.some((d) => d.group === FIELD_GROUP) && !state.enemies.some((e) => e.group === FIELD_GROUP && e.health > 0)) {
    state.fieldCleared = true;
    if (!state.start.gatesOpen) state.populated = true;
  }
  if (!state.gates.foundry && state.claims.includes(SHRINE_SITE)) open(state, 'foundry');
  // Claiming the shrine's pylon drops the Hollows' barrier (034); claims are for good, so it never comes back.
  if (!state.gates.hollows && state.claims.includes(HOLLOWS.opensOn)) open(state, 'hollows');
  // 060: the Bulwark's first kill drops the Emberworks' barrier; boss defeats are for good, so it never comes back.
  if (!state.gates.emberworks && state.bossDefeats.includes(EMBERWORKS.opensOn)) open(state, 'emberworks');
  // 064: the Forgewright's first kill drops the Stormcrown's, for good the same way.
  if (!state.gates.stormcrown && state.bossDefeats.includes(STORMCROWN.opensOn)) open(state, 'stormcrown');
}

/**
 * 067: E at a door its gate seals, or a push into it, within SEALED_DOOR_REACH of its tile, says why (render shows the
 * gate's SEALED_DOOR_TEXT). E isn't taken: the door does nothing, as a sealed arena door doesn't.
 */
export function stepSealedDoors(state: SimState, cmd: Command): void {
  const p = state.player;
  for (const d of roomOf(state).doorways ?? []) {
    if (!d.gate || doorOpen(state, d.gate)) continue;
    const r = tileRect(d);
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const gapX = Math.max(0, Math.abs(dx) - (FEET_BOX.w + r.w) / 2);
    const gapY = Math.max(0, Math.abs(dy) - (FEET_BOX.h + r.h) / 2);
    if (Math.hypot(gapX, gapY) > SEALED_DOOR_REACH) continue;
    // A push into it: the move points at the door along the side it's met from.
    const pushed = gapY >= gapX ? Math.sign(cmd.moveY) === Math.sign(dy) && cmd.moveY !== 0 : Math.sign(cmd.moveX) === Math.sign(dx) && cmd.moveX !== 0;
    if (cmd.interact || pushed) state.events.sealedDoors.push({ gate: d.gate });
  }
}

/** Where a death wakes the player: the start room until the foundry is open (012), then the foundry (011). */
export function wakeRoom(state: Pick<SimState, 'gates' | 'start'>): string {
  return state.gates.foundry ? RESPAWN_ROOM : state.start.room;
}
