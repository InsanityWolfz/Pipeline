import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { recipeDef } from '../../src/data/recipes';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { place } from '../../src/sim/placement';
import type { Facing } from '../../src/sim/player';
import type { PieceState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { arena, movePlayer } from './fight';

// Foundry scenarios: the player stands in the foundry with every machine unlocked.

/** Where the player stands in a foundry test, clear of the pieces tests place. */
export const STAND = { tx: 20, ty: 13 } as const;

/** A sim with the player in the foundry at STAND and every machine unlocked. */
export function foundry(unlockAll = true): SimState {
  const s = arena();
  s.roomId = FOUNDRY_ROOM;
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
