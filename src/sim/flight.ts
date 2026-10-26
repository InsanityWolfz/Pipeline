import { ARENAS } from '../data/arenas';
import { TILE_SIZE } from '../data/config';
import type { EnemyDef } from '../data/enemies';
import type { Room } from '../data/rooms';
import { moveBox, type Box, type Rect } from './collision';
import type { EnemyState } from './enemies';
import { insideTiles } from './tiles';

// Flight (065: the thunderhawk). A flier moves over walls, cliffs, chasms and anything standing in the way, never
// blocked by terrain. It stays on its room's grid, and out of every boss arena's walls in its room unless it is already
// inside (ground packs are kept out by those walls; a flier would cross them). Safe zones keep it out by position, as
// they do anyone (population.ts' `keepOut`).

/** True if the enemy flies. */
export const flies = (def: Pick<EnemyDef, 'flies'>): boolean => def.flies === true;

/** True if a point is inside the walls (bounds) of a boss arena standing in this room. */
const inArena = (roomId: string, x: number, y: number): boolean => ARENAS.some((a) => a.rooms.includes(roomId) && insideTiles(a.bounds, x, y));

/** Moves a flier's box by (dx, dy), x then y, stopping only at the grid's edge or an arena's walls it isn't inside. Returns which axes hit. */
export function flyBox(room: Room, roomId: string, pos: { x: number; y: number }, box: Box, dx: number, dy: number): { hitX: boolean; hitY: boolean } {
  const w = (room.rows[0]?.length ?? 0) * TILE_SIZE;
  const h = room.rows.length * TILE_SIZE;
  const wasIn = inArena(roomId, pos.x, pos.y);
  const axis = (d: number, key: 'x' | 'y', half: number, max: number): boolean => {
    if (d === 0) return false;
    const want = pos[key] + d;
    const next = Math.min(Math.max(want, half), max - half);
    const nx = key === 'x' ? next : pos.x;
    const ny = key === 'y' ? next : pos.y;
    if (!wasIn && inArena(roomId, nx, ny)) return true;
    pos[key] = next;
    return next !== want;
  };
  const hitX = axis(dx, 'x', box.w / 2, w);
  const hitY = axis(dy, 'y', box.h / 2, h);
  return { hitX, hitY };
}

/** Moves an enemy's feet box: a flier flies (flyBox), anything else walks against the room's tiles and obstacles (moveBox). */
export function moveBody(room: Room, e: EnemyState, def: Pick<EnemyDef, 'flies'>, box: Box, dx: number, dy: number, obstacles: readonly Rect[] = []): { hitX: boolean; hitY: boolean } {
  return flies(def) ? flyBox(room, e.roomId, e, box, dx, dy) : moveBox(room, e, box, dx, dy, obstacles);
}
