import type { TilePos, TileRect } from '../data/tiles';
import { TILE } from '../data/rooms';

// The tile grid the overworld's generators write into (017, 034): rows of symbols, set
// one tile at a time, and the two-tile-wide dirt paths laid along polylines.

export type Grid = string[][];

export const inRect = (r: TileRect, tx: number, ty: number): boolean => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;

export function set(grid: Grid, tx: number, ty: number, symbol: string): void {
  const row = grid[ty];
  if (row && tx >= 0 && tx < row.length) row[tx] = symbol;
}

/** Sets every tile of a rect to `symbol`. */
export function fill(grid: Grid, r: TileRect, symbol: string): void {
  for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) set(grid, tx, ty, symbol);
}

/** Lays a two-tile-wide path along a tile polyline. */
export function path(grid: Grid, points: readonly TilePos[]): void {
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
    for (let s = 0; s <= steps; s++) {
      const tx = Math.round(a.tx + ((b.tx - a.tx) * s) / steps);
      const ty = Math.round(a.ty + ((b.ty - a.ty) * s) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) set(grid, tx + dx, ty + dy, TILE.path);
    }
  }
}
