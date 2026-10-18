import { FEET_BOX } from '../data/player';
import { TILE_SIZE } from '../data/config';
import { overlapsRect } from './collision';
import { roomById, roomOf, type SimState } from './state';
import { tileCentre } from './tiles';

// Doors in a room's outer wall. Walking into one takes the player to the door
// it links to, standing on the floor tile just inside it.

/** The floor tile inward of a room's door: the door's neighbour away from the edge it sits on. */
export function arrivalTile(roomId: string, door: number): { tx: number; ty: number } {
  const room = roomById(roomId);
  const d = room.doorways?.[door];
  if (!d) throw new Error(`Room '${roomId}' has no door ${door}`);
  const w = room.rows[0]?.length ?? 0;
  if (d.tx === 0) return { tx: 1, ty: d.ty };
  if (d.tx === w - 1) return { tx: d.tx - 1, ty: d.ty };
  if (d.ty === 0) return { tx: d.tx, ty: 1 };
  return { tx: d.tx, ty: d.ty - 1 };
}

const TILE_BOX = { w: TILE_SIZE, h: TILE_SIZE } as const;

/** Runs after the player moves: a feet box overlapping a door tile goes through it. */
export function stepDoorways(state: SimState): void {
  const p = state.player;
  for (const d of roomOf(state).doorways ?? []) {
    const { x, y } = tileCentre(d);
    if (!overlapsRect(p.x, p.y, FEET_BOX, { x, y, ...TILE_BOX })) continue;
    const from = state.roomId;
    state.roomId = d.to;
    const at = tileCentre(arrivalTile(d.to, d.toDoor));
    p.x = at.x;
    p.y = at.y;
    p.vx = 0;
    p.vy = 0;
    state.events.roomChanges.push({ from, to: d.to });
    return;
  }
}
