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
