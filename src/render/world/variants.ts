import { DECOR, RUIN_VARIANTS, type RuinVariant } from '../../data/decor';
import { EMBERWORKS_SPRITES } from '../../data/emberworksAssets';
import { TILE } from '../../data/rooms';
import { saltedHash } from './decorPlace';

// 077: ruin variants, picked in render from the frame a solid tile already draws (059's `pieceFrame` for rocks and
// ruin blocks, the regions' pickers for rubble, chimneys, kilns, rods and cairns), within the same piece class. The
// sim reads collision from the base frame, and a variant draws the same base, so every footprint stays as it is.
// Pure: the tile's salted hash and where it stands.

const byBase = new Map<string, RuinVariant>(RUIN_VARIANTS.flatMap((v) => v.base.map((b) => [b, v] as const)));

/** True for a front kiln at the east end of its row (the kiln east of it isn't a front kiln): where a brick pile can lie. */
function kilnRowEnd(rows: readonly string[], tx: number, ty: number): boolean {
  const right = rows[ty]?.[tx + 1];
  return !(right === TILE.kiln && rows[ty + 1]?.[tx + 1] !== TILE.kiln);
}

/** The frame a tile draws: its base frame, or a variant of it on the variant set's share of tiles. */
export function variantFrame(rows: readonly string[], base: string, tx: number, ty: number): string {
  const v = byBase.get(base);
  if (!v) return base;
  if (base === EMBERWORKS_SPRITES.kiln && !kilnRowEnd(rows, tx, ty)) return base;
  const h = saltedHash(tx, ty, DECOR.salts.variant);
  const [n, d] = v.share;
  if (h % d >= n) return base;
  const frames = v.frames(base);
  return frames[(h >>> 8) % frames.length] ?? base;
}

/** The base frame a variant replaces (itself for a base frame), for tests and the piece class. */
export function baseOfVariant(frame: string): string {
  for (const v of RUIN_VARIANTS) for (const b of v.base) if (v.frames(b).includes(frame)) return b;
  return frame;
}
