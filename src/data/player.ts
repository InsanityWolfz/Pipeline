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

/** What the player carries at the start, item id to count. */
export const STARTING_INVENTORY: Readonly<Record<string, number>> = { arrow: 30 };

/** How a run starts: what the player carries (and gets back on a KO), and what counts as already hand-crafted. */
export interface StartDef {
  inventory: Readonly<Record<string, number>>;
  crafted: readonly string[];
}

export const DEFAULT_START: StartDef = { inventory: STARTING_INVENTORY, crafted: [] };

/** Ticks the death animation plays before the player wakes in the foundry (011). */
export const DYING_TICKS = 60;

/** Health at the start and after a KO. Spec 004; no regen yet. */
export const MAX_HEALTH = 100;

/** Ticks a hit leaves the player invulnerable. */
export const HIT_INVULN_TICKS = 30;

/** A ground item this close to the feet box is picked up, px. */
export const PICKUP_RADIUS = 8;
