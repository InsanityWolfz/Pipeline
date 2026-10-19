import type { LandmarkDef } from './landmarks';

// The resource sites and the Ruined Cache (032): hand-placed landmarks in the empty
// outer ground. Each resource site is a dense cluster of one node (starting at 5) with a
// ley pylon guarded by one pack of its ring's makeup and a ley line home; the cache is a
// sealed reliquary in a broken ruin, guarded too. Tiles throughout.

const STAIRS = { tx: 41, ty: 21 } as const;

/** Stone (ring 1): boulders in a rock field among cut stone blocks. */
const QUARRY: LandmarkDef = {
  id: 'quarry',
  name: 'Quarry',
  kind: 'resource-site',
  ring: 1,
  area: { x0: 17, y0: 15, x1: 25, y1: 21 },
  // A rock field across the back and down the sides: each boulder in a pocket of grass with the field's rocks behind it.
  features: [
    { kind: 'rocks', cx: 18, cy: 16, r: 2.5 },
    { kind: 'rocks', cx: 21, cy: 15, r: 2.5 },
    { kind: 'rocks', cx: 24, cy: 16, r: 2.5 },
    { kind: 'rocks', cx: 19, cy: 19, r: 2 },
    { kind: 'rocks', cx: 23, cy: 19, r: 2 },
  ],
  nodes: [
    { nodeId: 'rubble', tx: 18, ty: 17 },
    { nodeId: 'rubble', tx: 21, ty: 16 },
    { nodeId: 'rubble', tx: 24, ty: 17 },
    { nodeId: 'rubble', tx: 19, ty: 20 },
    { nodeId: 'rubble', tx: 23, ty: 20 },
  ],
  guards: [
    { enemyId: 'husk', tx: 21, ty: 18 },
    { enemyId: 'husk', tx: 17, ty: 18 },
    { enemyId: 'husk', tx: 25, ty: 18 },
    { enemyId: 'husk', tx: 22, ty: 21 },
  ],
  pylon: { tx: 21, ty: 20, site: 'quarry', supplies: 'stone' },
  leyLine: [{ tx: 21, ty: 20 }, { tx: 27, ty: 21 }, { tx: 34, ty: 22 }, { tx: 39, ty: 22 }, STAIRS],
  blocks: [
    { tx: 17, ty: 21 },
    { tx: 18, ty: 21 },
    { tx: 25, ty: 21 },
    { tx: 24, ty: 21 },
    { tx: 17, ty: 20 },
  ],
  marker: 'site',
  look: { blocks: 'cut' },
};

/** Wood (ring 2): a sunlit grove of old trees on the west edge, between the Grotto's path and the forest. */
const OLD_GROVE: LandmarkDef = {
  id: 'old-grove',
  name: 'Old Grove',
  kind: 'resource-site',
  ring: 2,
  area: { x0: 4, y0: 15, x1: 11, y1: 23 },
  // Old trees thick round the west and north, each node in a pocket of grass with the grove behind it.
  features: [
    { kind: 'grove', cx: 5, cy: 16, r: 2.5 },
    { kind: 'grove', cx: 9, cy: 16, r: 2.5 },
    { kind: 'grove', cx: 7, cy: 19, r: 2.5 },
    { kind: 'grove', cx: 4.5, cy: 21, r: 2.5 },
    { kind: 'grove', cx: 10.5, cy: 20, r: 2 },
  ],
  nodes: [
    { nodeId: 'tree', tx: 5, ty: 17 },
    { nodeId: 'tree', tx: 9, ty: 17 },
    { nodeId: 'tree', tx: 7, ty: 20 },
    { nodeId: 'tree', tx: 5, ty: 22 },
    { nodeId: 'tree', tx: 10, ty: 21 },
  ],
  guards: [
    { enemyId: 'husk', tx: 6, ty: 18 },
    { enemyId: 'husk', tx: 9, ty: 23 },
    { enemyId: 'husk', tx: 6, ty: 21 },
    { enemyId: 'wisp', tx: 11, ty: 22 },
  ],
  pylon: { tx: 8, ty: 22, site: 'old-grove', supplies: 'wood' },
  leyLine: [{ tx: 8, ty: 22 }, { tx: 15, ty: 24 }, { tx: 23, ty: 24 }, { tx: 32, ty: 23 }, { tx: 38, ty: 22 }, STAIRS],
  marker: 'site',
  look: { trees: 'old' },
};

