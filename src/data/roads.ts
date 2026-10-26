import { smoothCurve } from './curves';
import type { TilePos } from './tiles';
import { EMBERWORKS, type RampDef, type RampShape } from './emberworks';
import { ANVIL_HALL_ROAD_END } from './emberworksSites';
import { STORMCROWN as S } from './stormcrown';
import { CROWN_SPIRE_ROAD_END, SKY_BRIDGE_ROAD_END, WEATHERVANE_ROAD_END } from './stormcrownSites';
import { laidOut, WORLD_SHAPE } from './worldShape';

// The road network (053, D.3, Shaun: "it should just be one path"): dirt roads two tiles wide, laid as smooth curves
// through hand-placed waypoints, without crossings or doubled-up strips. Five roads leave the foundry's courtyard (the
// paved ruin field round the stairs, the network's hub: it holds no road, so every ley line crosses it to the stairs
// without meeting one) at their own bearings, each in the gap between two ley lines, and branch out to every landmark
// and both arenas; the south, west and north-west roads go on through the barrier into the Hollows. A branch starts on
// a waypoint of its parent, so the two meet there and nowhere else. A waypoint is a road's top-left tile, as 017's
// paths were: the road covers it and the tiles right of and below it.

export interface RoadDef {
  readonly id: string;
  /** The road it branches from (on one of that road's waypoints), or none for a road out of the courtyard. */
  readonly from?: string;
  readonly waypoints: readonly TilePos[];
}

/** The foundry's courtyard (053): the hub every road leaves from, round the stairs' door, this many tiles out. */
export const COURTYARD = { radius: 11 } as const;

/** A waypoint written in 053's coordinates, where it stands now (060: moved with the centre). */
const t = (tx: number, ty: number): TilePos => laidOut({ tx, ty });

/**
 * 060: a road up a ramp: along its centre line from its foot to its top (a road point is its 2 × 2 block's top-left, so
 * each sits half a tile up and left of the line), then on to `bearing` and `r` tiles out.
 */
function up(ramp: RampDef | undefined, bearing: number, r: number, shape: RampShape = EMBERWORKS.ramp): TilePos[] {
  if (!ramp) throw new Error('no such ramp');
  const { from, to } = shape;
  return [ring(ramp.bearing, from + 1), ring(ramp.bearing, (from + to) / 2), ring(ramp.bearing, to), ring(bearing, r)];
}

/** 060: the road point whose 2 × 2 block centres on the point `r` tiles out at `bearing`. */
function ring(bearing: number, r: number): TilePos {
  const a = (bearing * Math.PI) / 180;
  return { tx: Math.round(WORLD_SHAPE.centre.tx + r * Math.sin(a) - 0.5), ty: Math.round(WORLD_SHAPE.centre.ty - r * Math.cos(a) - 0.5) };
}

