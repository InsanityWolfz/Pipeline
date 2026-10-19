import { FOUNDRY_ROOM } from '../data/rooms';
import type { RoomBodies } from './enemies';
import { fixtureRects, tileRect } from './fixtures';
import { nodeRects } from './nodes';
import { solidRects } from './pieces';
import { roomById, type SimState } from './state';
import { tutorialRects } from './tutorial';

// What stands in a room's way: its tiles, plus the solid things on them.

/** A room's tiles and solid things: nodes, pylons and reliquaries (032), the tutorial's seals, and solid pieces and fixtures in the foundry. */
export function roomBodies(state: SimState, roomId: string): RoomBodies {
  const room = roomById(roomId);
  const pieces = roomId === FOUNDRY_ROOM ? [...solidRects(state.foundry), ...fixtureRects(state.fixtures)] : [];
  const pylon = [...(room.pylons ?? []), ...(room.caches ?? [])].map(tileRect);
  const tutorial = tutorialRects(state, roomId);
  return { room, obstacles: [...nodeRects(state.nodes, roomId), ...pieces, ...pylon, ...tutorial] };
}