/** Ley crystal (ring 2): veins where its ley lines cross in a sunken rock hollow, open to the sky. */
const LEY_GROTTO: LandmarkDef = {
  id: 'ley-grotto',
  name: 'Ley Grotto',
  kind: 'resource-site',
  ring: 2,
  area: { x0: 68, y0: 19, x1: 75, y1: 28 },
  features: [],
  nodes: [
    { nodeId: 'ley-vein', tx: 70, ty: 21 },
    { nodeId: 'ley-vein', tx: 74, ty: 21 },
    { nodeId: 'ley-vein', tx: 70, ty: 27 },
    { nodeId: 'ley-vein', tx: 74, ty: 27 },
    { nodeId: 'ley-vein', tx: 69, ty: 24 },
  ],
  guards: [
    { enemyId: 'husk', tx: 71, ty: 22 },
    { enemyId: 'husk', tx: 73, ty: 26 },
    { enemyId: 'wisp', tx: 74, ty: 23 },
    { enemyId: 'wisp', tx: 70, ty: 25 },
  ],
  pylon: { tx: 72, ty: 24, site: 'ley-grotto', supplies: 'ley-crystal' },
  leyLine: [{ tx: 72, ty: 24 }, { tx: 64, ty: 23 }, { tx: 55, ty: 22 }, { tx: 46, ty: 21 }, STAIRS],
  veinLines: [
    [{ tx: 69, ty: 20 }, { tx: 72, ty: 24 }],
    [{ tx: 75, ty: 20 }, { tx: 72, ty: 24 }],
    [{ tx: 69, ty: 28 }, { tx: 72, ty: 24 }],
    [{ tx: 75, ty: 28 }, { tx: 72, ty: 24 }],
  ],
  marker: 'site',
  look: { hollow: 'ley' },
};

/** Fiber (ring 2): reeds round a cluster of ponds, past the south-east spring. */
const REED_MARSH: LandmarkDef = {
  id: 'reed-marsh',
  name: 'Reed Marsh',
  kind: 'resource-site',
  ring: 2,
  area: { x0: 70, y0: 30, x1: 75, y1: 39 },
  features: [
    { kind: 'pond', cx: 72.5, cy: 32, rx: 1.2, ry: 1.2 },
    { kind: 'pond', cx: 72.5, cy: 36.5, rx: 1.2, ry: 1.2 },
  ],
  nodes: [
    { nodeId: 'reeds', tx: 71, ty: 32 },
    { nodeId: 'reeds', tx: 74, ty: 32 },
    { nodeId: 'reeds', tx: 71, ty: 36 },
    { nodeId: 'reeds', tx: 74, ty: 37 },
    { nodeId: 'reeds', tx: 72, ty: 38 },
  ],
  guards: [
    { enemyId: 'husk', tx: 71, ty: 34 },
    { enemyId: 'husk', tx: 75, ty: 35 },
    { enemyId: 'husk', tx: 70, ty: 39 },
    { enemyId: 'wisp', tx: 75, ty: 31 },
  ],
  pylon: { tx: 73, ty: 34, site: 'reed-marsh', supplies: 'fiber' },
  leyLine: [{ tx: 73, ty: 34 }, { tx: 65, ty: 32 }, { tx: 54, ty: 28 }, { tx: 45, ty: 23 }, STAIRS],
  marker: 'site',
};

/** A sealed reliquary in a broken ruin, in the empty south-west corner. */
const RUINED_CACHE: LandmarkDef = {
  id: 'ruined-cache',
  name: 'Ruined Cache',
  kind: 'ruined-cache',
  ring: 2,
  area: { x0: 6, y0: 36, x1: 16, y1: 40 },
  features: [],
  nodes: [],
  guards: [
    { enemyId: 'husk', tx: 8, ty: 39 },
    { enemyId: 'husk', tx: 14, ty: 39 },
    { enemyId: 'husk', tx: 9, ty: 37 },
    { enemyId: 'husk', tx: 13, ty: 37 },
    { enemyId: 'wisp', tx: 11, ty: 40 },
  ],
  blocks: [
    { tx: 8, ty: 36 },
    { tx: 9, ty: 36 },
    { tx: 13, ty: 36 },
    { tx: 14, ty: 36 },
    { tx: 15, ty: 36 },
    { tx: 7, ty: 37 },
    { tx: 15, ty: 37 },
    { tx: 7, ty: 38 },
  ],
  cache: { tx: 11, ty: 38 },
  marker: 'cache',
};

export const SITES: readonly LandmarkDef[] = [QUARRY, OLD_GROVE, LEY_GROTTO, REED_MARSH, RUINED_CACHE];