export const ROAD_DEFS: readonly RoadDef[] = [
  // South: past the start stone's meadow, on through the barrier to the Broken Aqueduct.
  { id: 'south', waypoints: [t(82, 93), t(81, 100), t(78, 108), t(80, 120), t(83, 131), t(84, 141)] },
  // West from the south road: past the Ruined Cache and the West Ley Spring, through the barrier, under the
  // ley-iron quarry wall and up to the Cistern Terrace.
  { id: 'terrace', from: 'south', waypoints: [t(78, 108), t(66, 110), t(54, 110), t(45, 114), t(37, 117), t(29, 116), t(25, 113)] },
  // West: to the Quarry's open south side.
  { id: 'west', waypoints: [t(73, 85), t(67, 88), t(63, 88)] },
  // North-west: past the North Ley Spring to the Frozen Grotto's mouth.
  { id: 'north', waypoints: [t(78, 74), t(75, 66), t(74, 58), t(77, 53)] },
  // To the Old Grove's open east side.
  { id: 'grove', from: 'north', waypoints: [t(75, 66), t(66, 64), t(56, 65)] },
  // Through the barrier, past the Hollows Ley Spring, round to the Sunken Forum's way in on its north side.
  { id: 'forum', from: 'north', waypoints: [t(74, 58), t(64, 52), t(55, 44), t(52, 37), t(49, 31), t(44, 31), t(40, 32)] },
  // North-east: to the shrine's gate.
  { id: 'shrine', waypoints: [t(93, 80), t(99, 74), t(103, 67)] },
  // To the Ley Grotto's north rim.
  { id: 'ley-grotto', from: 'shrine', waypoints: [t(99, 74), t(110, 76), t(121, 80)] },
  // East-south-east, north of the meadow's east pond: to the Husk Hive's open south side.
  { id: 'hive', waypoints: [t(89, 91), t(97, 96), t(105, 101), t(113, 107)] },
  // To the Reed Marsh's north edge.
  { id: 'marsh', from: 'hive', waypoints: [t(105, 101), t(103, 106), t(101, 111)] },
  // On past the Hive to the South-east Ley Spring.
  { id: 'south-east-spring', from: 'hive', waypoints: [t(113, 107), t(110, 110)] },
  // 060: up the ramps into the Emberworks. On from the aqueduct under its arch, up the south ramp to the Outpost Forge.
  { id: 'outpost-forge', from: 'south', waypoints: [t(84, 141), t(86, 146), t(86, 152), ...up(EMBERWORKS.ramps[0], 188, 90)] },
  // On from the Cistern Terrace, under its south side, up the west ramp to the Ash Kilns.
  { id: 'ash-kilns', from: 'terrace', waypoints: [t(25, 113), t(16, 113), ...up(EMBERWORKS.ramps[1], 256, 90)] },
  // From the forum road short of its door, up the north-west ramp and round the ring to the Anvil Hall's door.
  { id: 'anvil-hall', from: 'forum', waypoints: [t(44, 31), t(42, 26), ...up(EMBERWORKS.ramps[2], 333, 88), ANVIL_HALL_ROAD_END] },
  // From the north-west ramp's top, west round the ring to the Slag River's inner bridge.
  { id: 'slag-river', from: 'anvil-hall', waypoints: [up(EMBERWORKS.ramps[2], 0, 0)[2] ?? ANVIL_HALL_ROAD_END, ...[312, 302, 293.5].map((b) => ring(b, 88))] },
  // From the Anvil Hall's door, east round the ring to the Emberworks' Ley Spring, on the far side from every ramp.
  { id: 'emberworks-spring', from: 'anvil-hall', waypoints: [ANVIL_HALL_ROAD_END, ...[355, 10, 25, 40, 55].map((b) => ring(b, 87)), ring(68, 88)] },
  // 064: up the ramps into the Stormcrown. From the Anvil Hall's road at the top of its ramp, round the hall's west side
  // and up the north-west ramp to the Crown Spire's door.
  { id: 'crown-spire', from: 'anvil-hall', waypoints: [ring(333, 88), ring(326, 97), ...up(S.ramps[0], 338, 115, S.ramp), CROWN_SPIRE_ROAD_END] },
  // From the Emberworks spring road, up the north-east ramp to the Weathervane.
  { id: 'weathervane', from: 'emberworks-spring', waypoints: [ring(55, 87), ring(58, 97), ...up(S.ramps[1], 70, 120, S.ramp), WEATHERVANE_ROAD_END] },
  // From the Outpost Forge's road, up the south ramp and west round the ring to the Broken Sky-bridge.
  { id: 'sky-bridge', from: 'outpost-forge', waypoints: [ring(188, 90), ring(196, 99), ...up(S.ramps[2], 212, 119, S.ramp), ...[225, 238].map((b) => ring(b, 122)), SKY_BRIDGE_ROAD_END] },
  // From the south ramp's top, east round the ring to the Stormcrown's Ley Spring, on the far side from the nearest
  // ramp (so it keeps clear of the Weathervane's ley line home).
  { id: 'stormcrown-spring', from: 'sky-bridge', waypoints: [up(S.ramps[2], 0, 0, S.ramp)[2] ?? SKY_BRIDGE_ROAD_END, ...[188, 172, 156, 142].map((b) => ring(b, 120)), ring(132, 123)] },
];

/** Each road as laid: its smooth curve sampled about every tile, as top-left tiles (fractional between waypoints). */
export const ROADS: readonly (readonly TilePos[])[] = ROAD_DEFS.map((r) => smoothCurve(r.waypoints, 1));
