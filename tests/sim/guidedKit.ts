import { GUIDED_BUILDS } from '../../src/data/guidedBuilds';
import { createPiece } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';

// 067: the first guided build, the arrow line from the ports (src/data/guidedBuilds.ts), laid straight into the
// foundry as a test fixture (as 046's example line was laid), where a test needs it standing rather than built.

/** Lays the arrow line's pieces as its ghosts say, ordinary pieces each, and stocks nothing: the ports feed it. */
export function layArrowLine(s: SimState): void {
  for (const g of GUIDED_BUILDS['arrow-line']) {
    if (g.kind !== 'place') continue;
    s.foundry.pieces.push(createPiece(s.foundry.nextPieceId++, g.piece, g.tx, g.ty, g.facing, g.inFrom ? { inFrom: g.inFrom } : {}));
  }
}
