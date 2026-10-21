import type { ArenaDoor } from './arenas';
import { shiftRect, shiftTile, type Shift } from './place';
import { TILE } from './rooms';
import type { TilePos, TileRect } from './tiles';
import { barrierTiles, fromCentre, WORLD_SHAPE } from './worldShape';

// Region 2, Stonefall Hollows (034): a collapsed quarry-city of the lost civilisation. Since 053 it is the ring
// round Region 1 (Shaun: "the outer ring of the grass area, like a donut"), behind a ley barrier on the whole circle
// between them (053.2), with a ragged cliff edge past it. Its terrain is generated from the map's seed with these
// settings after Region 1's, then the roads, the arena and the landmarks are stamped over it. Tiles throughout;
// numbers are tuning values.

/** 053: the Sunken Forum as 034 drew it, moved whole into the ring's north-west (bearing 315°, 62 tiles). */
const FORUM_SHIFT: Shift = { dx: 28, dy: 4 };
const fx = (tx: number): number => tx + FORUM_SHIFT.dx;
const fy = (ty: number): number => ty + FORUM_SHIFT.dy;

/** The tiles a mover can stand in the Sunken Forum: the player in here wakes its boss. */
const FORUM_INSIDE: TileRect = shiftRect({ x0: 4, y0: 31, x1: 20, y1: 41 }, FORUM_SHIFT);

/** The forum's walls: cliffs round three sides, a broken colonnade on the north with its door (055, was its open way in). */
const FORUM_BOUNDS: TileRect = shiftRect({ x0: 3, y0: 30, x1: 21, y1: 42 }, FORUM_SHIFT);
const FORUM_WAY = { x0: fx(10), x1: fx(14) } as const;
/** 055: the door across 034's way in, its tiles in the colonnade's row. */
const FORUM_DOOR: readonly TilePos[] = Array.from({ length: FORUM_WAY.x1 - FORUM_WAY.x0 + 1 }, (_, i) => ({ tx: FORUM_WAY.x0 + i, ty: FORUM_BOUNDS.y0 }));
/** Colonnade columns standing in the north wall, and fallen drums between some of them. */
const COLONNADE = { pillars: [4, 7, 17, 20].map(fx), fallen: [5, 6, 18, 19].map(fx) } as const;
/** Broken columns standing inside the forum's corners. */
const FORUM_COLUMNS: readonly TilePos[] = [
  { tx: 5, ty: 32 },
  { tx: 19, ty: 32 },
  { tx: 5, ty: 40 },
  { tx: 19, ty: 40 },
].map((t) => shiftTile(t, FORUM_SHIFT));

/** A tile with its own symbol, stamped over the generated ground. */
export interface TileStamp extends TilePos {
  readonly symbol: string;
}

function forumWalls(): TileStamp[] {
  const b = FORUM_BOUNDS;
  const out: TileStamp[] = [];
  for (let tx = b.x0; tx <= b.x1; tx++) {
    out.push({ tx, ty: b.y1, symbol: TILE.cliff });
    if (tx >= FORUM_WAY.x0 && tx <= FORUM_WAY.x1) {
      out.push({ tx, ty: b.y0, symbol: TILE.arenaDoor });
      continue;
    }
    const symbol = (COLONNADE.pillars as readonly number[]).includes(tx) ? TILE.pillar : (COLONNADE.fallen as readonly number[]).includes(tx) ? TILE.fallen : TILE.cliff;
    out.push({ tx, ty: b.y0, symbol });
  }
  for (let ty = b.y0 + 1; ty < b.y1; ty++) out.push({ tx: b.x0, ty, symbol: TILE.cliff }, { tx: b.x1, ty, symbol: TILE.cliff });
  return [...out, ...FORUM_COLUMNS.map((t) => ({ ...t, symbol: TILE.pillar }))];
}

/** How close the player's feet box must be to the altar to use it, px. */
export const ALTAR_REACH = 20;

