import { ARENAS } from '../data/arenas';
import { TILE_SIZE } from '../data/config';
import type { EnemyDef } from '../data/enemies';
import { PAST_BARRIER } from '../data/hollows';
import type { GateId, Room } from '../data/rooms';
import { moveBox, type Box } from './collision';
import type { EnemyState } from './enemies';
import type { RoomBodies } from './separation';
import type { SimState } from './state';
import { insideTiles } from './tiles';
import { shutShotGates } from './tutorial';

// Flight (065: the thunderhawk). A flier moves over walls, cliffs, chasms and anything standing in the way, never
// blocked by terrain. It stays on its room's grid, out of every boss arena's walls in its room unless it is already
// inside (ground packs are kept out by those walls; a flier would cross them), and on its side of every shut barrier's
// line (review B1: a shut gate "blocks the player, enemies and every projectile", 060; the cliffs either side of its
// band stop feet, but a flier passes over them). Safe zones keep it out by position, as they do anyone (population.ts'
// `keepOut`).

/** True if the enemy flies. */
export const flies = (def: Pick<EnemyDef, 'flies'>): boolean => def.flies === true;

/** The boss arena (its index in ARENAS) whose walls hold a point in this room, or -1. */
const arenaAt = (roomId: string, x: number, y: number): number => ARENAS.findIndex((a) => a.rooms.includes(roomId) && insideTiles(a.bounds, x, y));

/** True if a straight move from a to b, px, crosses the line of any of these shut barriers. */
function crossesShut(shut: readonly GateId[], ax: number, ay: number, bx: number, by: number): boolean {
  for (const gate of shut) {
    const past = PAST_BARRIER[gate];
    if (past && past(Math.floor(ax / TILE_SIZE), Math.floor(ay / TILE_SIZE)) !== past(Math.floor(bx / TILE_SIZE), Math.floor(by / TILE_SIZE))) return true;
  }
  return false;
}

/**
 * Moves a flier's box by (dx, dy), x then y, stopping only at the grid's edge, an arena's walls it isn't inside, or
 * the line of a `shut` barrier. Returns which axes hit.
 */
export function flyBox(room: Room, roomId: string, pos: { x: number; y: number }, box: Box, dx: number, dy: number, shut: readonly GateId[] = []): { hitX: boolean; hitY: boolean } {
  const w = (room.rows[0]?.length ?? 0) * TILE_SIZE;
  const h = room.rows.length * TILE_SIZE;
  const wasIn = arenaAt(roomId, pos.x, pos.y) >= 0;
  const axis = (d: number, key: 'x' | 'y', half: number, max: number): boolean => {
    if (d === 0) return false;
    const want = pos[key] + d;
    const next = Math.min(Math.max(want, half), max - half);
    const nx = key === 'x' ? next : pos.x;
    const ny = key === 'y' ? next : pos.y;
    if (!wasIn && arenaAt(roomId, nx, ny) >= 0) return true;
    if (crossesShut(shut, pos.x, pos.y, nx, ny)) return true;
    pos[key] = next;
    return next !== want;
  };
  const hitX = axis(dx, 'x', box.w / 2, w);
  const hitY = axis(dy, 'y', box.h / 2, h);
  return { hitX, hitY };
}

/** Moves an enemy's feet box: a flier flies (flyBox), anything else walks against the room's tiles and obstacles (moveBox). */
export function moveBody(bodies: RoomBodies, e: EnemyState, def: Pick<EnemyDef, 'flies'>, box: Box, dx: number, dy: number): { hitX: boolean; hitY: boolean } {
  return flies(def) ? flyBox(bodies.room, e.roomId, e, box, dx, dy, bodies.shut) : moveBox(bodies.room, e, box, dx, dy, bodies.obstacles);
}

/** True if a flier can't reach the player: they're in its room beyond a shut barrier's line (review B1). It goes home. */
export function barredFrom(state: SimState, e: EnemyState): boolean {
  const p = state.player;
  return e.roomId === state.roomId && crossesShut(shutShotGates(state, e.roomId), e.x, e.y, p.x, p.y);
}

/** True if the player stands in a boss arena a flier isn't inside, so it can't fly in after them (review S5). */
export function walledFrom(state: SimState, e: EnemyState): boolean {
  const there = arenaAt(state.roomId, state.player.x, state.player.y);
  return there >= 0 && arenaAt(e.roomId, e.x, e.y) !== there;
}
