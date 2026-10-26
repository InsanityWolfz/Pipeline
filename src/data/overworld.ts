// The overworld (017): one open map, generated from `seed` by src/sim/overworldGen.ts, so every run gets the same
// map; the landmarks below are placed by hand and override it. Since 053 it is round (worldShape.ts): Region 1 the
// disc round the foundry, Stonefall Hollows (src/data/hollows.ts) the ring round that, the roads (roads.ts) and ley
// lines (leyLines.ts) laid without crossings. The ground round the foundry keeps 017's shapes, moved to the centre
// (home.ts). Tile coordinates throughout. Numbers are tuning values.

import { EMBERWORKS } from './emberworks';
import { STORMCROWN } from './stormcrown';
import { ANVIL_HALL } from './emberworksSites';
import { GROTTO } from './grotto';
import { HOLLOWS, regionAt } from './hollows';
import { ARRIVE, ENTRANCE, FIELD_WALLS, HOME_SHIFT, MEADOW_VEIN, MOUND, SHRINE, SHRINE_DOOR, SHRINE_PYLON, SHRINE_SHIFT, shrineWalls } from './home';
import { LANDMARK_LIST } from './landmarks';
import { LEY_LINES } from './leyLines';
import { shiftRect, shiftTile } from './place';
import { SAFE_RADIUS } from './population';
import type { Ring } from './ringScale';
import { ROADS } from './roads';
import { SPRINGS } from './springs';
import type { Feature, TilePos, TileRect } from './tiles';
import { fromCentre, WORLD_SHAPE } from './worldShape';

export type { Feature, TilePos, TileRect } from './tiles';
export { SPRING_CLEARING, SPRING_RADIUS, type SpringDef } from './springs';

export const OVERWORLD_ROOM = 'overworld';

/** 017's ground round the foundry, at its old tiles, moved to the round map's centre. */
const home = <T extends TilePos>(t: T): T => shiftTile(t, HOME_SHIFT);
const homeRect = (r: TileRect): TileRect => shiftRect(r, HOME_SHIFT);
/** The shrine's own, at 017's tiles, moved with it (home.ts). */
const shrine = <T extends TilePos>(t: T): T => shiftTile(t, SHRINE_SHIFT);
const shrineFeature = (f: Feature): Feature => ({ ...f, cx: f.cx + SHRINE_SHIFT.dx, cy: f.cy + SHRINE_SHIFT.dy });
const homeFeature = (f: Feature): Feature => ({ ...f, cx: f.cx + HOME_SHIFT.dx, cy: f.cy + HOME_SHIFT.dy });

