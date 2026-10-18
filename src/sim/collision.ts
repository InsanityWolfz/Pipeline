import { TILE_SIZE } from '../data/config';
import { SHOT_THROUGH, TILE, WALKABLE, type Room } from '../data/rooms';

// Feet-box collision against a room's tile grid and solid things standing in it.
// Anything that isn't floor, including outside the grid, is solid. Door tiles
// are solid too, except to a mover that passes `doors` (only the player).

export interface Box {
  w: number;
  h: number;
}

/** A solid box centred on (x, y), such as a gathering node's base. */
export interface Rect extends Box {
  x: number;
  y: number;
}

export function isSolid(room: Room, tx: number, ty: number, doors = false): boolean {
  const symbol = room.rows[ty]?.[tx];
  if (symbol !== undefined && WALKABLE.includes(symbol)) return false;
  return !(doors && symbol === TILE.door);
}

/** True if a tile stops shots: anything solid, except water, which shots fly over (017). */
export function blocksShot(room: Room, tx: number, ty: number): boolean {
  const symbol = room.rows[ty]?.[tx];
  if (symbol !== undefined && SHOT_THROUGH.includes(symbol)) return false;
  return isSolid(room, tx, ty);
}

/** True if a box centred on (cx, cy) overlaps a rect. Touching an edge is not overlap. */
export function overlapsRect(cx: number, cy: number, box: Box, r: Rect): boolean {
  return Math.abs(cx - r.x) < (box.w + r.w) / 2 && Math.abs(cy - r.y) < (box.h + r.h) / 2;
}

/** True if a box centred on (cx, cy) overlaps a solid tile. Touching an edge is not overlap. */
export function boxHitsSolid(room: Room, cx: number, cy: number, box: Box, doors = false): boolean {
  const x0 = Math.floor((cx - box.w / 2) / TILE_SIZE);
  const x1 = Math.ceil((cx + box.w / 2) / TILE_SIZE) - 1;
  const y0 = Math.floor((cy - box.h / 2) / TILE_SIZE);
  const y1 = Math.ceil((cy + box.h / 2) / TILE_SIZE) - 1;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (isSolid(room, tx, ty, doors)) return true;
  }
  return false;
}

/**
 * Moves a box by (dx, dy), x first then y, stopping flush against solid tiles
 * and obstacles. Moving one axis at a time is what lets a diagonal move slide
 * along a wall. Obstacles the box already overlaps don't stop it, so a body
 * never jumps out of one. Steps must be under a tile wide so nothing tunnels.
 * Returns which axes hit.
 */
export function moveBox(
  room: Room,
  pos: { x: number; y: number },
  box: Box,
  dx: number,
  dy: number,
  obstacles: readonly Rect[] = [],
  doors = false,
): { hitX: boolean; hitY: boolean } {
  const blocking = obstacles.filter((r) => !overlapsRect(pos.x, pos.y, box, r));
  const hitX = moveAxis(room, pos, box, dx, 'x', blocking, doors);
  const hitY = moveAxis(room, pos, box, dy, 'y', blocking, doors);
  return { hitX, hitY };
}

function moveAxis(
  room: Room,
  pos: { x: number; y: number },
  box: Box,
  d: number,
  axis: 'x' | 'y',
  obstacles: readonly Rect[],
  doors: boolean,
): boolean {
  if (d === 0) return false;
  const half = (axis === 'x' ? box.w : box.h) / 2;
  const next = pos[axis] + d;
  const nx = axis === 'x' ? next : pos.x;
  const ny = axis === 'y' ? next : pos.y;
  let stop: number | undefined;
  if (boxHitsSolid(room, nx, ny, box, doors)) {
    // Flush to the edge of the tile that was hit.
    stop =
      d > 0
        ? (Math.ceil((next + half) / TILE_SIZE) - 1) * TILE_SIZE - half
        : (Math.floor((next - half) / TILE_SIZE) + 1) * TILE_SIZE + half;
  }
  for (const r of obstacles) {
    if (!overlapsRect(nx, ny, box, r)) continue;
    const rHalf = (axis === 'x' ? r.w : r.h) / 2;
    const edge = d > 0 ? r[axis] - rHalf - half : r[axis] + rHalf + half;
    stop = stop === undefined ? edge : d > 0 ? Math.min(stop, edge) : Math.max(stop, edge);
  }
  if (stop === undefined) {
    pos[axis] = next;
    return false;
  }
  pos[axis] = stop;
  return true;
}
