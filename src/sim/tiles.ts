import { TILE_SIZE } from '../data/config';

/** The pixel centre of a tile. */
export function tileCentre(t: { tx: number; ty: number }): { x: number; y: number } {
  return { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
}

/** True if a point, px, is inside a rect given in tiles (both ends inclusive). */
export function insideTiles(r: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number): boolean {
  return x >= r.x0 * TILE_SIZE && x < (r.x1 + 1) * TILE_SIZE && y >= r.y0 * TILE_SIZE && y < (r.y1 + 1) * TILE_SIZE;
}
