import { smoothCurve } from './curves';
import { MEADOW_VEIN, RUIN_AREA, SHRINE_PYLON, SHRINE_SHIFT } from './home';
import { LANDMARK_LIST } from './landmarks';
import { shiftTile } from './place';
import type { TilePos } from './tiles';
import { laidOut, laidOut060, WORLD_SHAPE } from './worldShape';

// Ley lines (018, 053): glowing seams in the ground where ley comes near the surface. Since 053 (D.3, Shaun: "not
// overlapping each other… one path") each pylon's line home is one smooth curve from the pylon to its own point on
// the foundry's ruin, coming in at its own bearing between two roads (roads.ts), so no line meets a road or another
// line. Short seams where veins stand (the shrine's two, the Ley Grotto's four) meet their pylon and nothing else.
// Points are tile coordinates whose centres the seam runs through (fractional between waypoints).

/** A line's route home: waypoints after its pylon, and the bearing (degrees clockwise from north) it reaches the ruin at. */
interface LeyRoute {
  readonly via: readonly TilePos[];
  readonly arrive: number;
}

/** Where every line's last stretch starts: this far from the door along its bearing, so it comes in straight across the courtyard. */
const APPROACH = 10;

/** The point `r` tiles from the door at a bearing, unrounded. */
const toward = (bearing: number, r: number): TilePos => {
  const a = (bearing * Math.PI) / 180;
  return { tx: Math.round((WORLD_SHAPE.centre.tx + r * Math.sin(a)) * 100) / 100, ty: Math.round((WORLD_SHAPE.centre.ty - r * Math.cos(a)) * 100) / 100 };
};

/** Where a line coming in at a bearing meets the ruin's edge (its footprint's outline, round its middle). */
export function ruinEdge(bearing: number): TilePos {
  const a = (bearing * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const cx = (RUIN_AREA.x0 + RUIN_AREA.x1) / 2;
  const cy = (RUIN_AREA.y0 + RUIN_AREA.y1) / 2;
  const hx = (RUIN_AREA.x1 - RUIN_AREA.x0 + 1) / 2;
  const hy = (RUIN_AREA.y1 - RUIN_AREA.y0 + 1) / 2;
  const k = Math.min(Math.abs(dx) > 1e-9 ? hx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hy / Math.abs(dy) : Infinity);
  return { tx: Math.round((cx + dx * k) * 100) / 100, ty: Math.round((cy + dy * k) * 100) / 100 };
}

/** Each pylon's route home, by its site id. Hand-placed waypoints are in 053's coordinates, moved with the centre (060). */
const ROUTES: Readonly<Record<string, LeyRoute>> = {
  shrine: { via: [toward(30, APPROACH)], arrive: 30 },
  quarry: { via: [toward(282, APPROACH)], arrive: 282 },
  'old-grove': { via: [toward(305, APPROACH)], arrive: 305 },
  'ley-grotto': { via: [toward(95, APPROACH)], arrive: 95 },
  // Through the meadow's vein, into the stairs' door.
  'reed-marsh': { via: [laidOut({ tx: 93, ty: 113 }), MEADOW_VEIN], arrive: 170 },
  'husk-hive': { via: [toward(118, APPROACH)], arrive: 118 },
  // Out of the Hollows across Region 1's west, between the west and south roads.
  // 055: east of the north road, down to the ruin's north edge between that road and the shrine's line.
  'frozen-grotto': { via: [laidOut({ tx: 84, ty: 52 }), laidOut({ tx: 85, ty: 63 }), toward(355, APPROACH)], arrive: 355 },
  // 060: its last stretch moved south (240° to 225°) to make room for the Ash Kilns' line beside it.
  'cistern-terrace': { via: [...[{ tx: 40, ty: 104 }, { tx: 55, ty: 100 }].map(laidOut), toward(225, APPROACH)], arrive: 225 },
  // 060: out of the Emberworks over the cliffs north of the west ramp, north of the Hollows' Cut and the Cistern Terrace,
  // south of the Quarry, in between the west road and the Cistern Terrace's line.
  // Written in 060's coordinates (064: moved with the centre).
  'ash-kilns': { via: [...[{ tx: 27, ty: 126 }, { tx: 40, ty: 121 }, { tx: 58, ty: 122 }, { tx: 77, ty: 123 }, { tx: 94, ty: 124 }].map(laidOut060), toward(240, APPROACH)], arrive: 240 },
};

const lineHome = (pylon: TilePos, route: LeyRoute): TilePos[] => smoothCurve([{ tx: pylon.tx, ty: pylon.ty }, ...route.via, ruinEdge(route.arrive)], 1);

const routeOf = (site: string): LeyRoute => {
  const r = ROUTES[site];
  if (!r) throw new Error(`No ley route home for '${site}'`);
  return r;
};

/** The shrine's two vein seams (018), each ending on its pylon. */
const SHRINE_SEAMS = {
  'shrine-west': [{ tx: 100, ty: 9 }, { tx: 103, ty: 9 }, { tx: 106, ty: 8 }].map((t) => shiftTile(t, SHRINE_SHIFT)),
  'shrine-east': [{ tx: 112, ty: 9 }, { tx: 109, ty: 9 }, { tx: 106, ty: 8 }].map((t) => shiftTile(t, SHRINE_SHIFT)),
};

/**
 * Every ley line on the map, by id: each pylon's line home named by its site (`shrine` and each landmark's), the
 * shrine's seams, and each landmark's vein seams (`<id>-<n>`).
 */
export const LEY_LINES: Readonly<Record<string, readonly TilePos[]>> & { readonly shrine: readonly TilePos[] } = {
  shrine: lineHome(SHRINE_PYLON, routeOf('shrine')),
  ...SHRINE_SEAMS,
  ...Object.fromEntries(
    LANDMARK_LIST.flatMap((l) => [...(l.pylon ? [[l.id, lineHome(l.pylon, routeOf(l.pylon.site))] as const] : []), ...(l.veinLines ?? []).map((v, i) => [`${l.id}-${i}`, v] as const)]),
  ),
};

/** The ids of the lines home (one per pylon), as against the vein seams. */
export const LINES_HOME: readonly string[] = ['shrine', ...LANDMARK_LIST.flatMap((l) => (l.pylon ? [l.pylon.site] : []))];
