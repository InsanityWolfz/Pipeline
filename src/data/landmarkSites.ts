import type { LandmarkDef } from './landmarks';

// The resource sites and the Ruined Cache (032): hand-placed landmarks in the empty
// outer ground. Each resource site is a dense cluster of one node (starting at 5) with a
// ley pylon guarded by one pack of its ring's makeup and a ley line home; the cache is a
// sealed reliquary in a broken ruin, guarded too. Tiles throughout.

const STAIRS = { tx: 81, ty: 21 } as const;

/** Stone (ring 1): boulders in a rock field among cut stone blocks. */
const QUARRY: LandmarkDef = {
  id: 'quarry',
  name: 'Quarry',
  kind: 'resource-site',
  ring: 1,
  area: { x0: 57, y0: 15, x1: 65, y1: 21 },
  // A rock field across the back and down the sides: each boulder in a pocket of grass with the field's rocks behind it.
  features: [
    { kind: 'rocks', cx: 58, cy: 16, r: 2.5 },
    { kind: 'rocks', cx: 61, cy: 15, r: 2.5 },
    { kind: 'rocks', cx: 64, cy: 16, r: 2.5 },
    { kind: 'rocks', cx: 59, cy: 19, r: 2 },
    { kind: 'rocks', cx: 63, cy: 19, r: 2 },
  ],
  nodes: [
    { nodeId: 'rubble', tx: 58, ty: 17 },
    { nodeId: 'rubble', tx: 61, ty: 16 },
    { nodeId: 'rubble', tx: 64, ty: 17 },
    { nodeId: 'rubble', tx: 59, ty: 20 },
    { nodeId: 'rubble', tx: 63, ty: 20 },
  ],
  // On the Quarry's west side, more than a view's half-width (10 tiles) from the ruin field's walls, so the
  // tutorial's fight there never wakes them.
  guards: [
    { enemyId: 'husk', tx: 57, ty: 18 },
    { enemyId: 'husk', tx: 58, ty: 19 },
    { enemyId: 'husk', tx: 59, ty: 21 },
    { enemyId: 'husk', tx: 60, ty: 21 },
  ],
  pylon: { tx: 61, ty: 20, site: 'quarry', supplies: ['stone'] },
  leyLine: [{ tx: 61, ty: 20 }, { tx: 67, ty: 21 }, { tx: 74, ty: 22 }, { tx: 79, ty: 22 }, STAIRS],
  blocks: [
    { tx: 57, ty: 21 },
    { tx: 58, ty: 21 },
    { tx: 65, ty: 21 },
    { tx: 64, ty: 21 },
    { tx: 57, ty: 20 },
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
  area: { x0: 44, y0: 15, x1: 51, y1: 23 },
  // Old trees thick round the west and north, each node in a pocket of grass with the grove behind it.
  features: [
    { kind: 'grove', cx: 45, cy: 16, r: 2.5 },
    { kind: 'grove', cx: 49, cy: 16, r: 2.5 },
    { kind: 'grove', cx: 47, cy: 19, r: 2.5 },
    { kind: 'grove', cx: 44.5, cy: 21, r: 2.5 },
    { kind: 'grove', cx: 50.5, cy: 20, r: 2 },
  ],
  nodes: [
    { nodeId: 'tree', tx: 45, ty: 17 },
    { nodeId: 'tree', tx: 49, ty: 17 },
    { nodeId: 'tree', tx: 47, ty: 20 },
    { nodeId: 'tree', tx: 45, ty: 22 },
    { nodeId: 'tree', tx: 50, ty: 21 },
  ],
  guards: [
    { enemyId: 'husk', tx: 46, ty: 18 },
    { enemyId: 'husk', tx: 49, ty: 23 },
    { enemyId: 'husk', tx: 46, ty: 21 },
    { enemyId: 'wisp', tx: 51, ty: 22 },
  ],
  pylon: { tx: 48, ty: 22, site: 'old-grove', supplies: ['wood'] },
  leyLine: [{ tx: 48, ty: 22 }, { tx: 55, ty: 24 }, { tx: 63, ty: 24 }, { tx: 72, ty: 23 }, { tx: 78, ty: 22 }, STAIRS],
  marker: 'site',
  look: { trees: 'old' },
};

/** Ley crystal (ring 2): veins where its ley lines cross in a sunken rock hollow, open to the sky. */
const LEY_GROTTO: LandmarkDef = {
  id: 'ley-grotto',
  name: 'Ley Grotto',
  kind: 'resource-site',
  ring: 2,
  area: { x0: 108, y0: 19, x1: 115, y1: 28 },
  features: [],
  nodes: [
    { nodeId: 'ley-vein', tx: 110, ty: 20 },
    { nodeId: 'ley-vein', tx: 114, ty: 20 },
    { nodeId: 'ley-vein', tx: 110, ty: 24 },
    { nodeId: 'ley-vein', tx: 114, ty: 24 },
    { nodeId: 'ley-vein', tx: 109, ty: 22 },
  ],
  // Deep in the hollow, out of sight of the shrine's approach above it.
  guards: [
    { enemyId: 'husk', tx: 112, ty: 26 },
    { enemyId: 'husk', tx: 113, ty: 27 },
    { enemyId: 'wisp', tx: 114, ty: 25 },
    { enemyId: 'wisp', tx: 110, ty: 25 },
  ],
  // In the hollow's upper half, so its 7-tile zone stops short of the Reed Marsh below.
  pylon: { tx: 112, ty: 22, site: 'ley-grotto', supplies: ['ley-crystal'] },
  leyLine: [{ tx: 112, ty: 22 }, { tx: 104, ty: 22 }, { tx: 95, ty: 22 }, { tx: 86, ty: 21 }, STAIRS],
  veinLines: [
    [{ tx: 109, ty: 19 }, { tx: 112, ty: 22 }],
    [{ tx: 115, ty: 19 }, { tx: 112, ty: 22 }],
    [{ tx: 109, ty: 25 }, { tx: 112, ty: 22 }],
    [{ tx: 115, ty: 25 }, { tx: 112, ty: 22 }],
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
  area: { x0: 110, y0: 30, x1: 115, y1: 39 },
  features: [
    { kind: 'pond', cx: 112.5, cy: 31.5, rx: 1.2, ry: 1.2 },
    { kind: 'pond', cx: 112.5, cy: 35, rx: 1.2, ry: 1.2 },
  ],
  nodes: [
    { nodeId: 'reeds', tx: 111, ty: 31 },
    { nodeId: 'reeds', tx: 114, ty: 32 },
    { nodeId: 'reeds', tx: 111, ty: 35 },
    { nodeId: 'reeds', tx: 114, ty: 35 },
    { nodeId: 'reeds', tx: 113, ty: 36 },
  ],
  guards: [
    { enemyId: 'husk', tx: 110, ty: 33 },
    { enemyId: 'husk', tx: 115, ty: 33 },
    { enemyId: 'husk', tx: 114, ty: 38 },
    { enemyId: 'wisp', tx: 115, ty: 37 },
  ],
  // South of the ponds, clear of their rims.
  pylon: { tx: 112, ty: 38, site: 'reed-marsh', supplies: ['fiber'] },
  leyLine: [{ tx: 112, ty: 38 }, { tx: 104, ty: 33 }, { tx: 94, ty: 28 }, { tx: 85, ty: 23 }, STAIRS],
  marker: 'site',
};

/** A sealed reliquary in a broken ruin, in the empty south-west corner. */
const RUINED_CACHE: LandmarkDef = {
  id: 'ruined-cache',
  name: 'Ruined Cache',
  kind: 'ruined-cache',
  ring: 2,
  area: { x0: 46, y0: 36, x1: 56, y1: 40 },
  features: [],
  nodes: [],
  guards: [
    { enemyId: 'husk', tx: 48, ty: 39 },
    { enemyId: 'husk', tx: 54, ty: 39 },
    { enemyId: 'husk', tx: 49, ty: 37 },
    { enemyId: 'husk', tx: 53, ty: 37 },
    { enemyId: 'wisp', tx: 51, ty: 40 },
  ],
  blocks: [
    { tx: 48, ty: 36 },
    { tx: 49, ty: 36 },
    { tx: 53, ty: 36 },
    { tx: 54, ty: 36 },
    { tx: 55, ty: 36 },
    { tx: 47, ty: 37 },
    { tx: 55, ty: 37 },
    { tx: 47, ty: 38 },
  ],
  cache: { tx: 51, ty: 38 },
  marker: 'cache',
};

export const SITES: readonly LandmarkDef[] = [QUARRY, OLD_GROVE, LEY_GROTTO, REED_MARSH, RUINED_CACHE];
