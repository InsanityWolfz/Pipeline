import { smoothCurve } from './curves';
import type { TilePos } from './tiles';

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

const t = (tx: number, ty: number): TilePos => ({ tx, ty });

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
  // East-south-east, north of the meadow's east pond: to the Husk Hive's open south side, then bending south on to the
  // South-east Ley Spring (it was a spur doubling back from the Hive, a hairpin).
  { id: 'hive', waypoints: [t(89, 91), t(97, 96), t(105, 101), t(113, 107), t(112, 111)] },
  // To the Reed Marsh's north edge.
  { id: 'marsh', from: 'hive', waypoints: [t(105, 101), t(103, 106), t(101, 111)] },
];

/** Each road as laid: its smooth curve sampled about every tile, as top-left tiles (fractional between waypoints). */
export const ROADS: readonly (readonly TilePos[])[] = ROAD_DEFS.map((r) => smoothCurve(r.waypoints, 1));
