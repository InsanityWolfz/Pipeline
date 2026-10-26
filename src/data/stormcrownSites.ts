import type { ArenaDoor } from './arenas';
import type { TileStamp } from './hollows';
import type { LandmarkDef } from './landmarks';
import { placeLandmark, shiftTile, shiftTo } from './place';
import { TILE } from './rooms';
import { STORMCROWN } from './stormcrown';
import type { TilePos, TileRect } from './tiles';
import { fromCentre, polar, WORLD_SHAPE } from './worldShape';

// The Stormcrown's places (064): hand-placed landmarks, hidden until found (032), each laid out as the spec drew it and
// moved whole to its place in the ring (`STORMCROWN.places`). The Weathervane is the region's claimable site: its pylon
// overlooks the Rod Field behind it and sends its stormglass home (as 060's Ash Kilns do the Cinder Vents' cinderite);
// the Broken Sky-bridge, a ruined builders' bridge, arches over a chasm across the ring; the Crown Spire is the
// Conductor's walled arena, its six rod sockets in a ring round its middle. Names are Shaun's placeholders. Tiles
// throughout; the Ley Spring is in springs.ts.

const P = STORMCROWN.places;
const at = (p: { bearing: number; r: number }): TilePos => polar(p.bearing, p.r);
const stamp = (symbol: string) => (t: TilePos): TileStamp => ({ ...t, symbol });

/** Stormglass (064): storm rods on wind-scoured slate behind the Weathervane, struck by lightning now and then. No pylon: the Weathervane's sends their stormglass. */
const ROD_FIELD: LandmarkDef = {
  id: 'rod-field',
  name: 'Rod Field',
  kind: 'resource-site',
  ring: 5,
  area: { x0: 0, y0: 0, x1: 7, y1: 11 },
  features: [],
  nodes: [
    { nodeId: 'storm-rod', tx: 1, ty: 2 },
    { nodeId: 'storm-rod', tx: 5, ty: 1 },
    { nodeId: 'storm-rod', tx: 3, ty: 5 },
    { nodeId: 'storm-rod', tx: 6, ty: 6 },
    { nodeId: 'storm-rod', tx: 1, ty: 8 },
    { nodeId: 'storm-rod', tx: 5, ty: 10 },
  ],
  // 065 brings the region's enemies.
  guards: [],
  marker: 'site',
  look: { stormy: true },
};

/** The region's claimable site: a weathervane mast on a cairn-ringed terrace, its pylon on the east side over the rods. */
const WEATHERVANE: LandmarkDef = {
  id: 'weathervane',
  name: 'Weathervane',
  kind: 'resource-site',
  ring: 5,
  area: { x0: 0, y0: 0, x1: 9, y1: 11 },
  features: [],
  nodes: [],
  // 065 brings its guard pack.
  guards: [],
  pylon: { tx: 8, ty: 5, site: 'weathervane', supplies: ['stormglass'] },
  stamps: [
    ...[2, 3, 6, 7].map((tx) => stamp(TILE.cairn)({ tx, ty: 1 })),
    ...[2, 3, 6, 7].map((tx) => stamp(TILE.cairn)({ tx, ty: 10 })),
    stamp(TILE.ironRod)({ tx: 4, ty: 5 }),
    stamp(TILE.ironRod)({ tx: 1, ty: 3 }),
    stamp(TILE.ironRod)({ tx: 1, ty: 8 }),
  ],
  marker: 'site',
  look: { paving: 'slate' },
};

/**
 * The Broken Sky-bridge's chasm (064): a rift straight across the ring at its bearing, from the Emberworks' cliff
 * edge's foot out to the ring's own (half a tile into each, so nothing walks round its ends), `halfWidth` tiles either
 * side of its line, stopping feet but not shots; the builders' bridge crosses it at `bridge` tiles out, `bridgeHalf`
 * tiles either way along it, with open slate at each end.
 */
export const SKY_CHASM = { bearing: P.skyBridge.bearing, from: STORMCROWN.radii.inner + STORMCROWN.wall - 0.5, to: STORMCROWN.radii.outer + 0.5, halfWidth: 1.6, bridge: P.skyBridge.r, bridgeHalf: 1.5, landing: 2.5 } as const;

