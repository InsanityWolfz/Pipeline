import type { ArenaDoor } from './arenas';
import { EMBERWORKS } from './emberworks';
import type { TileStamp } from './hollows';
import type { LandmarkDef } from './landmarks';
import { placeLandmark, shiftTile, shiftTo } from './place';
import { TILE } from './rooms';
import type { TilePos, TileRect } from './tiles';
import { fromCentre, polar, WORLD_SHAPE } from './worldShape';

// The Emberworks' places (060): hand-placed landmarks, hidden until found (032), each laid out as the spec drew it and
// moved whole to its place in the ring (`EMBERWORKS.places`). The Ash Kilns is the region's claimable site: its pylon
// overlooks the Cinder Vents behind it and sends their cinderite home (as 034's Cistern Terrace does the Cut's
// ley-iron); the Slag River crosses the ring with two bridges; the Outpost Forge, a ruined miniature foundry, holds a
// Ruined Cache; the Anvil Hall is the Forgewright's walled arena, with its altar. Names are Shaun's
// placeholders. Tiles throughout; the Ley Spring is in springs.ts.

const P = EMBERWORKS.places;
const at = (p: { bearing: number; r: number }): TilePos => polar(p.bearing, p.r);

const stamp = (symbol: string) => (t: TilePos): TileStamp => ({ ...t, symbol });

/** Cinderite (060): vents in scorched ash behind the Ash Kilns, flaring open now and then. No pylon: the Kilns' sends their cinderite. */
const CINDER_VENTS: LandmarkDef = {
  id: 'cinder-vents',
  name: 'Cinder Vents',
  kind: 'resource-site',
  ring: 4,
  area: { x0: 0, y0: 0, x1: 7, y1: 11 },
  features: [],
  nodes: [
    { nodeId: 'cinder-vent', tx: 2, ty: 1 },
    { nodeId: 'cinder-vent', tx: 5, ty: 2 },
    { nodeId: 'cinder-vent', tx: 3, ty: 5 },
    { nodeId: 'cinder-vent', tx: 6, ty: 7 },
    { nodeId: 'cinder-vent', tx: 2, ty: 9 },
  ],
  // 061 brings the region's enemies.
  guards: [],
  marker: 'site',
  look: { scorched: true },
};

/** A row of the Kilns' terraced kilns: kiln, kiln, chimney, kiln, kiln from `x`. */
const kilnRow = (x: number, y: number): TileStamp[] => [...[x, x + 1, x + 3, x + 4].map((tx): TileStamp => ({ tx, ty: y, symbol: TILE.kiln })), { tx: x + 2, ty: y, symbol: TILE.chimney }];

/** The region's claimable site: the builders' old kilns in terraced rows, its pylon on the west side over the vents. */
const ASH_KILNS: LandmarkDef = {
  id: 'ash-kilns',
  name: 'Ash Kilns',
  kind: 'resource-site',
  ring: 4,
  area: { x0: 0, y0: 0, x1: 9, y1: 11 },
  features: [],
  nodes: [],
  // 061: a fixed pack holds it: the motes out front, the hounds on the flanks with clear lanes, the golem by the
  // pylon, the tender at the back by the east kilns. Motes are listed first, so a pack killed at once bursts before the golem splits.
  guards: [
    { enemyId: 'cinder-mote', tx: 7, ty: 3 },
    { enemyId: 'cinder-mote', tx: 7, ty: 7 },
    { enemyId: 'bellows-hound', tx: 4, ty: 3 },
    { enemyId: 'bellows-hound', tx: 4, ty: 7 },
    { enemyId: 'slag-golem', tx: 3, ty: 5 },
    { enemyId: 'kiln-tender', tx: 8, ty: 5 },
  ],
  pylon: { tx: 1, ty: 5, site: 'ash-kilns', supplies: ['cinderite'] },
  stamps: [...kilnRow(2, 1), ...[4, 5].map((tx) => ({ tx, ty: 5, symbol: TILE.kiln })), { tx: 6, ty: 5, symbol: TILE.chimney }, ...kilnRow(2, 9)],
  marker: 'site',
  look: { paving: 'ash' },
};

