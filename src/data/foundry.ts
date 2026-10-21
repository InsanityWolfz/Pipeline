import { TILE_SIZE } from './config';

// Foundry tuning. Starting values from specs 006, 019 and 024; tune in playtest.

/** Ticks an item takes to cross one conduit tile. */
export const CONDUIT_TICKS = 15;

/** Most of each input a machine buffers. */
export const INPUT_CAP = 4;

/** Most finished items a machine holds; it won't start a craft whose output wouldn't fit. 046: 8, one doubled arrow craft (the largest). */
export const OUTPUT_CAP = 8;

/** Ticks between a hopper's pushes. */
export const HOPPER_TICKS = 15;

/** 050 (A.12): a crate's slots, each holding one stack (047's stack sizes); its screen shows them in a row. */
export const CRATE_SLOTS = 8;

/** Most items a hopper takes from a line (028); hand-filling is uncapped. */
export const HOPPER_FLOW_CAP = 99;

/** How close the player's feet box must be to a hopper or crate to use it, px. */
export const USE_REACH = 12;

/**
 * 050 (Shaun: "within 3 tiles of a hopper and your mouse is on it"): E opens the hopper or crate under the cursor while
 * the player's feet box is this close to it, px, and its screen works (and stays open) that far.
 */
export const HOVER_USE_REACH = 3 * TILE_SIZE;

/**
 * The foundry intake (019): the waterslide pipe built into the centre of the north wall. Its mouth is three wall
 * tiles, each an entrance (024) with its own reservoir, fed from the floor tile directly south of it. Only the centre
 * starts open; the sides are capped until each is restored (033: a boss core apiece). `lane`: its place in a volley's
 * fan, west to east (048). `gaugeRings`: how many rings of each entrance's
 * gauge light as it fills; a ring of light runs up the pipe for `pulseMs` after each item.
 */
export const INTAKE = {
  entrances: [
    { tx: 11, ty: 0, startsOpen: false, lane: 0 },
    { tx: 12, ty: 0, startsOpen: true, lane: 1 },
    { tx: 13, ty: 0, startsOpen: false, lane: 2 },
  ],
  gaugeRings: 10,
  pulseMs: 450,
  /** While attuning, the camera looks at this point on the pipe: px above the middle of its mouth. */
  lookRise: 36,
} as const;

/** Rounds each entrance holds, by reservoir tier (024, 033): 30 at the start, then each restored reservoir node's tier. */
export const ENTRANCE_CAPS: readonly number[] = [30, 45, 60];

/**
 * Degrees between a volley's lanes (024, 048): the fed entrances, in `lane` order west to east, fan evenly about the
 * aim, whatever their ammo; a bomb lands at the cursor's distance on its lane.
 */
export const SPREAD_STEP = 15;

/**
 * How close the player's feet box must be to the intake's mouth for its prompt to show at full strength, px. More
 * than a tile, so a piece built in front of the mouth doesn't put it out of reach.
 */
export const INTAKE_REACH = 40;
