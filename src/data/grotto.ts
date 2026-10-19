import type { TilePos, TileRect } from './tiles';

// The Frozen Grotto, minimal (029): a hand-placed site in the overworld's north-west,
// in ring 2, the guarded source of rime shards for the frost rune. A clearing with
// frosted ground, three rime clusters, a path north from the west path's end, and a
// guard pack in its own group. It has no pylon and can't be claimed, so its guards
// come back on every world reset. 032 later folds it into the landmark system
// without moving it (034 may shift every tile by +40 for Region 2).

/** Its guards' group: its landmark id (032). */
export const GROTTO_GROUP = 'frozen-grotto';

export const GROTTO = {
  /** The Grotto's clearing, kept open and frosted. */
  area: { x0: 49, y0: 5, x1: 59, y1: 13 } satisfies TileRect,
  /** Two tiles wide, from the west path's end north to the Grotto's mouth: that end becomes a fork. */
  path: [
    { tx: 52, ty: 27 },
    { tx: 54, ty: 14 },
  ] satisfies TilePos[],
  nodes: [
    { nodeId: 'rime-cluster', tx: 52, ty: 7 },
    { nodeId: 'rime-cluster', tx: 56, ty: 8 },
    { nodeId: 'rime-cluster', tx: 54, ty: 11 },
  ],
  /** The guard pack, placed by hand round the clusters: three Husks and a Wisp. */
  pack: [
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 51, ty: 10 },
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 57, ty: 11 },
    { group: GROTTO_GROUP, enemyId: 'husk', tx: 55, ty: 6 },
    { group: GROTTO_GROUP, enemyId: 'wisp', tx: 54, ty: 9 },
  ],
} as const;
