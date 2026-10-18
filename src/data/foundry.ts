// Foundry tuning. Starting values from specs 006 and 008; tune in playtest.

/** Ticks an item takes to cross one conduit tile. */
export const CONDUIT_TICKS = 15;

/** Most of each input a machine buffers. */
export const INPUT_CAP = 4;

/** Most finished items a machine holds; it won't start a craft whose output wouldn't fit. */
export const OUTPUT_CAP = 4;

/** Ticks between a hopper's pushes. */
export const HOPPER_TICKS = 15;

/** Most items a crate holds, all kinds together. */
export const CRATE_CAP = 99;

/** How close the player's feet box must be to a hopper or crate to use it, px. */
export const USE_REACH = 12;

/** Ticks an item spends passing through a gravity stager (008). */
export const STAGER_TICKS = 15;

/** A gravity stager's angles, degrees from the aim (positive turns clockwise on screen). E or a click steps through them in order. */
export const STAGER_ANGLES: readonly number[] = [-30, -15, 0, 15, 30];

/** The angle a new stager starts at. */
export const STAGER_START_ANGLE = 0;

/**
 * The foundry intake (019): the waterslide pipe built into the centre of the north wall. Lines feed its mouth, three
 * wall tiles, each from the floor tile directly south of it, into the tube's one reservoir. `gaugeRings`: how many
 * rings of its gauge light as the reservoir fills; a ring of light runs up the pipe for `pulseMs` after each item.
 */
export const INTAKE = {
  mouth: [
    { tx: 11, ty: 0 },
    { tx: 12, ty: 0 },
    { tx: 13, ty: 0 },
  ],
  gaugeRings: 10,
  pulseMs: 450,
  /** While attuning, the camera looks at this point on the pipe: px above the middle of its mouth. */
  lookRise: 36,
} as const;
