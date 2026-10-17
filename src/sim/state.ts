import { TILE_SIZE } from '../data/config';
import { DEFAULT_ROOM, ROOMS, type Room } from '../data/rooms';
import { createPlayer, type PlayerState } from './player';
import { createRng, type RngState } from './rng';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
  roomId: string;
  player: PlayerState;
}

export function createSim(seed: number, roomId = DEFAULT_ROOM): SimState {
  const { spawn } = roomOf({ roomId });
  const player = createPlayer({ x: (spawn.tx + 0.5) * TILE_SIZE, y: (spawn.ty + 0.5) * TILE_SIZE });
  return { tick: 0, seed, rng: createRng(seed), roomId, player };
}

/** The room data the sim is in. Throws on an unknown id. */
export function roomOf(state: Pick<SimState, 'roomId'>): Room {
  const room = ROOMS[state.roomId];
  if (!room) throw new Error(`Unknown room '${state.roomId}'`);
  return room;
}
