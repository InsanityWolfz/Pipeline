// Engine tuning values. Systems read these; never hardcode them elsewhere.

/** Sim ticks per second. */
export const TICK_RATE = 60;

/** Most ticks run in one render frame, so a long stall can't freeze the game catching up. */
export const MAX_TICKS_PER_FRAME = 10;

/** Seed used when the URL has no ?seed= parameter. */
export const DEFAULT_SEED = 20261017;

/** Internal render resolution, scaled up in whole-pixel steps. */
export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 360;

/** World tile size in pixels. */
export const TILE_SIZE = 32;
