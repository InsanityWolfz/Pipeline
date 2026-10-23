import type { TilePos } from './tiles';
import { fromCentre, polar, WORLD_SHAPE } from './worldShape';

// Region 3, the Emberworks (060): the builders' smelting terraces, where ley still feeds the old forges. The third
// ring, round Stonefall Hollows past its cliff edge (053's world is round, each region a ring round the last), up a few
// ramps through those cliffs, each sealed at its top by a ley barrier (gate `emberworks`) until the Bulwark's first
// kill. Its terrain is generated from the map's seed with these settings after the Hollows' (src/sim/emberworksGen.ts);
// past it the ground rises into a new ragged cliff edge. Tiles throughout; numbers are tuning values.

/** A ramp up through the Hollows' cliff edge, by its bearing from the foundry's door (degrees clockwise from north). */
export interface RampDef {
  readonly id: string;
  readonly bearing: number;
}

export const EMBERWORKS = {
  id: 'emberworks',
  name: 'Emberworks',
  /** Its region number (033's schematic regions) and its danger ring (017, 041): 4 anywhere inside. */
  region: 3,
  ring: 4,
  /** The ring, by distance from the foundry's door: from the Hollows' cliff edge out to its own. */
  radii: { inner: WORLD_SHAPE.hollows, outer: WORLD_SHAPE.emberworks },
  /** Mixed into the map's seed for the Emberworks' own stream, so Region 1's and the Hollows' stay as they were. */
  salt: 0x60e3b5,
  /** The Hollows' cliff edge: solid this many tiles out from `inner`, then the Emberworks' ground, ragged at its foot. */
  wall: 3,
  /**
   * Its ragged edges, like the Hollows' (053): within `ragged` tiles of the wall's outer side and of `outer`, a tile is
   * cliff at `raggedChance`, halving away from the edge; past `outer` the ground is cliff out to the grid's edge.
   */
  edge: { ragged: 3, raggedChance: 0.5 },
  /** The ramps up through the cliffs (060: "a few"), each fed by a Hollows road: south past the aqueduct, west past the Cistern Terrace, north-west past the forum. */
  ramps: [
    { id: 'south-ramp', bearing: 178 },
    { id: 'west-ramp', bearing: 252 },
    { id: 'north-ramp', bearing: 325 },
  ] satisfies RampDef[],
  /**
   * Each ramp's shape: the tiles within `halfWidth` of its centre line, from `from` to `to` tiles out, walkable stone
   * steps through the Hollows' ragged edge, the wall and the Emberworks' ragged foot. Its barrier stands across it
   * `gateAt` tiles out, inside the wall, so nothing walks round it.
   */
  ramp: { halfWidth: 2, from: WORLD_SHAPE.hollows - 5, to: WORLD_SHAPE.hollows + 7, gateAt: WORLD_SHAPE.hollows + 2 },
  /** Generated things start at least this many tiles in from the ring's edges (past the wall and its ragged foot). */
  inset: 3,
  /** Kilns: blocks of `w` × `h` tiles standing in terraced rows, stopping feet and straight shots. */
  kilns: { count: 700, w: [2, 3] as const, h: [1, 2] as const },
  /** Chimneys: single stacks, stopping feet and straight shots. */
  chimneys: 500,
  /** Ash terraces: low cut steps, walkable, `w` × `h` tiles. (Counts are drawn over the ring's bounding square; about a quarter land in it.) */
  terraces: { count: 200, w: [4, 8] as const, h: [2, 3] as const },
  /** Generated ground keeps this many tiles clear either side of every road. */
  roadClear: 2,
  /** The boss whose first kill drops the barrier (060: the Bulwark). */
  opensOn: 'bulwark',
  /**
   * Where its places stand, by bearing and distance (tiles) from the foundry's door: each ramp's road climbs to one of
   * the three the goals send the player to (the Ash Kilns, the Cinder Vents, the Anvil Hall); the Ley Spring is on the
   * far side of the ring from every ramp.
   */
  places: {
    ashKilns: { bearing: 258, r: 96 },
    cinderVents: { bearing: 178, r: 97 },
    anvilHall: { bearing: 325, r: 97 },
    outpostForge: { bearing: 205, r: 95 },
    spring: { bearing: 70, r: 95 },
  },
} as const;

/** True if a tile is in the Emberworks (060: anywhere from the Hollows' outer circle out, the cliff edge included). */
export const inEmberworks = (tx: number, ty: number): boolean => fromCentre(tx, ty) >= EMBERWORKS.radii.inner;

/** A tile's distance from a ramp's centre line (the ray from the centre at its bearing), tiles. */
function offLine(ramp: RampDef, tx: number, ty: number): number {
  const a = (ramp.bearing * Math.PI) / 180;
  const dx = tx - WORLD_SHAPE.centre.tx;
  const dy = ty - WORLD_SHAPE.centre.ty;
  return Math.abs(dx * Math.cos(a) + dy * Math.sin(a));
}

/** Every tile of a ramp, row by row: within `halfWidth` of its centre line, between `from` and `to` tiles out. */
export function rampTiles(ramp: RampDef): TilePos[] {
  const { halfWidth, from, to } = EMBERWORKS.ramp;
  const mid = polar(ramp.bearing, (from + to) / 2);
  const reach = Math.ceil((to - from) / 2 + halfWidth + 1);
  const out: TilePos[] = [];
  for (let ty = mid.ty - reach; ty <= mid.ty + reach; ty++) {
    for (let tx = mid.tx - reach; tx <= mid.tx + reach; tx++) {
      const d = fromCentre(tx, ty);
      // On the ramp's own side of the centre (the ray, not the whole line through it).
      const ahead = (tx - WORLD_SHAPE.centre.tx) * Math.sin((ramp.bearing * Math.PI) / 180) - (ty - WORLD_SHAPE.centre.ty) * Math.cos((ramp.bearing * Math.PI) / 180) > 0;
      if (ahead && d >= from && d <= to && offLine(ramp, tx, ty) <= halfWidth) out.push({ tx, ty });
    }
  }
  return out;
}

/** The barrier's band across a ramp: its tiles within √½ of `gateAt` tiles out, so the band has no diagonal gap. */
export const rampGate = (ramp: RampDef): TilePos[] => rampTiles(ramp).filter((t) => Math.abs(fromCentre(t.tx, t.ty) - EMBERWORKS.ramp.gateAt) <= WORLD_SHAPE.barrierHalfWidth);

/** The `emberworks` gate's tiles: the band across the top of every ramp. */
export const EMBERWORKS_GATE: readonly TilePos[] = EMBERWORKS.ramps.flatMap(rampGate);
