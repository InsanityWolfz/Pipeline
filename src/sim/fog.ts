import { TILE_SIZE } from '../data/config';
import { OVERWORLD, OVERWORLD_ROOM } from '../data/overworld';
import { viewRect } from './population';
import type { SimState } from './state';

// The minimap's fog of war (051, B.5, 051.1): an overworld tile is revealed once it has been on screen (the camera's
// view, as discovery's, 032), for good. Kept as a bitmap in the state, 32 tiles to a number, row by row, so it saves.

const BITS = 32;
const TILES = OVERWORLD.width * OVERWORLD.height;

/** A fogged overworld: every tile hidden. */
export const createFog = (): number[] => Array.from({ length: Math.ceil(TILES / BITS) }, () => 0);

/** True once an overworld tile has been on screen. Outside the map, never. */
export function revealed(fog: readonly number[], tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= OVERWORLD.width || ty >= OVERWORLD.height) return false;
  const i = ty * OVERWORLD.width + tx;
  return (((fog[Math.floor(i / BITS)] ?? 0) >>> i % BITS) & 1) === 1;
}

/** Once a tick, after the player moves: every overworld tile in the camera's view is revealed. */
export function stepFog(state: SimState): void {
  if (state.roomId !== OVERWORLD_ROOM) return;
  const v = viewRect(state);
  const x0 = Math.max(0, Math.floor(v.x0 / TILE_SIZE));
  const y0 = Math.max(0, Math.floor(v.y0 / TILE_SIZE));
  const x1 = Math.min(OVERWORLD.width - 1, Math.ceil(v.x1 / TILE_SIZE) - 1);
  const y1 = Math.min(OVERWORLD.height - 1, Math.ceil(v.y1 / TILE_SIZE) - 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ty * OVERWORLD.width + tx;
      const w = Math.floor(i / BITS);
      state.fog[w] = ((state.fog[w] ?? 0) | (1 << i % BITS)) >>> 0;
    }
  }
}
