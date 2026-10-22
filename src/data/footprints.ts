// Footprints (059, 059.3, Shaun: "every blocking prop whose drawing is smaller than its tile gets a box fitted to its
// drawn shape, in every region"): the box a tile-drawn terrain piece blocks, by its sprite key, instead of its whole
// tile. Each is its sprite's drawn base, the shadow ellipse round its foot (src/data/art), rounded outward to whole px,
// in px from the anchor at its tile's bottom centre (y up is negative). src/sim/footprints.ts clips it to the tile, so
// a piece never blocks more than its tile did. A sprite not listed here (a wall, a cliff, a tree's canopy, the indoor
// ruin block) fills its tile and blocks all of it, as before.

/** A footprint: px from its tile's bottom centre, left/top edges `x0`/`y0`, right/bottom edges `x1`/`y1`. */
export interface Footprint {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export const FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  // Region 1's boulders (017): shadow(15k, 4k, -1), k 1.15 and 0.9.
  'ow-rock-0': { x0: -18, y0: -6, x1: 18, y1: 4 },
  'ow-rock-1': { x0: -14, y0: -5, x1: 14, y1: 3 },
  // The ruin's squared stones and broken columns (017).
  'ow-ruin-stone': { x0: -15, y0: -5, x1: 15, y1: 3 },
  'ow-column': { x0: -11, y0: -5, x1: 11, y1: 3 },
  // The Quarry's cut blocks (032) and the Husk Hive's nest stones (049).
  'ow-cut-block-0': { x0: -15, y0: -5, x1: 15, y1: 3 },
  'ow-cut-block-1': { x0: -16, y0: -5, x1: 16, y1: 3 },
  'ow-hive-stone-0': { x0: -20, y0: -6, x1: 20, y1: 4 },
  'ow-hive-stone-1': { x0: -20, y0: -6, x1: 20, y1: 4 },
  // Stonefall Hollows (034): loose rubble (k 1.1 and 0.85), the aqueduct's pillars and its fallen spans.
  'ow-rubble-0': { x0: -15, y0: -5, x1: 15, y1: 3 },
  'ow-rubble-1': { x0: -12, y0: -4, x1: 12, y1: 2 },
  'ow-aqueduct-pillar': { x0: -14, y0: -5, x1: 14, y1: 3 },
  'ow-fallen-span-0': { x0: -16, y0: -6, x1: 16, y1: 4 },
  'ow-fallen-span-1': { x0: -16, y0: -6, x1: 16, y1: 4 },
};