/** The chasm's tiles, row by row: open slate at the bridge's ends, then the chasm, then the bridge's deck over it. */
function skyChasm(): TileStamp[] {
  const R = SKY_CHASM;
  const a = (R.bearing * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const { tx: cx, ty: cy } = WORLD_SHAPE.centre;
  const box = Math.ceil(R.to) + 1;
  const floor: TileStamp[] = [];
  const rift: TileStamp[] = [];
  for (let ty = cy - box; ty <= cy + box; ty++) {
    for (let tx = cx - box; tx <= cx + box; tx++) {
      const along = (tx - cx) * ux + (ty - cy) * uy;
      const off = Math.abs((tx - cx) * uy - (ty - cy) * ux);
      const d = fromCentre(tx, ty);
      if (along <= 0 || d < R.from - R.landing || d > R.to) continue;
      const deck = Math.abs(d - R.bridge) <= R.bridgeHalf;
      if (off <= R.halfWidth && d >= R.from) rift.push({ tx, ty, symbol: deck ? TILE.bridge : TILE.chasm });
      else if (off <= R.halfWidth + R.landing && Math.abs(d - R.bridge) <= R.bridgeHalf + 0.5) floor.push({ tx, ty, symbol: TILE.floor });
    }
  }
  return [...floor, ...rift];
}

/** Every tile the chasm stamps: the bridge's landings, the rift and the deck. */
export const SKY_CHASM_TILES: readonly TileStamp[] = skyChasm();

const BRIDGE_MID = at(P.skyBridge);

/** The Broken Sky-bridge's landmark: discovered on sight of its deck. */
const SKY_BRIDGE: LandmarkDef = {
  id: 'sky-bridge',
  name: 'Broken Sky-bridge',
  kind: 'ruin',
  ring: 5,
  area: { x0: BRIDGE_MID.tx - 4, y0: BRIDGE_MID.ty - 4, x1: BRIDGE_MID.tx + 4, y1: BRIDGE_MID.ty + 4 },
  features: [],
  nodes: [],
  guards: [],
  stamps: SKY_CHASM_TILES,
  marker: 'bridge',
};

/** The Stormcrown's landmarks, each moved whole to its place (the chasm is laid out where it runs). */
export const STORMCROWN_SITES: readonly LandmarkDef[] = [placeLandmark(WEATHERVANE, at(P.weathervane)), placeLandmark(ROD_FIELD, at(P.rodField)), SKY_BRIDGE];

/** The Crown Spire as laid out (064): a walled court 21 × 17 tiles, its door in the south wall, facing the centre. */
const SPIRE_BOUNDS: TileRect = { x0: 0, y0: 0, x1: 20, y1: 16 };
const SPIRE_SHIFT = shiftTo(SPIRE_BOUNDS, at(P.crownSpire));
const spire = (t: TilePos): TilePos => shiftTile(t, SPIRE_SHIFT);
const BOUNDS: TileRect = { x0: SPIRE_BOUNDS.x0 + SPIRE_SHIFT.dx, y0: SPIRE_BOUNDS.y0 + SPIRE_SHIFT.dy, x1: SPIRE_BOUNDS.x1 + SPIRE_SHIFT.dx, y1: SPIRE_BOUNDS.y1 + SPIRE_SHIFT.dy };
const INSIDE: TileRect = { x0: BOUNDS.x0 + 1, y0: BOUNDS.y0 + 1, x1: BOUNDS.x1 - 1, y1: BOUNDS.y1 - 1 };
const DOOR: readonly TilePos[] = [8, 9, 10, 11, 12].map((tx) => spire({ tx, ty: SPIRE_BOUNDS.y1 }));
const DOOR_MID = spire({ tx: 10, ty: SPIRE_BOUNDS.y1 });
/** The court's middle, px: the centre of tile (10, 8). */
const MIDDLE = spire({ tx: 10, ty: 8 });

/** The spire's walls: every tile of its outline but the door's. */
function spireWalls(): TileStamp[] {
  const door = new Set(DOOR.map((t) => `${t.tx},${t.ty}`));
  const out: TileStamp[] = [];
  for (let tx = BOUNDS.x0; tx <= BOUNDS.x1; tx++) for (const ty of [BOUNDS.y0, BOUNDS.y1]) if (!door.has(`${tx},${ty}`)) out.push({ tx, ty, symbol: TILE.wall });
  for (let ty = BOUNDS.y0 + 1; ty < BOUNDS.y1; ty++) out.push({ tx: BOUNDS.x0, ty, symbol: TILE.wall }, { tx: BOUNDS.x1, ty, symbol: TILE.wall });
  return [...out, ...DOOR.map(stamp(TILE.arenaDoor))];
}

/** How far the six rod sockets stand from the court's middle, px (6 tiles), and the first's bearing on screen (degrees, 0 east, clockwise). */
const SOCKET_RING = { r: 192, first: 0 } as const;

/** 064 (raised): the Conductor stands this far in from its rod toward the middle, px, so its body and the rod are hit apart; it starts at the north-east rod. */
const STAND_IN = 40;
const START_ROD = 5;

const MIDDLE_PX = { x: (MIDDLE.tx + 0.5) * 32, y: (MIDDLE.ty + 0.5) * 32 };
const SOCKETS = Array.from({ length: 6 }, (_, i) => {
  const a = ((SOCKET_RING.first + i * 60) * Math.PI) / 180;
  return { x: Math.round(MIDDLE_PX.x + Math.cos(a) * SOCKET_RING.r), y: Math.round(MIDDLE_PX.y + Math.sin(a) * SOCKET_RING.r) };
});

/** Where the Conductor stands at a rod: `STAND_IN` px from its socket toward the middle, px. */
export function standPoint(rod: number): { x: number; y: number } {
  const s = SOCKETS[rod] ?? MIDDLE_PX;
  const d = Math.hypot(MIDDLE_PX.x - s.x, MIDDLE_PX.y - s.y) || 1;
  return { x: s.x + ((MIDDLE_PX.x - s.x) / d) * STAND_IN, y: s.y + ((MIDDLE_PX.y - s.y) / d) * STAND_IN };
}

const START_AT = standPoint(START_ROD);

/**
 * The Conductor's arena (064): walled all round, its door in the south wall (055's rules: sealed until the Stormcrown's
 * barrier falls, E in and out). Six rod sockets ring its middle, a hexagon `SOCKET_RING.r` px out, numbered clockwise
 * from the east; its altar in the north-west corner summons the Conductor again after its first kill (034's rule) for
 * stormglass.
 */
export const CROWN_SPIRE = {
  id: 'crown-spire',
  name: 'Crown Spire',
  boss: 'conductor',
  bounds: BOUNDS,
  inside: INSIDE,
  walls: spireWalls(),
  door: {
    tiles: DOOR,
    // Behind a door in a south wall (the shrine's), two tiles in; one tile out.
    enterTo: { tx: DOOR_MID.tx, ty: DOOR_MID.ty - 2 },
    leaveTo: { tx: DOOR_MID.tx, ty: DOOR_MID.ty + 1 },
    reach: 20,
    unlock: 'stormcrown',
    name: 'Crown Spire door',
    sealed: 'Sealed',
  } satisfies ArenaDoor,
  /** The court's middle tile. */
  middle: MIDDLE,
  /** The six rod sockets, px (each a rod's ground point), clockwise from the east. */
  sockets: SOCKETS,
  /** The rod its boss starts at, and the tile it stands on there (it rises there, 034's altar rule). */
  startRod: START_ROD,
  start: { tx: Math.floor(START_AT.x / 32), ty: Math.floor(START_AT.y / 32) } as TilePos,
  /** Its altar stone in the north-west corner, clear of the rods. */
  altar: { id: 'spire-altar', ...spire({ tx: 2, ty: 2 }) },
  /** The spec's offering: 8 stormglass, from the carried inventory. */
  offering: { stormglass: 8 } as Readonly<Record<string, number>>,
  /** The summon's crack before it rises, ticks (the forum's). */
  summonTicks: 120,
} as const;

/** The roads' last waypoints (a road point is its 2 × 2 block's top-left): outside the Crown Spire's door, by the Weathervane's west side, at the Sky-bridge's near end. */
export const CROWN_SPIRE_ROAD_END: TilePos = CROWN_SPIRE.door.leaveTo;
export const WEATHERVANE_ROAD_END: TilePos = at({ bearing: P.weathervane.bearing - 4, r: P.weathervane.r - 3 });
export const SKY_BRIDGE_ROAD_END: TilePos = at({ bearing: P.skyBridge.bearing - 2.5, r: P.skyBridge.r - 0.5 });
