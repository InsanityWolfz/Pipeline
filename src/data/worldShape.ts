import type { TilePos } from './tiles';

// The round world (053, Shaun: "we don't want a square or rectangle. We want like a circle"): the overworld is a
// square grid with the foundry's door at its centre. Region 1 is the disc round it, about twice the old Region 1's
// 80 × 45 tiles; Stonefall Hollows (034) is the ring round that, like a donut, with the ley barrier on the circle
// between them (053.2); past the Hollows the ground rises into a ragged cliff edge. Tiles throughout; distances are
// straight lines between tile coordinates, as the danger rings (017) always measured them.

export const WORLD_SHAPE = {
  /** The grid's width and height. */
  size: 168,
  /** The foundry's door: the centre of every ring. */
  centre: { tx: 84, ty: 84 } as TilePos,
  /** Region 1's radius: the barrier stands on this circle. π × 48² ≈ 7,238 tiles, twice 80 × 45. */
  region1: 48,
  /** The Hollows' outer radius (053.2: the ring is as wide as Region 1's radius less ring 0's, 48 − 17). */
  hollows: 79,
  /** Region 1's danger rings (017, 041), concentric: ring 0 inside the first bound, ring 1 inside the second, ring 2 to the barrier. */
  rings: [17, 30] as const,
  /** The barrier's band: every tile whose distance from the centre is within this of `region1` (√½, so the band has no diagonal gap). */
  barrierHalfWidth: 0.71,
} as const;

/** A tile's straight-line distance from the foundry's door, in tiles. */
export const fromCentre = (tx: number, ty: number): number => Math.hypot(tx - WORLD_SHAPE.centre.tx, ty - WORLD_SHAPE.centre.ty);

/** A tile's bearing from the foundry's door, degrees clockwise from north (0..360). */
export const bearingOf = (tx: number, ty: number): number => {
  const b = (Math.atan2(tx - WORLD_SHAPE.centre.tx, WORLD_SHAPE.centre.ty - ty) * 180) / Math.PI;
  return b < 0 ? b + 360 : b;
};

/** The tile at a bearing (degrees clockwise from north) and distance (tiles) from the foundry's door, rounded. */
export function polar(bearing: number, r: number): TilePos {
  const a = (bearing * Math.PI) / 180;
  return { tx: Math.round(WORLD_SHAPE.centre.tx + r * Math.sin(a)), ty: Math.round(WORLD_SHAPE.centre.ty - r * Math.cos(a)) };
}

/** True if a tile is in the barrier's band (053.2): the full circle between Region 1 and the Hollows. */
export const onBarrier = (tx: number, ty: number): boolean => Math.abs(fromCentre(tx, ty) - WORLD_SHAPE.region1) <= WORLD_SHAPE.barrierHalfWidth;

/** Every tile of the barrier's band, row by row. */
export function barrierTiles(): TilePos[] {
  const { centre, region1, barrierHalfWidth } = WORLD_SHAPE;
  const r = Math.ceil(region1 + barrierHalfWidth);
  const out: TilePos[] = [];
  for (let ty = centre.ty - r; ty <= centre.ty + r; ty++) for (let tx = centre.tx - r; tx <= centre.tx + r; tx++) if (onBarrier(tx, ty)) out.push({ tx, ty });
  return out;
}
