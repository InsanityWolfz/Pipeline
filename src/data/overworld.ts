// The overworld (017): one open map, about 4×4 screens, like Realm of the Mad God.
// The terrain is generated from `seed` by src/sim/overworldGen.ts, so every run
// gets the same map; the landmarks below are placed by hand and override it.
// Tile coordinates throughout. Numbers are tuning values.

export type TilePos = { readonly tx: number; readonly ty: number };

/** A rectangle of tiles, inclusive. */
export interface TileRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

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
  /** The map edge: this many tiles of dense forest, ragged by up to `ragged` more. */
  edge: { depth: 2, ragged: 2 },
  /** Danger rings by straight-line distance in tiles from the foundry entrance: ring 0 inside the first bound, ring 1 inside the second, ring 2 beyond. */
  rings: { centre: ENTRANCE, bounds: [17, 26] as const },
  /** Generated features. Radii in tiles; density is the chance a tile near the centre fills. */
  groves: { count: 18, radius: [3, 7] as const, density: 0.75 },
  rockFields: { count: 8, radius: [2, 4] as const, density: 0.5 },
  ponds: { count: 4, radius: [2, 4] as const },
  ruinStones: 26,
  /** Kept open: no trees, rocks, water or stones are generated here. */
  clearings: [
    // The meadow round the start stone, which is also the sandbox and the test arena.
    { x0: 24, y0: 22, x1: 56, y1: 38 },
    // The ruin field round the foundry entrance.
    { x0: 29, y0: 10, x1: 51, y1: 22 },
    // The shrine site and its approach.
    { x0: SHRINE.x0 - 2, y0: SHRINE.y0 - 1, x1: SHRINE.x1 + 1, y1: SHRINE.y1 + 3 },
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
  ] satisfies TilePos[][],
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
    { group: 'shrine', enemyId: 'husk', tx: 71, ty: 12 },
  ],
  /** Gathering nodes in sensible spots (018 gives them proper sources). */
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
  ],
} as const;

/** The ring a tile is in: 0 near the foundry, 1 the near field, 2 the shrine's ground and beyond. */
export function ringOf(tx: number, ty: number): 0 | 1 | 2 {
  const { centre, bounds } = OVERWORLD.rings;
  const d = Math.hypot(tx - centre.tx, ty - centre.ty);
  return d < bounds[0] ? 0 : d < bounds[1] ? 1 : 2;
}