export const OVERWORLD = {
  id: OVERWORLD_ROOM,
  width: WORLD_SHAPE.size,
  height: WORLD_SHAPE.size,
  seed: 20261018,
  /**
   * Danger rings by straight-line distance in tiles from the foundry entrance (017, 053: concentric bands of the
   * round Region 1): ring 0 inside the first bound, ring 1 inside the second, ring 2 to the barrier, 3 the Hollows.
   */
  rings: { centre: ENTRANCE, bounds: WORLD_SHAPE.rings },
  /**
   * Generated features, all inside Region 1's disc. Radii in tiles; density is the chance a tile near the centre
   * fills; `rim`: how much thinner a cluster is at its rim than its middle (0 even, 1 empty). 053: the counts
   * doubled with the region's area, so it is as wooded and rocky as it was. `keepOff`: generated clusters keep this
   * many tiles inside the barrier's circle.
   */
  groves: { count: 36, radius: [3, 7] as const, density: 0.75, rim: 0.6 },
  rockFields: { count: 16, radius: [2, 4] as const, density: 0.5, rim: 0.6 },
  keepOff: 2,
  /** `shore`: shallows reach out to this many radii; `edgeMargin`: tiles kept between a pond and the barrier; `tries` per pond. */
  ponds: { count: 8, radius: [2, 4] as const, shore: 1.35, edgeMargin: 4, tries: 8 },
  ruinStones: 52,
  /** Kept open: no trees, rocks, water or stones are generated here. */
  clearings: [
    // The meadow round the start stone, which is also the sandbox and the test arena.
    homeRect({ x0: 64, y0: 22, x1: 96, y1: 38 }),
    // The ruin field round the foundry entrance.
    homeRect({ x0: 69, y0: 10, x1: 91, y1: 22 }),
    // The shrine site and its approach.
    { x0: SHRINE.x0 - 2, y0: SHRINE.y0 - 1, x1: SHRINE.x1 + 1, y1: SHRINE.y1 + 3 },
    // The Frozen Grotto (029).
    GROTTO.area,
  ] satisfies TileRect[],
  /** The roads (053: one network without crossings, roads.ts): tile polylines, two tiles wide. */
  paths: ROADS,
  /** Ley Springs (030): heal fast standing in the pool. */
  springs: SPRINGS,
  /** Where the dormant tube rests (012), and where the real game wakes the player. */
  startStone: home({ tx: 80, ty: 33 }),
  wake: home({ tx: 80, ty: 35 }),
  /** The sandbox start (`?start=field`) and the test arena: open meadow beside the ruin field. */
  field: home({ tx: 80, ty: 27 }),
  entrance: { door: ENTRANCE, arrive: ARRIVE, mound: MOUND },
  ruinField: { walls: FIELD_WALLS },
  shrine: {
    area: SHRINE,
    walls: shrineWalls(),
    /** Its door (055): the Warden's arena's way in, where 012's gate stood (src/data/arenas.ts). */
    door: SHRINE_DOOR,
    pylon: SHRINE_PYLON,
    /** The claim id: objectives and fixtures name the shrine by it. */
    site: 'shrine',
    /** Its name in the waystone's menu (032). */
    name: 'Shrine',
    /** Its safe zone's radius, tiles (017); a resource site's is smaller (032). */
    safeRadius: SAFE_RADIUS,
  },
  /** Enemies placed by hand, each in a group: the field pack holds the foundry gate, the shrine guards hold the claim. */
  packs: [
    home({ group: 'field', enemyId: 'husk', tx: 75, ty: 14 }),
    home({ group: 'field', enemyId: 'husk', tx: 77, ty: 15 }),
    home({ group: 'field', enemyId: 'husk', tx: 85, ty: 14 }),
    shrine({ group: 'shrine', enemyId: 'pylon-warden', tx: 106, ty: 10 }),
    shrine({ group: 'shrine', enemyId: 'wisp', tx: 101, ty: 6 }),
    shrine({ group: 'shrine', enemyId: 'wisp', tx: 111, ty: 6 }),
    shrine({ group: 'shrine', enemyId: 'wisp', tx: 106, ty: 5 }),
    shrine({ group: 'shrine', enemyId: 'husk', tx: 101, ty: 12 }),
    shrine({ group: 'shrine', enemyId: 'husk', tx: 109, ty: 11 }),
    // Every landmark's guards (032), each pack in its landmark's group: the Frozen Grotto's (029) first. The
    // unclaimable ones are back after every KO.
    ...LANDMARK_LIST.flatMap((l) => l.guards.map((g) => ({ group: l.id, enemyId: g.enemyId, tx: g.tx, ty: g.ty, ...(g.champion ? { champion: true as const } : {}) }))),
    // The Bulwark at its start in the Sunken Forum (034), in the arena's group: back after a KO until its first kill.
    { group: HOLLOWS.arena.id, enemyId: HOLLOWS.arena.boss, tx: HOLLOWS.arena.start.tx, ty: HOLLOWS.arena.start.ty },
    // 060: the Forgewright at its start in the Anvil Hall, in the hall's group, by the same rule.
    { group: ANVIL_HALL.id, enemyId: ANVIL_HALL.boss, tx: ANVIL_HALL.start.tx, ty: ANVIL_HALL.start.ty },
  ],
  /**
   * Ley lines (018, 053): each pylon's line home, one smooth curve to the foundry's ruin, and the seams its veins stand
   * on (leyLines.ts). `shrine` is the line the shrine pylon's haul runs home along.
   */
  leyLines: LEY_LINES,
  /** What explains each node that isn't a vein (018): groves and rock fields hold their node in a pocket of grass, ponds hold reeds at their edge. */
  features: [
    ...(
      [
        { kind: 'grove', cx: 67, cy: 24, r: 2.5 },
        { kind: 'grove', cx: 65, cy: 28, r: 2.5 },
        { kind: 'grove', cx: 94, cy: 24, r: 2.5 },
        { kind: 'rocks', cx: 93, cy: 31, r: 2.5 },
        { kind: 'rocks', cx: 90, cy: 35, r: 2.5 },
        { kind: 'rocks', cx: 70, cy: 35, r: 2.5 },
        { kind: 'pond', cx: 64.5, cy: 37, rx: 1.2, ry: 1.2 },
        { kind: 'pond', cx: 96.5, cy: 37, rx: 1.2, ry: 1.2 },
      ] satisfies Feature[]
    ).map(homeFeature),
    // The shrine site's own, inside the claimed pylon's safe zone.
    ...(
      [
        { kind: 'grove', cx: 100, cy: 12, r: 2.5 },
        { kind: 'pond', cx: 110.5, cy: 13, rx: 1.2, ry: 1.2 },
        { kind: 'rocks', cx: 103, cy: 4, r: 2.5 },
      ] satisfies Feature[]
    ).map(shrineFeature),
    // The landmarks' own (032).
    ...LANDMARK_LIST.flatMap((l) => l.features),
  ] satisfies Feature[],
  /** Gathering nodes, each where its material comes from (018: see each node type's placement rule). Indices are stable: tests name nodes by them. */
  nodes: [
    home({ nodeId: 'tree', tx: 67, ty: 25 }),
    home({ nodeId: 'tree', tx: 65, ty: 29 }),
    home({ nodeId: 'tree', tx: 94, ty: 25 }),
    home({ nodeId: 'rubble', tx: 93, ty: 32 }),
    home({ nodeId: 'rubble', tx: 90, ty: 36 }),
    home({ nodeId: 'rubble', tx: 70, ty: 36 }),
    home({ nodeId: 'reeds', tx: 66, ty: 37 }),
    home({ nodeId: 'reeds', tx: 95, ty: 37 }),
    { nodeId: 'ley-vein', ...MEADOW_VEIN },
    shrine({ nodeId: 'ley-vein', tx: 100, ty: 9 }),
    shrine({ nodeId: 'ley-vein', tx: 112, ty: 9 }),
    shrine({ nodeId: 'tree', tx: 100, ty: 13 }),
    shrine({ nodeId: 'reeds', tx: 112, ty: 13 }),
    shrine({ nodeId: 'rubble', tx: 103, ty: 5 }),
    // The landmarks' (032): the Frozen Grotto's rime outcrops (029) first, then each site's cluster.
    ...LANDMARK_LIST.filter((l) => l.ring !== EMBERWORKS.ring).flatMap((l) => l.nodes),
    // Stonefall Hollows' seams outside its landmarks (034).
    ...HOLLOWS.nodes,
    // 060: the Emberworks' landmarks' (the Cinder Vents'), last, so every earlier node keeps its index.
    ...LANDMARK_LIST.filter((l) => l.ring === EMBERWORKS.ring).flatMap((l) => l.nodes),
  ],
} as const;

/** The ring a tile is in: 0 near the foundry, 1 the near field, 2 the shrine's ground out to the barrier, 3 anywhere in Stonefall Hollows (034), 4 in the Emberworks (060), 5 in the Stormcrown (064), each its region's (regionAt). */
export function ringOf(tx: number, ty: number): Ring {
  const region = regionAt(tx, ty);
  if (region === STORMCROWN.region) return STORMCROWN.ring;
  if (region === EMBERWORKS.region) return EMBERWORKS.ring;
  if (region === HOLLOWS.region) return HOLLOWS.ring;
  const { bounds } = OVERWORLD.rings;
  const d = fromCentre(tx, ty);
  return d < bounds[0] ? 0 : d < bounds[1] ? 1 : 2;
}