/** A ruined miniature foundry: broken walls, its forge (two kilns and a chimney) at the back, a sealed reliquary inside. */
const OUTPOST_FORGE: LandmarkDef = {
  id: 'outpost-forge',
  name: 'Outpost Forge',
  kind: 'ruined-cache',
  ring: 4,
  area: { x0: 0, y0: 0, x1: 10, y1: 8 },
  features: [],
  nodes: [],
  guards: [],
  blocks: [
    ...[0, 1, 2, 7, 8, 9, 10].map((tx) => ({ tx, ty: 0 })),
    ...[1, 2, 6, 7].map((ty) => ({ tx: 0, ty })),
    ...[1, 5, 6, 7].map((ty) => ({ tx: 10, ty })),
    ...[0, 1, 9, 10].map((tx) => ({ tx, ty: 8 })),
  ],
  stamps: [stamp(TILE.kiln)({ tx: 4, ty: 1 }), stamp(TILE.kiln)({ tx: 5, ty: 1 }), stamp(TILE.chimney)({ tx: 6, ty: 1 })],
  cache: { tx: 5, ty: 4 },
  marker: 'cache',
  look: { paving: 'ash' },
};

/**
 * The Slag River (060): a molten channel straight across the ring at its bearing, from the Hollows' cliff edge's foot
 * out to the ring's own (half a tile into each, so nothing walks round its ends), `halfWidth` tiles either side of its line, stopping feet but not shots; a stone bridge
 * crosses it at each of `bridges` (tiles out), `bridgeHalf` tiles either way along it, with open ash at each end.
 */
export const SLAG_RIVER = { bearing: P.slagRiver.bearing, from: EMBERWORKS.radii.inner + EMBERWORKS.wall - 0.5, to: EMBERWORKS.radii.outer + 0.5, halfWidth: 1.2, bridges: [89, 101], bridgeHalf: 1.5, landing: 2.5 } as const;