export const HOLLOWS = {
  id: 'stonefall-hollows',
  name: 'Stonefall Hollows',
  /** Its region number (033's schematic regions) and its danger ring (017): 3 anywhere inside, whatever the distance. */
  region: 2,
  ring: 3,
  /** 053: the ring, by distance from the foundry's door: from the barrier's circle out to the cliff edge. */
  radii: { inner: WORLD_SHAPE.region1, outer: WORLD_SHAPE.hollows },
  /** Mixed into the map's seed for the Hollows' own stream, so Region 1's stays as it was. */
  salt: 0x34ab17,
  /**
   * The world's edge (053, D.1: "a clear natural boundary"): past `outer` the ground is cliff out to the grid's edge,
   * ragged inward by up to `ragged` tiles (the first ragged tile fills at `raggedChance`, halving inward, like 017's
   * forest edge). Render draws a cliff as a sprite only within `face` tiles of open ground; the rest is plateau.
   */
  edge: { ragged: 3, raggedChance: 0.5, face: 2 },
  /**
   * Generated cliff runs: straight runs `length` long and `thick` deep, across or down. 053: the counts below grew with
   * the region's ground (034's 40 × 45 tiles to the ring's ≈ 12,370, × 6.9), and doubled again since each is drawn
   * over the ring's bounding square and about half land in the ring, so the ring is as dense as the old region.
   */
  cliffRuns: { count: 220, length: [3, 7] as const, thick: [1, 2] as const, acrossChance: 0.5 },
  /** Generated things start at least this many tiles in from the ring's edges. */
  inset: 3,
  /** Loose rubble: single boulders scattered on open ground. */
  rubble: 620,
  /** Quarry-cut terraces: low cut-stone steps, walkable, `w` × `h` tiles. */
  terraces: { count: 96, w: [4, 8] as const, h: [2, 3] as const },
  /** Generated ground keeps this many tiles clear either side of every road (roads.ts) and off the forum. */
  roadClear: 2,
  keepOpen: [FORUM_BOUNDS] satisfies TileRect[],
  /** Cleared to open ground after generation: the forum's floor. */
  clears: [FORUM_INSIDE] satisfies TileRect[],
  /** The ley barrier (gate `hollows`, 053.2): the whole circle between the regions, sealed until the shrine is claimed. */
  gate: barrierTiles() satisfies TilePos[],
  /** Where the road west to the Cistern Terrace crosses the barrier: the goal's waypoint while it stands (051). */
  crossing: { tx: 46, ty: 113 } satisfies TilePos,
  /** A second, smaller quarry wall by the terrace road with ley-iron in its face (the seams are in `nodes`). */
  quarryWall: [36, 37, 38, 39, 40].map((tx) => ({ tx, ty: 114, symbol: TILE.cliff })) satisfies TileStamp[],
  nodes: [
    { nodeId: 'ley-iron-seam', tx: 37, ty: 115 },
    { nodeId: 'ley-iron-seam', tx: 39, ty: 115 },
  ],
  /** The site whose claim drops the barrier (round 9: the shrine, after beating the Warden). */
  opensOn: 'shrine',
  /** `?start=hollows` (034): just past the barrier on the road west to the Cistern Terrace (053). */
  start: { tx: 44, ty: 115 } satisfies TilePos,
  /** The Bulwark's arena (034): a sunken plaza walled all round, its door in the north wall (055, was its open way in). */
  arena: {
    id: 'sunken-forum',
    name: 'Sunken Forum',
    boss: 'bulwark',
    bounds: FORUM_BOUNDS,
    inside: FORUM_INSIDE,
    walls: forumWalls(),
    /**
     * Its door (055, D.5, in place of 043's seal across the way in): sealed until the Hollows' barrier falls; then E
     * with the player's feet box within `reach` px of it goes in, to `enterTo`, and E from inside leaves, to `leaveTo`,
     * the fight resetting as 043's lock did.
     */
    door: {
      tiles: FORUM_DOOR,
      enterTo: { tx: fx(12), ty: FORUM_BOUNDS.y0 + 1 },
      // Two tiles out, clear of the door's sprite standing over the row above it (src/data/arenas.ts).
      leaveTo: { tx: fx(12), ty: FORUM_BOUNDS.y0 - 2 },
      /** The altar's reach (same E distance as the arena's other interactable). */
      reach: ALTAR_REACH,
      unlock: 'hollows',
      name: 'Forum door',
      /** 055.1: its hover line while sealed. */
      sealed: 'Sealed: break the Hollows barrier',
    } satisfies ArenaDoor,
    /** Where the boss stands and rises; and the altar stone by the west wall. */
    start: { tx: fx(12), ty: fy(36) } satisfies TilePos,
    altar: { id: 'forum-altar', tx: fx(5), ty: fy(36) },
    /** After the first kill, E at the altar and this offering summon the boss again for its drops (from the carried inventory). */
    offering: { 'ley-iron': 8 } as Readonly<Record<string, number>>,
    /** The summon: the ground cracks at the start point, then the boss rises, ticks. */
    summonTicks: 120,
    /**
     * Where its adds rise (041.6), the first two in order of its `adds.enemies`: open floor either side of its start;
     * 041.17: two more north and south of it, so an add whose tile is too near the player never shares its pair's.
     */
    addTiles: [
      { tx: fx(8), ty: fy(36) },
      { tx: fx(16), ty: fy(36) },
      { tx: fx(12), ty: fy(33) },
      { tx: fx(12), ty: fy(39) },
    ] satisfies TilePos[],
  },
} as const;

/** The arena whose boss is this enemy (034: the Bulwark's Sunken Forum), if any. */
export const arenaOf = (enemyId: string): typeof HOLLOWS.arena | undefined => (HOLLOWS.arena.boss === enemyId ? HOLLOWS.arena : undefined);

/** The arena whose altar this is (034), if any. */
export const arenaOfAltar = (altarId: string): typeof HOLLOWS.arena | undefined => (HOLLOWS.arena.altar.id === altarId ? HOLLOWS.arena : undefined);

/** True if a tile is in the Hollows (053: anywhere from the barrier's circle out, the cliff edge included). */
export const inHollows = (tx: number, ty: number): boolean => fromCentre(tx, ty) >= HOLLOWS.radii.inner;

/** The region a tile is in: 2 in the Hollows, else 1 (033's schematic regions). */
export const regionAt = (tx: number, ty: number): 1 | 2 => (inHollows(tx, ty) ? 2 : 1);
