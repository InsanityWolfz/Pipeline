// How tiled rooms are dressed (014): floor variants, the 3/4-view wall pieces,
// and how often variants show. Pure data; render picks per tile. Since 017 only
// the foundry is tiled, on the ruin flagstone.

/**
 * Variants of the ruin flagstone, and out of 100 tiles how many show one. A
 * variant listed twice shows twice as often.
 */
export const FLOOR_VARIANTS: { percent: number; tiles: readonly string[] } = {
  percent: 40,
  tiles: ['floor-rune-cracked', 'floor-rune-moss', 'floor-rune-inlay', 'floor-rune-sand'],
};

/**
 * Wall pieces. A wall with floor below shows its carved face (the tall `face`
 * sprite); a wall with wall below is seen from above as a flat `top`, with a lit
 * `edgeSide` lip where floor lies beside it and an `edgeTop` lip where floor lies above.
 */
export const WALL_SPRITES = {
  face: 'wall',
  top: 'wall-top',
  topMoss: 'wall-top-moss',
  edgeSide: 'wall-edge-side',
  edgeTop: 'wall-edge-top',
} as const;

/** One wall top in this many is the mossy one. */
export const WALL_MOSS_ONE_IN = 7;

/**
 * Where props draw: wall props just in front of their wall; standing props this
 * far up from their tile's bottom edge, px. Looping props start at a frame picked
 * from their tile (× phaseX, × phaseY), so rows of them don't move in step.
 */
export const PROP_LAYOUT = { wallNudge: 0.5, standingInset: 8, phaseX: 7, phaseY: 3 } as const;

/**
 * Tiled rooms show this much more wall above their top row, px (019): the camera may scroll that far up, so
 * what's built into the north wall (the foundry intake) has room to rise up it. Collision and layout are unchanged.
 */
export const ROOM_TOP_MARGIN = 48;