/** The river's tiles, row by row: open ash at the bridges' ends, then slag, then the bridges over it. */
function slagRiver(): TileStamp[] {
  const R = SLAG_RIVER;
  const a = (R.bearing * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const { tx: cx, ty: cy } = WORLD_SHAPE.centre;
  const box = Math.ceil(R.to) + 1;
  const floor: TileStamp[] = [];
  const river: TileStamp[] = [];
  for (let ty = cy - box; ty <= cy + box; ty++) {
    for (let tx = cx - box; tx <= cx + box; tx++) {
      const along = (tx - cx) * ux + (ty - cy) * uy;
      const off = Math.abs((tx - cx) * uy - (ty - cy) * ux);
      const d = fromCentre(tx, ty);
      if (along <= 0 || d < R.from - R.landing || d > R.to) continue;
      const bridge = R.bridges.some((b) => Math.abs(d - b) <= R.bridgeHalf);
      if (off <= R.halfWidth && d >= R.from) river.push({ tx, ty, symbol: bridge ? TILE.bridge : TILE.slag });
      else if (off <= R.halfWidth + R.landing && R.bridges.some((b) => Math.abs(d - b) <= R.bridgeHalf + 0.5)) floor.push({ tx, ty, symbol: TILE.floor });
    }
  }
  return [...floor, ...river];
}

/** Every tile the Slag River stamps: the bridges' landings, its slag and its bridges. */
export const SLAG_RIVER_TILES: readonly TileStamp[] = slagRiver();

const RIVER_MID = at(P.slagRiver);

/** The river's landmark: discovered on sight of its inner bridge, where its road reaches it. */
const SLAG_RIVER_SITE: LandmarkDef = {
  id: 'slag-river',
  name: 'Slag River',
  kind: 'ruin',
  ring: 4,
  area: { x0: RIVER_MID.tx - 4, y0: RIVER_MID.ty - 4, x1: RIVER_MID.tx + 4, y1: RIVER_MID.ty + 4 },
  features: [],
  nodes: [],
  guards: [],
  stamps: SLAG_RIVER_TILES,
  marker: 'river',
};

/** The Emberworks' landmarks, each moved whole to its place (the river is laid out where it runs). */
export const EMBERWORKS_SITES: readonly LandmarkDef[] = [
  placeLandmark(ASH_KILNS, at(P.ashKilns)),
  placeLandmark(CINDER_VENTS, at(P.cinderVents)),
  SLAG_RIVER_SITE,
  placeLandmark(OUTPOST_FORGE, at(P.outpostForge)),
];

/** The Anvil Hall as laid out (060): a walled hall 19 × 13 tiles, like 034's forum, its door in the south wall. */
const HALL_BOUNDS: TileRect = { x0: 0, y0: 0, x1: 18, y1: 12 };
const HALL_SHIFT = shiftTo(HALL_BOUNDS, at(P.anvilHall));
const hall = (t: TilePos): TilePos => shiftTile(t, HALL_SHIFT);
const BOUNDS: TileRect = { x0: HALL_BOUNDS.x0 + HALL_SHIFT.dx, y0: HALL_BOUNDS.y0 + HALL_SHIFT.dy, x1: HALL_BOUNDS.x1 + HALL_SHIFT.dx, y1: HALL_BOUNDS.y1 + HALL_SHIFT.dy };
const INSIDE: TileRect = { x0: BOUNDS.x0 + 1, y0: BOUNDS.y0 + 1, x1: BOUNDS.x1 - 1, y1: BOUNDS.y1 - 1 };
const DOOR: readonly TilePos[] = [7, 8, 9, 10, 11].map((tx) => hall({ tx, ty: HALL_BOUNDS.y1 }));
const DOOR_MID = hall({ tx: 9, ty: HALL_BOUNDS.y1 });

/** The hall's walls: every tile of its outline but the door's. */
function hallWalls(): TileStamp[] {
  const door = new Set(DOOR.map((t) => `${t.tx},${t.ty}`));
  const out: TileStamp[] = [];
  for (let tx = BOUNDS.x0; tx <= BOUNDS.x1; tx++) for (const ty of [BOUNDS.y0, BOUNDS.y1]) if (!door.has(`${tx},${ty}`)) out.push({ tx, ty, symbol: TILE.wall });
  for (let ty = BOUNDS.y0 + 1; ty < BOUNDS.y1; ty++) out.push({ tx: BOUNDS.x0, ty, symbol: TILE.wall }, { tx: BOUNDS.x1, ty, symbol: TILE.wall });
  return [...out, ...DOOR.map(stamp(TILE.arenaDoor))];
}

/** How close the player's feet box must be to the door to use it, px (the forum's). */
const DOOR_REACH = 20;

/**
 * The Forgewright's arena (060): walled all round, its door in the south wall (055's rules: sealed until the
 * Emberworks' barrier falls, E in and out). Its boss stands in the middle; its altar by the west wall summons it again
 * after its first kill (034's rule) for cinderite.
 */
export const ANVIL_HALL = {
  id: 'anvil-hall',
  name: 'Anvil Hall',
  boss: 'forgewright',
  bounds: BOUNDS,
  inside: INSIDE,
  walls: hallWalls(),
  door: {
    tiles: DOOR,
    // Behind a door in a south wall (the shrine's), two tiles in; one tile out.
    enterTo: { tx: DOOR_MID.tx, ty: DOOR_MID.ty - 2 },
    leaveTo: { tx: DOOR_MID.tx, ty: DOOR_MID.ty + 1 },
    reach: DOOR_REACH,
    unlock: 'emberworks',
    name: 'Anvil Hall door',
    sealed: 'Sealed',
  } satisfies ArenaDoor,
  /** Where its boss stands and rises: the middle of the hall. */
  start: hall({ tx: 9, ty: 6 }),
  /** Its altar stone by the west wall (the forum's is by its west wall too). */
  altar: { id: 'anvil-altar', ...hall({ tx: 2, ty: 6 }) },
  /** The spec's offering: 8 cinderite, from the carried inventory. */
  offering: { cinderite: 8 } as Readonly<Record<string, number>>,
  /** The summon's crack before it rises, ticks (the forum's). */
  summonTicks: 120,
} as const;

/** The road's last waypoint: the tile outside the hall's door (a road point is its 2 × 2 block's top-left). */
export const ANVIL_HALL_ROAD_END: TilePos = ANVIL_HALL.door.leaveTo;
