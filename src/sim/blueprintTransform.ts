import { pieceDef } from '../data/pieces';
import type { Blueprint, BlueprintPiece } from './blueprints';
import { rotateCw } from './direction';
import type { Facing } from './player';

// Turning and mirroring a blueprint (063), pure. A ghost is held as (mirror, then `turns` quarter turns clockwise), so
// any mix of R and the flip key comes down to one form (render's BlueprintInput keeps it). Tiles stay inside the box,
// which turns with them; a 3x1 piece keeps its middle tile, and its footprint follows its facing.

type Shape = Pick<Blueprint, 'w' | 'h' | 'pieces'>;

const SWAP: Readonly<Record<Facing, Facing>> = { left: 'right', right: 'left', up: 'up', down: 'down' };

/** The blueprint mirrored left to right: columns reversed, left and right swapped, a splitter's side flipped. */
function mirror(bp: Shape): Shape {
  return {
    w: bp.w,
    h: bp.h,
    pieces: bp.pieces.map((p) => {
      const out: BlueprintPiece = { ...p, dx: bp.w - 1 - p.dx, facing: SWAP[p.facing] };
      if (p.inFrom) out.inFrom = SWAP[p.inFrom];
      if (pieceDef(p.pieceId).kind === 'splitter') {
        if (p.mirrored) delete out.mirrored;
        else out.mirrored = true;
      }
      return out;
    }),
  };
}

/** The blueprint turned a quarter clockwise: (x, y) to (h-1-y, x), facings and conduit sides turned. */
function turn(bp: Shape): Shape {
  return {
    w: bp.h,
    h: bp.w,
    pieces: bp.pieces.map((p) => {
      const out: BlueprintPiece = { ...p, dx: bp.h - 1 - p.dy, dy: p.dx, facing: rotateCw(p.facing) };
      if (p.inFrom) out.inFrom = rotateCw(p.inFrom);
      return out;
    }),
  };
}

/** The blueprint mirrored (if `mirrored`), then turned `turns` quarters clockwise. */
export function transformBlueprint(bp: Shape, turns: number, mirrored: boolean): Shape {
  let out: Shape = mirrored ? mirror(bp) : { w: bp.w, h: bp.h, pieces: bp.pieces.map((p) => ({ ...p })) };
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) out = turn(out);
  return out;
}
