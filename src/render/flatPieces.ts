import { CONDUIT_TICKS } from '../data/foundry';
import { TUNNEL_LOOK, TUNNEL_SPRITES } from '../data/foundryAssets';
import { RESEARCH_SPRITES } from '../data/researchAssets';
import { TILE_SIZE } from '../data/config';
import { facingVector } from '../sim/direction';
import { opposite } from '../sim/direction';
import { pieceRect, type SplitterState, type TunnelInState, type TunnelOutState } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { splitterOrder } from '../sim/splitter';

// How 033's splitter and 052's underground pair lie on the floor: the frame for their
// facing and flips, and where a riding item sits as it crosses.

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

/**
 * Where a riding item sits, world px: sliding in from its back to the middle, then out to the output whose turn it is.
 */
export function riderAt(p: SplitterState): { x: number; y: number } {
  const t = p.progress / CONDUIT_TICKS;
  const leaves = splitterOrder(p)[0] ?? p.facing;
  const [vx, vy] = facingVector(t < 0.5 ? opposite(p.facing) : leaves);
  const k = t < 0.5 ? 0.5 - t : t - 0.5;
  const r = pieceRect(p);
  return { x: Math.round(r.x + vx * k * TILE_SIZE), y: Math.round(r.y + vy * k * TILE_SIZE) };
}

/** An underground end's frame (052): the side sprite flows right, so facing left turns it round. */
export function tunnelLook(kind: 'tunnel-in' | 'tunnel-out', facing: Facing): { frame: string; flipX: boolean } {
  return { frame: TUNNEL_SPRITES[kind === 'tunnel-in' ? 'in' : 'out'][viewOf(facing)], flipX: facing === 'left' };
}

/**
 * Where a riding item sits on an underground end, world px: on an entrance, sliding from its back edge into the mouth;
 * on an exit, from the mouth out to its front edge.
 */
export function tunnelRiderAt(p: TunnelInState | TunnelOutState): { x: number; y: number } {
  const t = p.progress / CONDUIT_TICKS;
  const [vx, vy] = facingVector(p.facing);
  const { mouth } = TUNNEL_LOOK;
  const k = p.kind === 'tunnel-in' ? -0.5 + t * (0.5 + mouth) : -mouth + t * (0.5 + mouth);
  const r = pieceRect(p);
  return { x: Math.round(r.x + vx * k * TILE_SIZE), y: Math.round(r.y + vy * k * TILE_SIZE) };
}
