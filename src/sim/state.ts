import { TILE_SIZE } from '../data/config';
import { STARTING_INVENTORY } from '../data/player';
import { DEFAULT_ROOM, ROOMS, type Room } from '../data/rooms';
import type { ArrowState } from './arrows';
import type { Inventory } from './inventory';
import { createPlayer, type PlayerState } from './player';
import { createRng, type RngState } from './rng';
import { createTube, type TubeState } from './tube';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
  roomId: string;
  player: PlayerState;
  inventory: Inventory;
  tube: TubeState;
  /** Arrows in flight. */
  arrows: ArrowState[];
  /** Id for the next arrow fired. */
  nextArrowId: number;
}

export function createSim(seed: number, roomId = DEFAULT_ROOM): SimState {
  const player = createPlayer(tileCentre(roomOf({ roomId }).spawn));
  return {
    tick: 0,
    seed,
    rng: createRng(seed),
    roomId,
    player,
    inventory: { ...STARTING_INVENTORY },
    tube: createTube(),
    arrows: [],
    nextArrowId: 0,
  };
}

/** The pixel centre of a tile. */
export function tileCentre(t: { tx: number; ty: number }): { x: number; y: number } {
  return { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
}

/** A room's size in pixels. */
export function roomSize(room: Room): { width: number; height: number } {
  return { width: (room.rows[0]?.length ?? 0) * TILE_SIZE, height: room.rows.length * TILE_SIZE };
}

/** The room data the sim is in. Throws on an unknown id. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  const room = ROOMS[state.roomId];
  if (!room) throw new Error(`Unknown room '${state.roomId}'`);
  return room;
}
