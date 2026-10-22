import { TILE_SIZE } from '../data/config';
import type { Room } from '../data/rooms';
import { blocksShot, isSolid, type Rect } from './collision';
import { footprintAt } from './footprints';

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

/**
 * 059: how far along the segment a → b (0..1) it enters a box, or null if it never does; touching an edge is not
 * entering, as with feet (overlapsRect) and shots (shotStopsAt).
 */
function entersRect(ax: number, ay: number, bx: number, by: number, r: Rect): number | null {
  let enter = 0;
  let exit = 1;
  for (const [a, d, c, half] of [
    [ax, bx - ax, r.x, r.w / 2],
    [ay, by - ay, r.y, r.h / 2],
  ] as const) {
    if (d === 0) {
      if (Math.abs(a - c) >= half) return null;
      continue;
    }
    const t0 = (c - half - a) / d;
    const t1 = (c + half - a) / d;
    enter = Math.max(enter, Math.min(t0, t1));
    exit = Math.min(exit, Math.max(t0, t1));
  }
  return enter < exit ? enter : null;
}

/**
 * Where along the segment a → b (0..1) it first meets what a tile stops, among the tiles `stops` says are solid, or
 * null when nothing: the tile's edge for one that blocks whole, its footprint for a small piece (059), the same box
 * feet and shots meet.
 */
function firstStop(room: Room, ax: number, ay: number, bx: number, by: number, stops: (tx: number, ty: number) => boolean): number | null {
  let at: number | null = null;
  walkTiles(ax, ay, bx, by, (tx, ty) => {
    if (!stops(tx, ty)) return false;
    const f = footprintAt(room, tx, ty);
    at = f === null ? tileEntry(ax, ay, bx, by, tx, ty) : entersRect(ax, ay, bx, by, f);
    return at !== null;
  });
  return at;
}

/** How far along the segment a → b (0..1) it enters a tile it passes through: the larger of the two axis entries. */
function tileEntry(ax: number, ay: number, bx: number, by: number, tx: number, ty: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = dx === 0 ? -Infinity : ((dx > 0 ? tx * TILE_SIZE : (tx + 1) * TILE_SIZE) - ax) / dx;
  const ey = dy === 0 ? -Infinity : ((dy > 0 ? ty * TILE_SIZE : (ty + 1) * TILE_SIZE) - ay) / dy;
  return Math.max(0, ex, ey);
}

/** True if nothing solid to feet lies on the straight line from a to b (035: the Charger's clear line; 059: footprints). */
export function clearGround(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  return firstStop(room, ax, ay, bx, by, (tx, ty) => isSolid(room, tx, ty)) === null;
}

/**
 * True if nothing that stops shots lies on the straight line from a to b (035: the Sniper's sight and cover): the
 * same boxes its bolt meets (059.5, Shaun: "shots match what's drawn").
 */
export function clearShot(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  return firstStop(room, ax, ay, bx, by, (tx, ty) => blocksShot(room, tx, ty)) === null;
}

/**
 * How far a shot from (x, y) along the unit (dx, dy) runs before something stops it, at most `range`, px: where the
 * line enters the first tile that stops shots, or a small piece's footprint (059.5), as its bolt does.
 */
export function shotReach(room: Room, x: number, y: number, dx: number, dy: number, range: number): number {
  const at = firstStop(room, x, y, x + dx * range, y + dy * range, (tx, ty) => blocksShot(room, tx, ty));
  return at === null ? range : Math.max(0, Math.min(range, at * range));
}
