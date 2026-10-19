import { TILE_SIZE } from '../data/config';
import { LANDMARK_LIST } from '../data/landmarks';
import { OVERWORLD_ROOM, type TileRect } from '../data/overworld';
import { viewRect } from './population';
import type { SimState } from './state';

// Discovery (032): a landmark is found the first tick any part of its area is in the
// camera's view, recorded once ever (037 turns the event into XP) and kept through a KO.
// The shrine and the foundry aren't landmarks: the tutorial finds them.

/** True if any of a tile rect in the overworld is in the camera's view this tick. */
export function areaInView(state: SimState, area: TileRect): boolean {
  if (state.roomId !== OVERWORLD_ROOM) return false;
  const v = viewRect(state);
  return area.x0 * TILE_SIZE < v.x1 && (area.x1 + 1) * TILE_SIZE > v.x0 && area.y0 * TILE_SIZE < v.y1 && (area.y1 + 1) * TILE_SIZE > v.y0;
}

/** Once per tick, after the player moves: records every landmark seen for the first time. */
export function stepDiscovery(state: SimState): void {
  if (state.roomId !== OVERWORLD_ROOM) return;
  for (const l of LANDMARK_LIST) {
    if (state.discovered.includes(l.id) || !areaInView(state, l.area)) continue;
    state.discovered.push(l.id);
    state.events.discoveries.push({ landmark: l.id });
  }
}
