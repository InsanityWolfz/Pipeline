// Player movement tuning. Starting values from spec 002; tune in playtest.

/** Walk top speed, px per second. */
export const WALK_SPEED = 120;

/** Ticks to reach top speed from rest, and to come back to rest. */
export const ACCEL_TICKS = 6;

/** Distance a roll covers on open floor, px. */
export const ROLL_DISTANCE = 96;

/** Length of a roll, ticks. */
export const ROLL_TICKS = 18;

/** The first this-many roll ticks are invulnerable. */
export const INVULN_TICKS = 12;

/** Ticks after a roll ends before another can start. */
export const ROLL_COOLDOWN_TICKS = 30;

/** Collision box at the player's feet, px, centred on the feet position. */
export const FEET_BOX = { w: 16, h: 8 } as const;
