import { TILE_SIZE } from '../data/config';
import { DEFAULT_REGION, ROOM_REGIONS } from '../data/drops';
import { regionAt } from '../data/hollows';
import { OVERWORLD_ROOM } from '../data/overworld';

// Which region a point is in (033, 034): a room's own region, except in the overworld,
// where Stonefall Hollows' columns are Region 2 and the rest is Region 1.

/** The region at a point of a room; with no point, the room's own (the overworld's is Region 1). */
export function regionOf(roomId: string, at?: { x: number; y: number }): number {
  if (roomId === OVERWORLD_ROOM && at) return regionAt(Math.floor(at.x / TILE_SIZE), Math.floor(at.y / TILE_SIZE));
  return ROOM_REGIONS[roomId] ?? DEFAULT_REGION;
}
