import { TILE_SIZE } from '../data/config';
import { HOLLOWS } from '../data/hollows';
import { OVERWORLD, OVERWORLD_ROOM } from '../data/overworld';
import type { TilePos } from '../data/tiles';
import { viewRect } from './population';
import type { SimState } from './state';

// The minimap's fog of war (051, B.5, 051.1): an overworld tile is revealed once it has been on screen (the camera's
// view, as discovery's, 032), for good. Kept as a bitmap in the state, 32 tiles to a number, row by row, so it saves.

/** Tiles to a number in the bitmap. */
export const FOG_BITS = 32;
const BITS = FOG_BITS;
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

/** Each tile revealed in `fog` that `before` (an earlier copy of it) didn't have, row by row. */
export function revealedSince(fog: readonly number[], before: readonly number[]): TilePos[] {
  const out: TilePos[] = [];
  for (const [w, bits] of fog.entries()) {
    const fresh = (bits & ~(before[w] ?? 0)) >>> 0;
    if (fresh === 0) continue;
    for (let b = 0; b < BITS; b++) {
      if (((fresh >>> b) & 1) === 0) continue;
      const i = w * BITS + b;
      out.push({ tx: i % OVERWORLD.width, ty: Math.floor(i / OVERWORLD.width) });
    }
  }
  return out;
}

/** The Bulwark's arena's middle tile, where the minimap shows it. */
export const ARENA_MID: TilePos = {
  tx: Math.floor((HOLLOWS.arena.bounds.x0 + HOLLOWS.arena.bounds.x1) / 2),
  ty: Math.floor((HOLLOWS.arena.bounds.y0 + HOLLOWS.arena.bounds.y1) / 2),
};

/**
 * The places the minimap shows once seen (051.8): the foundry's stairs and the shrine's pylon once their tile has been
 * revealed, the Bulwark's arena once its middle or its start has.
 */
export function seenPlaces(fog: readonly number[]): { entrance: boolean; shrine: boolean; arena: boolean } {
  const seen = (t: TilePos) => revealed(fog, t.tx, t.ty);
  return { entrance: seen(OVERWORLD.entrance.door), shrine: seen(OVERWORLD.shrine.pylon), arena: seen(ARENA_MID) || seen(HOLLOWS.arena.start) };
}
