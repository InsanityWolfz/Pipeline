import { shiftTile, shiftTo } from './place';
import { STORMCROWN } from './stormcrown';
import type { TilePos, TileRect } from './tiles';
import { polar } from './worldShape';

// The Stormcrown's places (064): hand-placed landmarks, hidden until found (032), each laid out as the spec drew it and
// moved whole to its place in the ring (`STORMCROWN.places`). Names are Shaun's placeholders. Tiles throughout.

const P = STORMCROWN.places;
const at = (p: { bearing: number; r: number }): TilePos => polar(p.bearing, p.r);

/** The Crown Spire as laid out (064): a walled court 21 × 17 tiles, its door in the south wall, facing the centre. */
export const SPIRE_BOUNDS_LOCAL: TileRect = { x0: 0, y0: 0, x1: 20, y1: 16 };
export const SPIRE_SHIFT = shiftTo(SPIRE_BOUNDS_LOCAL, at(P.crownSpire));
/** A Crown Spire tile, from its own layout's to the world's. */
export const spire = (t: TilePos): TilePos => shiftTile(t, SPIRE_SHIFT);
/** The middle of its door, in its south wall. */
export const SPIRE_DOOR_MID: TilePos = spire({ tx: 10, ty: SPIRE_BOUNDS_LOCAL.y1 });

/** The roads' last waypoints (a road point is its 2 × 2 block's top-left): outside the Crown Spire's door, by the Weathervane, at the Sky-bridge's near end. */
export const CROWN_SPIRE_ROAD_END: TilePos = { tx: SPIRE_DOOR_MID.tx, ty: SPIRE_DOOR_MID.ty + 1 };
export const WEATHERVANE_ROAD_END: TilePos = at({ bearing: P.weathervane.bearing - 4, r: P.weathervane.r - 3 });
export const SKY_BRIDGE_ROAD_END: TilePos = at({ bearing: P.skyBridge.bearing - 7, r: P.skyBridge.r });
