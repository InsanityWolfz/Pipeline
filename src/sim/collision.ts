import { TILE_SIZE } from '../data/config';
import { SHOT_THROUGH, TILE, WALKABLE, type Room } from '../data/rooms';
import { footprintAt } from './footprints';

// Feet-box collision against a room's tile grid and solid things standing in it.
// Anything that isn't floor, including outside the grid, is solid. Door tiles
// are solid too, except to a mover that passes `doors` (only the player).
// 059: a small terrain piece (a rock, a ruin stone, a pillar…) blocks feet and shots only over its footprint, the box
// of its drawn base (src/sim/footprints.ts), so a body standing in the top of its tile can shoot and be shot; lines
// across the grid (src/sim/sightLine.ts: a punch's reach, the Charger's run, the Sniper's sight, cover and laser) meet
// the same box (059.5, Shaun: "shots match what's drawn"). Its tile stays solid to whatever reads whole tiles (drops,
// spawning, free tiles to stand on).

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

/** 059: true if a point stops a shot: a tile that stops shots, only within its footprint if it has one. */
export function shotStopsAt(room: Room, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (!blocksShot(room, tx, ty)) return false;
  const f = footprintAt(room, tx, ty);
  return f === null || (Math.abs(x - f.x) < f.w / 2 && Math.abs(y - f.y) < f.h / 2);
}

/** The tiles a box centred on (cx, cy) overlaps, as a range. */
function tilesUnder(cx: number, cy: number, box: Box): { x0: number; x1: number; y0: number; y1: number } {
  return {
    x0: Math.floor((cx - box.w / 2) / TILE_SIZE),
    x1: Math.ceil((cx + box.w / 2) / TILE_SIZE) - 1,
    y0: Math.floor((cy - box.h / 2) / TILE_SIZE),
    y1: Math.ceil((cy + box.h / 2) / TILE_SIZE) - 1,
  };
}

/** True if a box centred on (cx, cy) overlaps a solid tile that blocks whole (one with no footprint). */
function hitsWholeTile(room: Room, cx: number, cy: number, box: Box, doors: boolean): boolean {
  const r = tilesUnder(cx, cy, box);
  for (let ty = r.y0; ty <= r.y1; ty++) {
    for (let tx = r.x0; tx <= r.x1; tx++) if (isSolid(room, tx, ty, doors) && footprintAt(room, tx, ty) === null) return true;
  }
  return false;
}

/** The footprints (059) of the small pieces on the tiles a box centred on (cx, cy) overlaps. */
function footprintsUnder(room: Room, cx: number, cy: number, box: Box): Rect[] {
  const r = tilesUnder(cx, cy, box);
  const out: Rect[] = [];
  for (let ty = r.y0; ty <= r.y1; ty++) {
    for (let tx = r.x0; tx <= r.x1; tx++) {
      const f = isSolid(room, tx, ty) ? footprintAt(room, tx, ty) : null;
      if (f) out.push(f);
    }
  }
  return out;
}

/** True if a box centred on (cx, cy) overlaps a solid tile, or a small piece's footprint (059). Touching an edge is not overlap. */
export function boxHitsSolid(room: Room, cx: number, cy: number, box: Box, doors = false): boolean {
  return hitsWholeTile(room, cx, cy, box, doors) || footprintsUnder(room, cx, cy, box).some((f) => overlapsRect(cx, cy, box, f));
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
  // 059: the footprints of small pieces round the move stop it like obstacles.
  const reach = { w: box.w + 2 * Math.abs(dx), h: box.h + 2 * Math.abs(dy) };
  const all = [...obstacles, ...footprintsUnder(room, pos.x, pos.y, reach)];
  const blocking = all.filter((r) => !overlapsRect(pos.x, pos.y, box, r));
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
  if (hitsWholeTile(room, nx, ny, box, doors)) {
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
