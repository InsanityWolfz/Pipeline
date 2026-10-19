import { CONDUIT_TICKS } from '../data/foundry';
import { RESEARCH_SPRITES } from '../data/researchAssets';
import { TILE_SIZE } from '../data/config';
import { facingVector } from '../sim/direction';
import { mergerInputs, pieceRect, type MergerState, type SplitterState } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { splitterOrder } from '../sim/splitMerge';

// How 033's splitter and merger lie on the floor: the frame for their facing and
// flips (as the sorter's, 015), and where a riding item sits as it crosses.

type View = 'side' | 'up' | 'down';
const viewOf = (f: Facing): View => (f === 'up' || f === 'down' ? f : 'side');

/**
 * A splitter's frame and flips: the side sprite flows right and splits down, so facing left turns it round; the
 * down and up sprites flip across their flow to split the other way.
 */
export function splitterLook(facing: Facing, mirrored: boolean): { frame: string; flipX: boolean; flipY: boolean } {
  const frame = RESEARCH_SPRITES.splitter[viewOf(facing)];
  if (facing === 'right') return { frame, flipX: false, flipY: mirrored };
  if (facing === 'left') return { frame, flipX: true, flipY: !mirrored };
  return { frame, flipX: mirrored, flipY: false };
}

/** A merger's frame and flips: it's the same either side, so facing left only turns the side sprite round. */
export function mergerLook(facing: Facing): { frame: string; flipX: boolean; flipY: boolean } {
  return { frame: RESEARCH_SPRITES.merger[viewOf(facing)], flipX: facing === 'left', flipY: false };
}

/**
 * Where a riding item sits, world px: sliding in from the edge it came by to the middle, then out to the edge it
 * leaves by (a splitter's output whose turn it is; a merger's front, having come in by the input it last took from).
 */
export function riderAt(p: SplitterState | MergerState): { x: number; y: number } {
  const t = p.progress / CONDUIT_TICKS;
  const inputs = mergerInputs(p.facing);
  const cameBy = p.kind === 'merger' ? (inputs[(p.turn + inputs.length - 1) % inputs.length] ?? inputs[0]) : inputs[0];
  const leaves = p.kind === 'splitter' ? (splitterOrder(p)[0] ?? p.facing) : p.facing;
  const [vx, vy] = facingVector(t < 0.5 ? (cameBy ?? p.facing) : leaves);
  const k = t < 0.5 ? 0.5 - t : t - 0.5;
  const r = pieceRect(p);
  return { x: Math.round(r.x + vx * k * TILE_SIZE), y: Math.round(r.y + vy * k * TILE_SIZE) };
}
