import { TILE_SIZE } from '../data/config';

/** The pixel centre of a tile. */
export function tileCentre(t: { tx: number; ty: number }): { x: number; y: number } {
  return { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
}
