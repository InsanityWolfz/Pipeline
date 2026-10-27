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

/** Below this speed (px per tick) the player sprite shows idle instead of walking. */
export const IDLE_SPEED = 0.1;

/** Each half of the fade through a doorway, out then in, ms (about 0.3 s in all). */
export const DOOR_FADE_MS = 150;

/** Camera follow easing per frame (0..1, lower is smoother). 1 since 042: locked to the player, no easing pan. */
export const CAMERA_LERP = 1;

/**
 * 069: build mode's world zooms, the wheel stepping between them (1× and zoomed out to 0.75×, so the foundry fits);
 * leaving build mode is the first again.
 */
export const BUILD_ZOOMS = [1, 0.75] as const;
