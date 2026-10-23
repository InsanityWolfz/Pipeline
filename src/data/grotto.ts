import { shiftRect, shiftTile, type Shift } from './place';
import type { TilePos, TileRect } from './tiles';
import { WORLD_SHIFT } from './worldShape';

// The Frozen Grotto, minimal (029): a hand-placed site in the overworld's north, in ring 2, the guarded source of
// rimestone for the frost rune. A clearing with frosted ground, three rime outcrops and a guard pack in its own
// group. 032 later folds it into the landmark system; 053 moved it whole to the round map's north (its road is in
// roads.ts). 055 (D.6) gives it a pylon, claimed like any site's (032), that sends rimestone home; until it's claimed
// its guards come back on every world reset.

/** Its guards' group: its landmark id (032). */
export const GROTTO_GROUP = 'frozen-grotto';

/** 053: the Grotto's layout as 029 drew it, moved whole to the north of the round map (bearing 352°, 36 tiles; 060: and with the centre). */
const SHIFT: Shift = { dx: 25 + WORLD_SHIFT.dx, dy: 39 + WORLD_SHIFT.dy };

export const GROTTO = {
  /** The Grotto's clearing, kept open and frosted. */
  area: shiftRect({ x0: 49, y0: 5, x1: 59, y1: 13 }, SHIFT) satisfies TileRect,
  nodes: [
    { nodeId: 'rime-outcrop', tx: 52, ty: 7 },
    { nodeId: 'rime-outcrop', tx: 56, ty: 8 },
    { nodeId: 'rime-outcrop', tx: 54, ty: 11 },
  ].map((n) => shiftTile(n, SHIFT)),
  /** The guard pack, placed by hand round the clusters: three Husks and a Wisp. */
  pack: [
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 51, ty: 10 },
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 57, ty: 11 },
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 55, ty: 6 },
    { group: GROTTO_GROUP, enemyId: 'wisp', tx: 54, ty: 9 },
  ].map((g) => shiftTile(g, SHIFT)),
  /** 055: its pylon, among the outcrops between the two upper ones, so all three stand in its safe zone. */
  pylon: shiftTile({ tx: 54, ty: 8 }, SHIFT),
} as const;

/** The Grotto's mouth: the middle of its south edge, where its road arrives. */
export const GROTTO_MOUTH: TilePos = { tx: Math.floor((GROTTO.area.x0 + GROTTO.area.x1) / 2), ty: GROTTO.area.y1 + 1 };
