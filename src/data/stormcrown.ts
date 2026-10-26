import { rampGate, rampTiles, type RampDef, type RampShape } from './emberworks';
import type { TilePos } from './tiles';
import { fromCentre, WORLD_SHAPE } from './worldShape';

// Region 4, the Stormcrown (064): rod-studded heights where the ley lines surface as weather. The fifth ring and the
// highest, round the Emberworks past its cliff edge, up a few ramps through those cliffs, each sealed at its top by a
// ley barrier (gate `stormcrown`) until the Forgewright's first kill. Its terrain is generated from the map's seed with
// these settings after the Emberworks' (src/sim/stormcrownGen.ts): wind-scoured slate, iron rods and cairns, chasms;
// past it a final ragged cliff edge. Tiles throughout; numbers are tuning values.

export const STORMCROWN = {
  id: 'stormcrown',
  name: 'Stormcrown',
  /** Its region number (033's schematic regions) and its danger ring (017, 041): 5 anywhere past its barrier. */
  region: 4,
  ring: 5,
  /** The ring, by distance from the foundry's door: from the Emberworks' cliff edge out to its own (as wide as the Emberworks, 31 tiles). */
  radii: { inner: WORLD_SHAPE.emberworks, outer: WORLD_SHAPE.stormcrown },
  /** Mixed into the map's seed for the Stormcrown's own stream, so every inner ring's stays as it was. */
  salt: 0x64a7c5,
  /** The Emberworks' cliff edge: solid this many tiles out from `inner`, then the Stormcrown's ground, ragged at its foot. */
  wall: 3,
  /** Its ragged edges, as the Emberworks' (060): cliff at `raggedChance` within `ragged` tiles of an edge, halving away from it. */
  edge: { ragged: 3, raggedChance: 0.5 },
  /**
   * The ramps up through the Emberworks' cliffs (064, in data): north-west beside the Anvil Hall, so the Forgewright's
   * hall opens straight onto the climb to the Crown Spire; north-east off the Emberworks spring road; south past the
   * Outpost Forge.
   */
  ramps: [
    { id: 'storm-north-ramp', bearing: 320 },
    { id: 'storm-east-ramp', bearing: 60 },
    { id: 'storm-south-ramp', bearing: 200 },
  ] satisfies RampDef[],
  /** Each ramp's shape (the Emberworks' own, 060, a ring further out); its barrier `gateAt` tiles out, inside the wall. */
  ramp: { halfWidth: 2, from: WORLD_SHAPE.emberworks - 5, to: WORLD_SHAPE.emberworks + 7, gateAt: WORLD_SHAPE.emberworks + 2 } satisfies RampShape,
  /** Generated things start at least this many tiles in from the ring's edges. */
  inset: 3,
  /** Iron rods: single tall rods of the builders' storm-works, stopping feet and straight shots. */
  rods: 640,
  /** Cairns: heaped wind-cut stones, `w` × `h` tiles, stopping feet and straight shots. */
  cairns: { count: 900, w: [1, 2] as const, h: [1, 2] as const },
  /** Chasms: rifts in the rock, `w` × `h` tiles, stopping feet but not shots. (Counts are over the ring's bounding square.) */
  chasms: { count: 160, w: [2, 5] as const, h: [1, 3] as const },
  /** Generated ground keeps this many tiles clear either side of every road. */
  roadClear: 2,
  /** The boss whose first kill drops the barrier (064: the Forgewright). */
  opensOn: 'forgewright',
  /**
   * Where its places stand (the middle of each one's area), by bearing and distance from the foundry's door
   * (src/data/stormcrownSites.ts lays them out). The north-west ramp's road climbs to the Crown Spire's door; the
   * north-east's to the Weathervane, its pylon overlooking the Rod Field behind it (as the Ash Kilns overlook the
   * Cinder Vents); the south's west round the ring to the Broken Sky-bridge over a chasm across the ring. The Ley
   * Spring is on the far side of the ring from the nearest ramp, in the widest gap between them (60°–200°).
   */
  places: {
    crownSpire: { bearing: 345, r: 126 },
    weathervane: { bearing: 80, r: 122 },
    rodField: { bearing: 80, r: 131 },
    skyBridge: { bearing: 255, r: 126 },
    spring: { bearing: 130, r: 124 },
  },
} as const;

/** True if a tile is on the Stormcrown's ground (064: from the Emberworks' outer circle out, the cliff edge included). */
export const inStormcrown = (tx: number, ty: number): boolean => fromCentre(tx, ty) >= STORMCROWN.radii.inner;

/** True if a tile is in Region 4 and danger ring 5 (064, 060's rule): from its barrier's circle across the ramps out. */
export const pastStormcrownBarrier = (tx: number, ty: number): boolean => fromCentre(tx, ty) >= STORMCROWN.ramp.gateAt;

/** Every tile of a Stormcrown ramp. */
export const stormRampTiles = (ramp: RampDef): TilePos[] => rampTiles(ramp, STORMCROWN.ramp);

/** The `stormcrown` gate's tiles: the band across the top of every ramp. */
export const STORMCROWN_GATE: readonly TilePos[] = STORMCROWN.ramps.flatMap((r) => rampGate(r, STORMCROWN.ramp));

