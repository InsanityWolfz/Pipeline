import { TILE_SIZE } from '../data/config';
import { TILE, type Room } from '../data/rooms';

// Feet-box collision against a room's tile grid. Anything that isn't floor,
// including outside the grid, is solid.

export interface Box {
  w: number;
  h: number;
}

export function isSolid(room: Room, tx: number, ty: number): boolean {
  return room.rows[ty]?.[tx] !== TILE.floor;
}

/** True if a box centred on (cx, cy) overlaps a solid tile. Touching an edge is not overlap. */
export function boxHitsSolid(room: Room, cx: number, cy: number, box: Box): boolean {
  const x0 = Math.floor((cx - box.w / 2) / TILE_SIZE);
  const x1 = Math.ceil((cx + box.w / 2) / TILE_SIZE) - 1;
  const y0 = Math.floor((cy - box.h / 2) / TILE_SIZE);
  const y1 = Math.ceil((cy + box.h / 2) / TILE_SIZE) - 1;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (isSolid(room, tx, ty)) return true;
  }
  return false;
}

/**
 * Moves a box by (dx, dy), x first then y, stopping flush against solid tiles.
 * Moving one axis at a time is what lets a diagonal move slide along a wall.
 * Steps must be under a tile wide so nothing tunnels. Returns which axes hit.
 */
export function moveBox(
  room: Room,
  pos: { x: number; y: number },
  box: Box,
  dx: number,
  dy: number,
): { hitX: boolean; hitY: boolean } {
  const hitX = moveAxis(room, pos, box, dx, 'x');
  const hitY = moveAxis(room, pos, box, dy, 'y');
  return { hitX, hitY };
}

function moveAxis(room: Room, pos: { x: number; y: number }, box: Box, d: number, axis: 'x' | 'y'): boolean {
  if (d === 0) return false;
  const half = (axis === 'x' ? box.w : box.h) / 2;
  const next = pos[axis] + d;
  const nx = axis === 'x' ? next : pos.x;
  const ny = axis === 'y' ? next : pos.y;
  if (!boxHitsSolid(room, nx, ny, box)) {
    pos[axis] = next;
    return false;
  }
  // Snap flush to the edge of the tile that was hit.
  pos[axis] =
    d > 0 ? (Math.ceil((next + half) / TILE_SIZE) - 1) * TILE_SIZE - half : (Math.floor((next - half) / TILE_SIZE) + 1) * TILE_SIZE + half;
  return true;
}
