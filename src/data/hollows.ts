import { TILE } from './rooms';
import type { TilePos, TileRect } from './tiles';

// Region 2, Stonefall Hollows (034): a collapsed quarry-city of the lost civilisation west
// of the old map, behind a ley barrier in the gap of its eastern cliffs. The overworld
// grew west by this region (the old map moved +40 tiles); its terrain is generated from
// the map's seed with these settings after Region 1's, then the road, the arena and the
// landmarks are stamped over it. Tile coordinates throughout; numbers are tuning values.

/** Region 1's first column: the old map's tiles all moved this far east (034). */
export const REGION_1_X = 40;

/** The tiles a mover can stand in the Sunken Forum: the player in here wakes its boss. */
const FORUM_INSIDE: TileRect = { x0: 4, y0: 31, x1: 20, y1: 41 };

/** The forum's walls: cliffs round three sides, a broken colonnade on the north with its one wide way in. */
const FORUM_BOUNDS: TileRect = { x0: 3, y0: 30, x1: 21, y1: 42 };
const FORUM_WAY = { x0: 10, x1: 14 } as const;
/** Colonnade columns standing in the north wall, and fallen drums between some of them. */
const COLONNADE = { pillars: [4, 7, 17, 20], fallen: [5, 6, 18, 19] } as const;
/** Broken columns standing inside the forum's corners. */
const FORUM_COLUMNS: readonly TilePos[] = [
  { tx: 5, ty: 32 },
  { tx: 19, ty: 32 },
  { tx: 5, ty: 40 },
  { tx: 19, ty: 40 },
];

/** A tile with its own symbol, stamped over the generated ground. */
export interface TileStamp extends TilePos {
  readonly symbol: string;
}

function forumWalls(): TileStamp[] {
  const b = FORUM_BOUNDS;
  const out: TileStamp[] = [];
  for (let tx = b.x0; tx <= b.x1; tx++) {
    out.push({ tx, ty: b.y1, symbol: TILE.cliff });
    if (tx >= FORUM_WAY.x0 && tx <= FORUM_WAY.x1) continue;
    const symbol = (COLONNADE.pillars as readonly number[]).includes(tx) ? TILE.pillar : (COLONNADE.fallen as readonly number[]).includes(tx) ? TILE.fallen : TILE.cliff;
    out.push({ tx, ty: b.y0, symbol });
  }
  for (let ty = b.y0 + 1; ty < b.y1; ty++) out.push({ tx: b.x0, ty, symbol: TILE.cliff }, { tx: b.x1, ty, symbol: TILE.cliff });
  return [...out, ...FORUM_COLUMNS.map((t) => ({ ...t, symbol: TILE.pillar }))];
}

/** The gap in the eastern cliffs: rows open through the two-tile wall. */
const GAP = { y0: 26, y1: 29 } as const;
const EAST_WALL = [38, 39] as const;

