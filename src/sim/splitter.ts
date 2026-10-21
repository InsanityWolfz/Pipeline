import { splitSide, type SplitterState } from './pieces';
import type { Facing } from './player';

// The splitter (033): the rules flow.ts asks about it. A splitter deals items out
// its front and its side in turn, falling back to the other when one won't take the item.

/** The outputs a splitter tries, in order: the one whose turn it is, then the other. */
export function splitterOrder(p: SplitterState): Facing[] {
  const side = splitSide(p);
  return p.next === 'front' ? [p.facing, side] : [side, p.facing];
}

/** After a splitter hands an item out of `used`, the other output's turn. */
export function afterSplit(p: SplitterState, used: Facing): void {
  p.next = used === p.facing ? 'side' : 'front';
}
