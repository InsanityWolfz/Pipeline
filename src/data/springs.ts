import type { TileRect } from './tiles';

// The Ley Springs (030), apart from overworld.ts so the landmark data (032) can name them.

/**
 * A Ley Spring (030): a pool of ley water out in the field. Standing with your feet in
 * its pool heals you fast; it has no uses or timers, and it isn't a safe zone. The pool
 * is open ground: feet, shots and enemies cross it as grass. Its centre is a tile's
 * centre; `radius` is the pool's, in tiles.
 */
export interface SpringDef {
  readonly id: string;
  /** Its landmark name (032), on the discovery banner. */
  readonly name: string;
  /** The danger ring (017) it sits in. */
  readonly ring: 1 | 2 | 3;
  readonly tx: number;
  readonly ty: number;
  readonly radius: number;
}

/** A spring pool's radius, tiles: room for the player and a little dodging. */
export const SPRING_RADIUS = 1.5;

/**
 * Each spring's clearing (030) reaches this many tiles from its centre: no trees, rocks or water on or round its pool.
 * Stamped over the generated terrain with the other landmarks, so the rest of the map stays as it was.
 */
export const SPRING_CLEARING = 3;

/**
 * The round map's springs (030, moved by 053). West: beside the road west to the Hollows, above the Ruined Cache.
 * South-east: at the end of the Husk Hive's road, on past the Hive. North: north-west of the ruin field,
 * between home and the Grotto, beside the north road, in its own clearing (to be cut if healing near home is too easy).
 */
export const SPRINGS: readonly SpringDef[] = [
  { id: 'west-spring', name: 'West Ley Spring', ring: 2, tx: 60, ty: 106, radius: SPRING_RADIUS },
  { id: 'south-east-spring', name: 'South-east Ley Spring', ring: 2, tx: 111, ty: 114, radius: SPRING_RADIUS },
  { id: 'north-spring', name: 'North Ley Spring', ring: 1, tx: 71, ty: 69, radius: SPRING_RADIUS },
  // Stonefall Hollows' (034): out in the ring, beside the road to the Bulwark's forum.
  { id: 'hollows-spring', name: 'Hollows Ley Spring', ring: 3, tx: 56, ty: 38, radius: SPRING_RADIUS },
];

/** A spring's clearing (030): a square of open ground round its pool. */
export function springClearing(s: { tx: number; ty: number }): TileRect {
  return { x0: s.tx - SPRING_CLEARING, y0: s.ty - SPRING_CLEARING, x1: s.tx + SPRING_CLEARING, y1: s.ty + SPRING_CLEARING };
}