export const HOLLOWS = {
  id: 'stonefall-hollows',
  name: 'Stonefall Hollows',
  /** Its region number (033's schematic regions) and its danger ring (017): 3 anywhere inside, whatever the distance. */
  region: 2,
  ring: 3,
  bounds: { x0: 0, y0: 0, x1: REGION_1_X - 1, y1: 44 } satisfies TileRect,
  /** Mixed into the map's seed for the Hollows' own stream, so Region 1's stays as it was. */
  salt: 0x34ab17,
  /** The map edge: cliffs this deep, ragged by up to `ragged` more (like 017's forest edge). The east side is the cliff wall the barrier's gap cuts. */
  edge: { depth: 2, ragged: 2, raggedChance: 0.5 },
  /** Generated cliff runs: straight runs `length` long and `thick` deep, across or down. */
  cliffRuns: { count: 16, length: [3, 7] as const, thick: [1, 2] as const },
  /** Loose rubble: single boulders scattered on open ground. */
  rubble: 45,
  /** Quarry-cut terraces: low cut-stone steps, walkable, `w` × `h` tiles. */
  terraces: { count: 7, w: [4, 8] as const, h: [2, 3] as const },
  /** Kept free of generated cliffs, rubble and terraces (the landmarks' areas are kept too). */
  keepOpen: [
    FORUM_BOUNDS,
    // Either side of the gap, and the road's corridors.
    { x0: 31, y0: 24, x1: 39, y1: 31 },
    { x0: 8, y0: 25, x1: 31, y1: 30 },
    { x0: 23, y0: 13, x1: 28, y1: 30 },
  ] satisfies TileRect[],
  /** Cleared to open ground after generation: the approach either side of the gap, the gap itself and the forum's floor. */
  clears: [
    { x0: 33, y0: 25, x1: 37, y1: 30 },
    { x0: EAST_WALL[0], y0: GAP.y0, x1: EAST_WALL[1], y1: GAP.y1 },
    { x0: REGION_1_X, y0: 25, x1: REGION_1_X + 5, y1: 30 },
    FORUM_INSIDE,
  ] satisfies TileRect[],
  /**
   * The road (two tiles wide): from the old west path's end at (52, 27) west to the gap (030, 032's fork), then on
   * inside to the Cistern Terrace, the Ley Spring and the Sunken Forum's way in.
   */
  roads: [
    [
      { tx: REGION_1_X + 12, ty: 27 },
      { tx: 26, ty: 27 },
    ],
    [
      { tx: 25, ty: 27 },
      { tx: 25, ty: 14 },
    ],
    [
      { tx: 25, ty: 27 },
      { tx: 10, ty: 27 },
    ],
    [
      { tx: 12, ty: 27 },
      { tx: 12, ty: 31 },
    ],
  ] satisfies TilePos[][],
  /** The ley barrier (gate `hollows`): it seals the gap on the wall's outer face until the shrine is claimed. */
  gate: Array.from({ length: GAP.y1 - GAP.y0 + 1 }, (_, i) => ({ tx: EAST_WALL[1], ty: GAP.y0 + i })) satisfies TilePos[],
  /** A second, smaller quarry wall by the road with ley-iron in its face (the seams are in `nodes`). */
  quarryWall: [30, 31, 32, 33, 34].map((tx) => ({ tx, ty: 23, symbol: TILE.cliff })) satisfies TileStamp[],
  nodes: [
    { nodeId: 'ley-iron-seam', tx: 31, ty: 24 },
    { nodeId: 'ley-iron-seam', tx: 33, ty: 24 },
  ],
  /** `?start=hollows` (034): just inside the gap, on the road. */
  start: { tx: 36, ty: 27 } satisfies TilePos,
  /** The Bulwark's arena (034): a sunken plaza with one wide way in and no door that locks. */
  arena: {
    id: 'sunken-forum',
    name: 'Sunken Forum',
    boss: 'bulwark',
    bounds: FORUM_BOUNDS,
    inside: FORUM_INSIDE,
    walls: forumWalls(),
    /** Where the boss stands and rises; and the altar stone by the west wall. */
    start: { tx: 12, ty: 36 } satisfies TilePos,
    altar: { id: 'forum-altar', tx: 5, ty: 36 },
    /** After the first kill, E at the altar and this offering summon the boss again for its drops (from the carried inventory). */
    offering: { 'ley-iron': 8 } as Readonly<Record<string, number>>,
    /** The summon: the ground cracks at the start point, then the boss rises, ticks. */
    summonTicks: 120,
  },
} as const;

/** How close the player's feet box must be to the altar to use it, px. */
export const ALTAR_REACH = 20;

/** The arena whose boss is this enemy (034: the Bulwark's Sunken Forum), if any. */
export const arenaOf = (enemyId: string): typeof HOLLOWS.arena | undefined => (HOLLOWS.arena.boss === enemyId ? HOLLOWS.arena : undefined);

/** True if a tile is in the Hollows. */
export const inHollows = (tx: number, ty: number): boolean => {
  const b = HOLLOWS.bounds;
  return tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1;
};

/** The region a tile is in: 2 in the Hollows, else 1 (033's schematic regions). */
export const regionAt = (tx: number, ty: number): 1 | 2 => (inHollows(tx, ty) ? 2 : 1);
