// The overworld (017): one open map, about 4×4 screens, like Realm of the Mad God.
// The terrain is generated from `seed` by src/sim/overworldGen.ts, so every run
// gets the same map; the landmarks below are placed by hand and override it.
// Tile coordinates throughout. Numbers are tuning values.

import { GROTTO } from './grotto';
import { LANDMARK_LIST } from './landmarks';
import { SAFE_RADIUS } from './population';
import { SPRINGS } from './springs';
import type { Feature, TilePos, TileRect } from './tiles';

export type { Feature, TilePos, TileRect } from './tiles';
export { SPRING_CLEARING, SPRING_RADIUS, type SpringDef } from './springs';

export const OVERWORLD_ROOM = 'overworld';

/** The foundry entrance: the stairs' door tile, and the tile you arrive on coming out. */
const ENTRANCE: TilePos = { tx: 40, ty: 20 };

/** The shrine site: an open-air ruin in ring 2, walled, with a 3-tile gap at the bottom. */
const SHRINE: TileRect = { x0: 58, y0: 3, x1: 74, y1: 15 };
const SHRINE_GAP = [65, 66, 67] as const;

/** Broken walls of the ruin field around the entrance: runs of wall with gaps. */
const FIELD_WALLS: readonly TilePos[] = [
  ...[31, 32, 33, 36, 37, 43, 44, 47, 48, 49].map((tx) => ({ tx, ty: 12 })),
  ...[13, 14, 17, 18].map((ty) => ({ tx: 31, ty })),
  ...[13, 14, 15, 18, 19].map((ty) => ({ tx: 49, ty })),
  { tx: 34, ty: 16 },
  { tx: 46, ty: 16 },
];

/** The mound the stairs sink into: ruin blocks around the door. */
const MOUND: readonly TilePos[] = [
  { tx: 38, ty: 19 },
  { tx: 39, ty: 19 },
  { tx: 41, ty: 19 },
  { tx: 42, ty: 19 },
  { tx: 39, ty: 18 },
  { tx: 40, ty: 18 },
  { tx: 41, ty: 18 },
  { tx: 38, ty: 20 },
  { tx: 39, ty: 20 },
  { tx: 41, ty: 20 },
  { tx: 42, ty: 20 },
];

/** Each landmark pylon's ley line home (032), by landmark id, and the seams crossing at it, `<id>-<n>`. */
const LANDMARK_LINES: Readonly<Record<string, readonly TilePos[]>> = Object.fromEntries(
  LANDMARK_LIST.flatMap((l) => [...(l.leyLine ? [[l.id, l.leyLine] as const] : []), ...(l.veinLines ?? []).map((v, i) => [`${l.id}-${i}`, v] as const)]),
);

function shrineWalls(): TilePos[] {
  const out: TilePos[] = [];
  for (let tx = SHRINE.x0; tx <= SHRINE.x1; tx++) {
    // The back wall is whole; the front wall leaves the gate gap and two fallen stretches.
    out.push({ tx, ty: SHRINE.y0 });
    if (!(SHRINE_GAP as readonly number[]).includes(tx) && tx !== 61 && tx !== 71) out.push({ tx, ty: SHRINE.y1 });
  }
  for (let ty = SHRINE.y0 + 1; ty < SHRINE.y1; ty++) {
    if (ty === 9) continue;
    out.push({ tx: SHRINE.x0, ty });
    out.push({ tx: SHRINE.x1, ty });
  }
  return out;
}

