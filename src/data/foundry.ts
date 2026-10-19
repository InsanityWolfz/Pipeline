// Foundry tuning. Starting values from specs 006, 019 and 024; tune in playtest.

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

/**
 * The foundry intake (019): the waterslide pipe built into the centre of the north wall. Its mouth is three wall
 * tiles, each an entrance (024) with its own reservoir, fed from the floor tile directly south of it. Only the centre
 * starts open; the sides are capped until a warden core opens them. `gaugeRings`: how many rings of each entrance's
 * gauge light as it fills; a ring of light runs up the pipe for `pulseMs` after each item.
 */
export const INTAKE = {
  entrances: [
    { tx: 11, ty: 0, startsOpen: false },
    { tx: 12, ty: 0, startsOpen: true },
    { tx: 13, ty: 0, startsOpen: false },
  ],
  gaugeRings: 10,
  pulseMs: 450,
  /** While attuning, the camera looks at this point on the pipe: px above the middle of its mouth. */
  lookRise: 36,
} as const;

/** Rounds each entrance holds (024); 90 once all three are open. */
export const ENTRANCE_CAP = 30;

/** Degrees between aimed rounds of one ammo in a volley, fanned evenly about the aim (024). */
export const SPREAD_STEP = 15;

/** Px between lobbed rounds of one ammo in a volley, landing side by side across the aim point (024). */
export const LOB_SPACING = 24;

/** What opening the intake's side entrances spends (024). */
export const OPEN_ENTRANCES_COST: Readonly<Record<string, number>> = { 'warden-core': 1 };

/**
 * How close the player's feet box must be to the intake's mouth for E to open it, px. More than a tile, so a
 * piece built in front of the mouth doesn't put it out of reach.
 */
export const INTAKE_REACH = 40;
