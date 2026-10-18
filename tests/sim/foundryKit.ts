import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { place } from '../../src/sim/placement';
import type { Facing } from '../../src/sim/player';
import type { PieceState } from '../../src/sim/pieces';
import { roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { arena, HALL, movePlayer } from './fight';

// Foundry scenarios: the player stands in the foundry with every machine unlocked.

/** Where the player stands in a foundry test, clear of the pieces tests place. */
export const STAND = { tx: 20, ty: 13 } as const;

/** A sim with the player in the foundry at STAND, the tube already attuned (so no attune holds them still), and every machine unlocked. */
export function foundry(unlockAll = true): SimState {
  const s = arena();
  s.roomId = FOUNDRY_ROOM;
  s.link.attuned = true;
  const at = tileCentre(STAND);
  movePlayer(s, at.x, at.y);
  if (unlockAll) {
    s.crafted = BUILD_BAR.flatMap((id) => {
      const def = PIECES[id];
      return def?.kind === 'machine' ? [recipeDef(def.recipeId).output.itemId] : [];
    });
  }
  return s;
}

/** Places a piece, failing the test if it can't go there. */
export function put<T extends PieceState = PieceState>(
  s: SimState,
  pieceId: string,
  tx: number,
  ty: number,
  facing: Facing = 'right',
): T {
  const placed = place(s, pieceId, tx, ty, facing);
  if (!placed) throw new Error(`can't place ${pieceId} at ${tx},${ty}: ${JSON.stringify(s.events.placeFails)}`);
  return placed as T;
}

/**
 * Steps the player out to the ruin hall's spawn, so they can fire:
 * the tube is quiet in the foundry (015). The foundry keeps running.
 */
export function stepOutside(s: SimState): SimState {
  s.roomId = HALL;
  const at = tileCentre(roomById(HALL).spawn);
  movePlayer(s, at.x, at.y);
  return s;
}