export const OVERWORLD = {
  id: OVERWORLD_ROOM,
  width: 80,
  height: 45,
  seed: 20261018,
  /** The map edge: this many tiles of dense forest, ragged by up to `ragged` more; the first ragged tile fills at `raggedChance`, halving outward. */
  edge: { depth: 2, ragged: 2, raggedChance: 0.5 },
  /** Danger rings by straight-line distance in tiles from the foundry entrance: ring 0 inside the first bound, ring 1 inside the second, ring 2 beyond. */
  rings: { centre: ENTRANCE, bounds: [17, 26] as const },
  /** Generated features. Radii in tiles; density is the chance a tile near the centre fills. */
  /** `rim`: how much thinner a cluster is at its rim than its middle (0 even, 1 empty). */
  groves: { count: 18, radius: [3, 7] as const, density: 0.75, rim: 0.6 },
  rockFields: { count: 8, radius: [2, 4] as const, density: 0.5, rim: 0.6 },
  /** `shore`: shallows reach out to this many radii; `edgeMargin`: tiles kept between a pond and the map edge; `tries` per pond. */
  ponds: { count: 4, radius: [2, 4] as const, shore: 1.35, edgeMargin: 4, tries: 8 },
  ruinStones: 26,
  /** Kept open: no trees, rocks, water or stones are generated here. */
  clearings: [
    // The meadow round the start stone, which is also the sandbox and the test arena.
    { x0: 24, y0: 22, x1: 56, y1: 38 },
    // The ruin field round the foundry entrance.
    { x0: 29, y0: 10, x1: 51, y1: 22 },
    // The shrine site and its approach.
    { x0: SHRINE.x0 - 2, y0: SHRINE.y0 - 1, x1: SHRINE.x1 + 1, y1: SHRINE.y1 + 3 },
    // The Frozen Grotto (029).
    GROTTO.area,
  ] satisfies TileRect[],
  /** Dirt paths joining the landmarks: tile polylines, two tiles wide. */
  paths: [
    [
      { tx: 40, ty: 32 },
      { tx: 40, ty: 21 },
    ],
    [
      { tx: 41, ty: 22 },
      { tx: 52, ty: 21 },
      { tx: 60, ty: 18 },
      { tx: 66, ty: 16 },
    ],
    [
      { tx: 39, ty: 30 },
      { tx: 26, ty: 31 },
      { tx: 12, ty: 27 },
    ],
    [
      { tx: 41, ty: 36 },
      { tx: 50, ty: 40 },
      { tx: 64, ty: 38 },
    ],
    // North from the west path's end to the Frozen Grotto (029).
    GROTTO.path,
  ] satisfies TilePos[][],
  /** Ley Springs (030): heal fast standing in the pool. */
  springs: SPRINGS,
  /** Where the dormant tube rests (012), and where the real game wakes the player. */
  startStone: { tx: 40, ty: 33 },
  wake: { tx: 40, ty: 35 },
  /** The sandbox start (`?start=field`) and the test arena: open meadow beside the ruin field. */
  field: { tx: 40, ty: 27 },
  entrance: { door: ENTRANCE, arrive: { tx: ENTRANCE.tx, ty: ENTRANCE.ty + 1 }, mound: MOUND },
  ruinField: { walls: FIELD_WALLS },
  shrine: {
    area: SHRINE,
    walls: shrineWalls(),
    /** The gap the ley barrier seals until the first line fills the tube (012). */
    gate: SHRINE_GAP.map((tx) => ({ tx, ty: SHRINE.y1 })),
    pylon: { tx: 66, ty: 8 },
    /** The claim id: objectives and fixtures name the shrine by it. */
    site: 'shrine',
    /** Its name in the waystone's menu (032). */
    name: 'Shrine',
    /** Its safe zone's radius, tiles (017); a resource site's is smaller (032). */
    safeRadius: SAFE_RADIUS,
  },
  /** Enemies placed by hand, each in a group: the field pack holds the foundry gate, the shrine guards hold the claim. */
  packs: [
    { group: 'field', enemyId: 'husk', tx: 35, ty: 14 },
    { group: 'field', enemyId: 'husk', tx: 37, ty: 15 },
    { group: 'field', enemyId: 'husk', tx: 45, ty: 14 },
    { group: 'shrine', enemyId: 'pylon-warden', tx: 66, ty: 10 },
    { group: 'shrine', enemyId: 'wisp', tx: 61, ty: 6 },
    { group: 'shrine', enemyId: 'wisp', tx: 71, ty: 6 },
    { group: 'shrine', enemyId: 'wisp', tx: 66, ty: 5 },
    { group: 'shrine', enemyId: 'husk', tx: 61, ty: 12 },
    { group: 'shrine', enemyId: 'husk', tx: 69, ty: 11 },
    // Every landmark's guards (032), each pack in its landmark's group: the Frozen Grotto's (029) first. The
    // unclaimable ones are back after every KO.
    ...LANDMARK_LIST.flatMap((l) => l.guards.map((g) => ({ group: l.id, enemyId: g.enemyId, tx: g.tx, ty: g.ty }))),
  ],
  /**
   * Ley lines (018): glowing seams in the ground where ley comes near the surface,
   * all leading to the foundry's stairs, directly or through the shrine's pylon.
   * Ley veins stand on them. Tile points; `shrine` is the line the pylon's haul runs home along.
   */
  leyLines: {
    start: [{ tx: 40, ty: 33 }, { tx: 38, ty: 29 }, { tx: 39, ty: 24 }, { tx: 40, ty: 21 }],
    meadow: [{ tx: 44, ty: 31 }, { tx: 43, ty: 27 }, { tx: 42, ty: 23 }, { tx: 41, ty: 21 }],
    shrine: [{ tx: 66, ty: 8 }, { tx: 64, ty: 12 }, { tx: 58, ty: 17 }, { tx: 50, ty: 19 }, { tx: 43, ty: 21 }, { tx: 41, ty: 21 }],
    'shrine-west': [{ tx: 60, ty: 9 }, { tx: 63, ty: 9 }, { tx: 66, ty: 8 }],
    'shrine-east': [{ tx: 72, ty: 9 }, { tx: 69, ty: 9 }, { tx: 66, ty: 8 }],
    // Each landmark pylon's line home (032), named by its landmark, and the seams crossing at it (`<id>-<n>`).
    ...LANDMARK_LINES,
  } as Readonly<Record<string, readonly TilePos[]>> & { readonly shrine: readonly TilePos[] },
  /** What explains each node that isn't a vein (018): groves and rock fields hold their node in a pocket of grass, ponds hold reeds at their edge. */
  features: [
    { kind: 'grove', cx: 27, cy: 24, r: 2.5 },
    { kind: 'grove', cx: 25, cy: 28, r: 2.5 },
    { kind: 'grove', cx: 54, cy: 24, r: 2.5 },
    { kind: 'rocks', cx: 53, cy: 31, r: 2.5 },
    { kind: 'rocks', cx: 50, cy: 35, r: 2.5 },
    { kind: 'rocks', cx: 30, cy: 35, r: 2.5 },
    { kind: 'pond', cx: 24.5, cy: 37, rx: 1.2, ry: 1.2 },
    { kind: 'pond', cx: 56.5, cy: 37, rx: 1.2, ry: 1.2 },
    // The shrine site's own, inside the claimed pylon's safe zone.
    { kind: 'grove', cx: 60, cy: 12, r: 2.5 },
    { kind: 'pond', cx: 70.5, cy: 13, rx: 1.2, ry: 1.2 },
    { kind: 'rocks', cx: 63, cy: 4, r: 2.5 },
    // The landmarks' own (032).
    ...LANDMARK_LIST.flatMap((l) => l.features),
  ] satisfies Feature[],
  /** Gathering nodes, each where its material comes from (018: see each node type's placement rule). Indices are stable: tests name nodes by them. */
  nodes: [
    { nodeId: 'tree', tx: 27, ty: 25 },
    { nodeId: 'tree', tx: 25, ty: 29 },
    { nodeId: 'tree', tx: 54, ty: 25 },
    { nodeId: 'rubble', tx: 53, ty: 32 },
    { nodeId: 'rubble', tx: 50, ty: 36 },
    { nodeId: 'rubble', tx: 30, ty: 36 },
    { nodeId: 'reeds', tx: 26, ty: 37 },
    { nodeId: 'reeds', tx: 55, ty: 37 },
    { nodeId: 'ley-vein', tx: 44, ty: 31 },
    { nodeId: 'ley-vein', tx: 60, ty: 9 },
    { nodeId: 'ley-vein', tx: 72, ty: 9 },
    { nodeId: 'tree', tx: 60, ty: 13 },
    { nodeId: 'reeds', tx: 72, ty: 13 },
    { nodeId: 'rubble', tx: 63, ty: 5 },
    // The landmarks' (032): the Frozen Grotto's rime clusters (029) first, then each site's cluster.
    ...LANDMARK_LIST.flatMap((l) => l.nodes),
  ],
} as const;

/** The ring a tile is in: 0 near the foundry, 1 the near field, 2 the shrine's ground and beyond. */
export function ringOf(tx: number, ty: number): 0 | 1 | 2 {
  const { centre, bounds } = OVERWORLD.rings;
  const d = Math.hypot(tx - centre.tx, ty - centre.ty);
  return d < bounds[0] ? 0 : d < bounds[1] ? 1 : 2;
}
