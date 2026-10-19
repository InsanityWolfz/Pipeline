import { TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import { blocksShot, isSolid } from './collision';

// Lines across the tile grid (035): whether a straight line between two points crosses a
// tile that stops feet or shots, walking exactly the tiles the segment passes through
// (a DDA walk), so it is deterministic and cheap enough to run every tick.

/** Calls `visit` with each tile the segment a → b passes through, in order, until it returns true; returns whether one did. */
function walkTiles(ax: number, ay: number, bx: number, by: number, visit: (tx: number, ty: number) => boolean): boolean {
  let tx = Math.floor(ax / TILE_SIZE);
  let ty = Math.floor(ay / TILE_SIZE);
  const ex = Math.floor(bx / TILE_SIZE);
  const ey = Math.floor(by / TILE_SIZE);
  const dx = bx - ax;
  const dy = by - ay;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  // Distance along the segment (0..1) to the next tile edge on each axis, and between edges.
  const stepX = dx === 0 ? Infinity : Math.abs(TILE_SIZE / dx);
  const stepY = dy === 0 ? Infinity : Math.abs(TILE_SIZE / dy);
  let nextX = dx === 0 ? Infinity : ((sx > 0 ? (tx + 1) * TILE_SIZE - ax : ax - tx * TILE_SIZE) / Math.abs(dx));
  let nextY = dy === 0 ? Infinity : ((sy > 0 ? (ty + 1) * TILE_SIZE - ay : ay - ty * TILE_SIZE) / Math.abs(dy));
  if (visit(tx, ty)) return true;
  while (tx !== ex || ty !== ey) {
    if (nextX < nextY) {
      if (nextX > 1) break;
      tx += sx;
      nextX += stepX;
    } else {
      if (nextY > 1) break;
      ty += sy;
      nextY += stepY;
    }
    if (visit(tx, ty)) return true;
  }
  return false;
}

/** True if no tile solid to feet lies on the straight line from a to b (035: the Charger's clear line). */
export function clearGround(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  return !walkTiles(ax, ay, bx, by, (tx, ty) => isSolid(room, tx, ty));
}

/** True if no tile that stops shots lies on the straight line from a to b (035: the Sniper's sight and cover). */
export function clearShot(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  return !walkTiles(ax, ay, bx, by, (tx, ty) => blocksShot(room, tx, ty));
}

/**
 * How far a shot from (x, y) along the unit (dx, dy) runs before a tile stops it, at most `range`, px: the point where
 * the line enters the first tile that stops shots.
 */
export function shotReach(room: Room, x: number, y: number, dx: number, dy: number, range: number): number {
  let reach = range;
  walkTiles(x, y, x + dx * range, y + dy * range, (tx, ty) => {
    if (!blocksShot(room, tx, ty)) return false;
    // Where the line enters this tile: the larger of the two axis entry distances.
    const ex = dx === 0 ? -Infinity : ((dx > 0 ? tx * TILE_SIZE : (tx + 1) * TILE_SIZE) - x) / dx;
    const ey = dy === 0 ? -Infinity : ((dy > 0 ? ty * TILE_SIZE : (ty + 1) * TILE_SIZE) - y) / dy;
    reach = Math.max(0, Math.min(range, Math.max(ex, ey)));
    return true;
  });
  return reach;
}
