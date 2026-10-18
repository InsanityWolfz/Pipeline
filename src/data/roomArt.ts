// How rooms are dressed (014): floor variants per theme, the 3/4-view wall
// pieces, and how often variants show. Pure data; render picks per tile.

/** The floor theme of rooms without one: the ruin flagstone. */
export const DEFAULT_FLOOR_THEME = 'ruin';

/**
 * Variant tiles per floor theme (the base tile is FLOOR_SPRITES, or the ruin
 * flagstone), and out of 100 tiles how many show one. A variant listed twice
 * shows twice as often.
 */
export const FLOOR_VARIANTS: Readonly<Record<string, { percent: number; tiles: readonly string[] }>> = {
  ruin: { percent: 30, tiles: ['floor-rune-cracked', 'floor-rune-moss', 'floor-rune-inlay', 'floor-rune-sand'] },
  shrine: { percent: 30, tiles: ['floor-shrine-cracked', 'floor-shrine-moss', 'floor-shrine-inlay', 'floor-shrine-roots'] },
  clearing: {
    percent: 22,
    tiles: ['floor-clearing-flowers', 'floor-clearing-flowers', 'floor-clearing-tufts', 'floor-clearing-tufts', 'floor-clearing-stones', 'floor-clearing-dirt'],
  },
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

/** Where props draw: wall props just in front of their wall; standing props this far up from their tile's bottom edge, px. */
export const PROP_LAYOUT = { wallNudge: 0.5, standingInset: 8 } as const;
