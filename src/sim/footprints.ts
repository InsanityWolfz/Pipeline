import { TILE_SIZE } from '../data/config';
import { FOOTPRINTS } from '../data/footprints';
import type { Room } from '../data/rooms';
import type { Rect } from './collision';
import { pieceFrame } from './tileLook';

// A small terrain piece's footprint (059, 059.3): the box it blocks in place of its whole tile, from its drawn base
// (src/data/footprints.ts) clipped to the tile. Collision (src/sim/collision.ts) blocks feet and shots on it only
// there, and lines across the grid (src/sim/sightLine.ts) cross it only there.

const T = TILE_SIZE;

/** Each room's footprints by tile (ty * COLS + tx), worked out the first time a tile is asked for. */
const CACHE = new WeakMap<Room, Map<number, Rect | null>>();
const COLS = 1 << 16;

function compute(room: Room, tx: number, ty: number): Rect | null {
  const frame = pieceFrame(room, tx, ty);
  const f = frame === undefined ? undefined : FOOTPRINTS[frame];
  if (!f) return null;
  const cx = (tx + 0.5) * T;
  const bottom = (ty + 1) * T;
  const x0 = Math.max(tx * T, cx + f.x0);
  const x1 = Math.min((tx + 1) * T, cx + f.x1);
  const y0 = Math.max(ty * T, bottom + f.y0);
  const y1 = Math.min(bottom, bottom + f.y1);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/** The solid box of the piece on a tile, centred, in world px; null for a tile that blocks whole (or none at all). */
export function footprintAt(room: Room, tx: number, ty: number): Rect | null {
  if (room.rows[ty]?.[tx] === undefined || tx >= COLS) return null;
  let byTile = CACHE.get(room);
  if (!byTile) CACHE.set(room, (byTile = new Map()));
  const key = ty * COLS + tx;
  let f = byTile.get(key);
  if (f === undefined) byTile.set(key, (f = compute(room, tx, ty)));
  return f;
}
