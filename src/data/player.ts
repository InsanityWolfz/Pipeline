import { CLEARING_ROOM, DEFAULT_ROOM, FOUNDRY_ROOM } from './rooms';

// Player movement tuning. Starting values from spec 002; tune in playtest.

/** Walk top speed, px per second. */
export const WALK_SPEED = 120;

/** Walk speed multiplier while the tube really fires (016): it's heavy. Stacks with heavy armor. */
export const FIRING_WALK_MULTIPLIER = 0.7;

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

/**
 * How a run starts: where, what the player carries (banked), what counts as
 * already hand-crafted, whether they hold the tube and it's attuned, and
 * whether the tutorial's gates (012) start open.
 */
export interface StartDef {
  room: string;
  inventory: Readonly<Record<string, number>>;
  crafted: readonly string[];
  hasTube: boolean;
  attuned: boolean;
  gatesOpen: boolean;
}

/**
 * The sandbox start: the ruin hall, 30 arrows, the tube in hand, gates open.
 * The sim's default, so tests start here; the game reaches it with `?start=hall`.
 */
export const DEFAULT_START: StartDef = {
  room: DEFAULT_ROOM,
  inventory: STARTING_INVENTORY,
  crafted: [],
  hasTube: true,
  attuned: false,
  gatesOpen: true,
};

/** The real game's start (012): waking in the clearing with nothing, the tube still on its stone, every gate shut. */
export const TUTORIAL_START: StartDef = {
  room: CLEARING_ROOM,
  inventory: {},
  crafted: [],
  hasTube: false,
  attuned: false,
  gatesOpen: false,
};

/** Where a death wakes the player (011). */
export const RESPAWN_ROOM = FOUNDRY_ROOM;

/** Ticks the death animation plays before the player wakes in the foundry (011). */
export const DYING_TICKS = 60;

/** Health at the start and after a KO. Spec 004; no regen yet. */
export const MAX_HEALTH = 100;

/** Ticks a hit leaves the player invulnerable. */
export const HIT_INVULN_TICKS = 30;

/** A ground item this close to the feet box is picked up, px. */
export const PICKUP_RADIUS = 8;
