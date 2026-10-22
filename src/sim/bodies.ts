import { FOUNDRY_ROOM } from '../data/rooms';
import type { RoomBodies } from './separation';
import { fixtureRects, standingRects } from './fixtures';
import { nodeRects } from './nodes';
import { solidRects } from './pieces';
import { roomById, type SimState } from './state';
import { sealedRoom, tutorialRects } from './tutorial';

// What stands in a room's way: its tiles, plus the solid things on them.

/** A room's tiles and solid things: nodes, pylons and reliquaries (032), the tutorial's seals, and solid pieces and fixtures in the foundry. An arena's door (055) is a tile. */
export function roomBodies(state: SimState, roomId: string): RoomBodies {
  // 053: the barrier's circle is sealed in the grid, not as hundreds of boxes.
  const room = sealedRoom(state, roomById(roomId));
  const pieces = roomId === FOUNDRY_ROOM ? [...solidRects(state.foundry), ...fixtureRects(state.fixtures)] : [];
  const pylon = standingRects(roomById(roomId));
  const tutorial = tutorialRects(state, roomId);
  return { room, obstacles: [...nodeRects(state.nodes, roomId), ...pieces, ...pylon, ...tutorial] };
}
