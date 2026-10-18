// Foundry tuning. Starting values from spec 006; tune in playtest.

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
