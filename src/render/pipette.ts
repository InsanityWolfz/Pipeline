import { rotateCw } from '../sim/direction';
import { pieceAt, type PieceState } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { unlockedPieces } from '../sim/placement';
import type { SimState } from '../sim/state';
import { stageOf } from '../sim/stages';

// 069: the pipette (Q in build mode, as Factorio's): the placed piece under the cursor goes into the hand with its
// facing and settings, ready to place: a conduit's turn (the side it takes from), a splitter's side, a stage's round.
// Over nothing the hand empties, so a click places nothing. Read from the sim's pieces; placing is the sim's as ever.

/** What's in hand: the piece, its facing, a splitter's side, a conduit's turn and a stage's round (null where none). */
export interface Hand {
  pieceId: string;
  facing: Facing;
  mirrored: boolean;
  turn: Facing | null;
  round: string | null;
}

/** The hand copied from a placed piece; null over nothing (the hand empties); undefined for a piece not on the bar (no change). */
export function handFrom(piece: PieceState | undefined, unlocked: readonly string[]): Hand | null | undefined {
  if (!piece) return null;
  if (!unlocked.includes(piece.pieceId)) return undefined;
  return {
    pieceId: piece.pieceId,
    facing: piece.facing,
    mirrored: piece.kind === 'splitter' && piece.mirrored,
    turn: piece.kind === 'conduit' ? piece.inFrom : null,
    round: piece.kind === 'machine' && stageOf(piece.pieceId) ? piece.made : null,
  };
}

/** R turns the ghost a quarter clockwise, and a held conduit's turn with it, so the corner keeps its shape. */
export function turnHand(facing: Facing, turn: Facing | null): { facing: Facing; turn: Facing | null } {
  return { facing: rotateCw(facing), turn: turn === null ? null : rotateCw(turn) };
}

/** What the pipette works on: the hand's holder (Controls), and the bar's selection (BuildView). */
export interface PipetteTargets {
  overWorld(): boolean;
  cursorTile(): { tx: number; ty: number };
  setHand(hand: Hand | null): void;
}

/** Q in build mode: the hand from the piece under the cursor (or emptied); returns the piece to select, null for none, undefined for no change. */
export function pipette(sim: SimState, at: PipetteTargets): string | null | undefined {
  if (!at.overWorld()) return undefined;
  const t = at.cursorTile();
  const hand = handFrom(pieceAt(sim.foundry, t.tx, t.ty), unlockedPieces(sim));
  if (hand === undefined) return undefined;
  at.setHand(hand);
  return hand?.pieceId ?? null;
}
