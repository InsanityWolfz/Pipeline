import { TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import type { SimState } from './state';
import { WORLD } from './world';

// Room data by id, the player's room and a room's size: plain lookups over the world's rooms (moved out of state.ts).

/** A room's size in pixels. */
export function roomSize(room: Room): { width: number; height: number } {
  return { width: (room.rows[0]?.length ?? 0) * TILE_SIZE, height: room.rows.length * TILE_SIZE };
}

/** Room data by id. Throws on an unknown id. */
export function roomById(roomId: string): Room {
  const room = WORLD[roomId];
  if (!room) throw new Error(`Unknown room '${roomId}'`);
  return room;
}

/** The room data the player is in. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  return roomById(state.roomId);
}
