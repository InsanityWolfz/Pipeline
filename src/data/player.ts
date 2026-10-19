import { OVERWORLD } from './overworld';
import { DEFAULT_ROOM, FOUNDRY_ROOM } from './rooms';

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
  /** Where in the room (017: the overworld has several starts). A KO back to this room lands here too. */
  spawn: { tx: number; ty: number };
  inventory: Readonly<Record<string, number>>;
  crafted: readonly string[];
  hasTube: boolean;
  attuned: boolean;
  gatesOpen: boolean;
  /** The living population (017) is out from the start, as if the first line had filled the tube. */
  populated: boolean;
}

/**
 * The sandbox start: the meadow beside the ruin field (017), 30 arrows, the tube
 * in hand, gates open. The sim's default, so tests start here; the game reaches
 * it with `?start=field`.
 */
export const DEFAULT_START: StartDef = {
  room: DEFAULT_ROOM,
  spawn: OVERWORLD.field,
  inventory: STARTING_INVENTORY,
  crafted: [],
  hasTube: true,
  attuned: false,
  gatesOpen: true,
  populated: false,
};

/** The real game's start (012): waking by the tube's stone in the overworld's meadow (017) with nothing, every gate shut. */
export const TUTORIAL_START: StartDef = {
  room: DEFAULT_ROOM,
  spawn: OVERWORLD.wake,
  inventory: {},
  crafted: [],
  hasTube: false,
  attuned: false,
  gatesOpen: false,
  populated: false,
};

/** Where a death wakes the player (011). */
export const RESPAWN_ROOM = FOUNDRY_ROOM;

/** Ticks the death animation plays before the player wakes in the foundry (011). */
export const DYING_TICKS = 60;

/** Health at the start and after a KO (004). It comes back only in safe spots (030: see HEALING). */
export const MAX_HEALTH = 100;

/** Where the player heals (030). */
export type HealSource = 'foundry' | 'pylon' | 'spring' | 'regen';

/**
 * Healing rates, HP per second (030), all starting values. Only in safe spots: the foundry room, a claimed
 * pylon's safe zone, a Ley Spring's pool. `fieldRegen` heals anywhere; it's 0 until gear (036) and talents
 * (037) raise it. Rates never stack: the highest that applies heals. `afterHitDelay`: ticks healing waits after a hit.
 */
export const HEALING: { foundry: number; pylon: number; spring: number; fieldRegen: number; afterHitDelay: number } = {
  foundry: 50,
  pylon: 10,
  spring: 10,
  fieldRegen: 0,
  afterHitDelay: 0,
};

/** Ticks a hit leaves the player invulnerable. */
export const HIT_INVULN_TICKS = 30;

/** A ground item this close to the feet box is picked up, px: about two tiles, through anything in between (021). */
export const PICKUP_RADIUS = 64;
