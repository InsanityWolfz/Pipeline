import { CONDUIT_TICKS, HOPPER_TICKS } from '../data/foundry';
import { frontTile, mergerInputs, sameTile, sideTile, sorterExit, splitSide, type MergerState, type PieceState, type SplitterState, type Tile } from './pieces';
import type { Facing } from './player';

// The splitter and the merger (033): the rules flow.ts asks about them. A splitter
// deals items out its front and its side in turn, falling back to the other when
// one won't take the item. A merger takes from its back, left and right in turn: an
// item offered from a side whose turn it isn't is taken only while the side whose
// turn it is has nothing ready for it, so no input starves and none waits on an empty one.

/** The outputs a splitter tries, in order: the one whose turn it is, then the other. */
export function splitterOrder(p: SplitterState): Facing[] {
  const side = splitSide(p);
  return p.next === 'front' ? [p.facing, side] : [side, p.facing];
}

/** After a splitter hands an item out of `used`, the other output's turn. */
export function afterSplit(p: SplitterState, used: Facing): void {
  p.next = used === p.facing ? 'side' : 'front';
}

/** Whether a piece has an item ready to hand into tile `to` this tick (what it would offer there when it acts). */
export function readyInto(p: PieceState, to: Tile): boolean {
  const done = (item: string | null, progress: number): boolean => item !== null && progress >= CONDUIT_TICKS;
  switch (p.kind) {
    case 'conduit':
    case 'merger':
      return done(p.item, p.progress) && sameTile(frontTile(p), to);
    case 'sorter':
      return p.item !== null && done(p.item, p.progress) && sameTile(sorterExit(p, p.item), to);
    case 'splitter':
      return done(p.item, p.progress) && sameTile(sideTile(p, splitterOrder(p)[0] ?? p.facing), to);
    case 'hopper':
      return p.item !== null && p.timer >= HOPPER_TICKS && sameTile(frontTile(p), to);
    case 'machine':
      return p.output > 0 && sameTile(frontTile(p), to);
    case 'crate':
      return false;
  }
}

/**
 * Whether an empty merger takes an item offered from tile `from` (one of its inputs), given the piece on each tile:
 * from the input whose turn it is always; from another only while the turn's input has nothing ready for it.
 * Returns the input's index (0 back, 1 left, 2 right), or -1 to refuse.
 */
export function mergerTakes(m: MergerState, from: Tile, pieceOn: (t: Tile) => PieceState | undefined): number {
  const inputs = mergerInputs(m.facing).map((side) => sideTile(m, side));
  const i = inputs.findIndex((t) => sameTile(t, from));
  if (i < 0 || m.item !== null) return -1;
  if (i === m.turn) return i;
  const turnTile = inputs[m.turn];
  const turnPiece = turnTile ? pieceOn(turnTile) : undefined;
  return turnPiece && readyInto(turnPiece, m) ? -1 : i;
}
