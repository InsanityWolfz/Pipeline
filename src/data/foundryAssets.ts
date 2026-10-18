import type { AnimDef } from './assets';

// Asset keys for the foundry (006): piece housings, logistics icons, conduits, hoppers,
// crates, status markers and the doorway. Kept apart from assets.ts so that file
// stays small; like it, this has no runtime imports.

export type PieceView = 'down' | 'up' | 'side';

const WORK_FPS = 4;
const FLOW_FPS = 4;

const loop = (key: string, frames: number, frameRate: number): AnimDef => ({ key, frames, frameRate, loop: true });

/** Machine housings by footprint and view (`side` faces right; left is flipped): an idle frame and a working loop. */
export const MACHINE_HOUSINGS: Readonly<Record<'1x1' | '3x1', Record<PieceView, { idle: string; working: AnimDef }>>> =
  {
    '1x1': {
      down: { idle: 'machine-1x1-down', working: loop('machine-1x1-down-working', 2, WORK_FPS) },
      up: { idle: 'machine-1x1-up', working: loop('machine-1x1-up-working', 2, WORK_FPS) },
      side: { idle: 'machine-1x1-side', working: loop('machine-1x1-side-working', 2, WORK_FPS) },
    },
    '3x1': {
      down: { idle: 'machine-3x1-down', working: loop('machine-3x1-down-working', 2, WORK_FPS) },
      up: { idle: 'machine-3x1-up', working: loop('machine-3x1-up-working', 2, WORK_FPS) },
      side: { idle: 'machine-3x1-side', working: loop('machine-3x1-side-working', 2, WORK_FPS) },
    },
  };

/**
 * Where the icon on a housing's top face is centred above the sprite's bottom (the footprint's
 * bottom edge), px: the middle of its top face. The 3x1 side view has a taller top face.
 */
export const ICON_RISE: Readonly<Record<'1x1' | '3x1', Record<PieceView, number>>> = {
  '1x1': { down: 31, up: 31, side: 31 },
  '3x1': { down: 31, up: 31, side: 63 },
};

/**
 * Build bar icons for the logistics pieces. A machine has no emblem of its own:
 * the icon of the item it makes is drawn on its top face and on the bar.
 */
export const LOGISTICS_ICONS: Readonly<Record<string, string>> = {
  conduit: 'emblem-conduit',
  hopper: 'emblem-hopper',
  crate: 'emblem-crate',
  'tube-socket': 'emblem-tube-socket',
  'gravity-stager': 'emblem-gravity-stager',
};

/** Conduits flow toward their front; `side` flows right. They lie flat on the floor. */
export const CONDUIT_ANIMS: Readonly<Record<PieceView, AnimDef>> = {
  down: loop('conduit-down', 2, FLOW_FPS),
  up: loop('conduit-up', 2, FLOW_FPS),
  side: loop('conduit-side', 2, FLOW_FPS),
};

export const HOPPER_SPRITES: Readonly<Record<PieceView, string>> = {
  down: 'hopper-down',
  up: 'hopper-up',
  side: 'hopper-side',
};

export const CRATE_SPRITE = 'crate';

/** The tube socket (007): at rest, and the frame it flares to as a round goes to the tube. */
export const SOCKET_SPRITES = { idle: 'tube-socket', refill: 'tube-socket-refill' } as const;

/** The gravity stager (008): one frame per angle, `gravity-stager/<i>` for STAGER_ANGLES[i]. */
export const STAGER_SPRITE = { key: 'gravity-stager', frames: 5, frameRate: 1, loop: false } as const satisfies AnimDef;

/**
 * Build mode draws a faint fan from the tube socket: one line per stream at its
 * angle from straight up, so the spread's shape reads before firing. Px and palette id.
 */
export const SPREAD_FAN = { length: 56, width: 1, color: 'ley-cyan', alpha: 0.55 } as const;

/** A stager holding an item pulses its alpha between 1 and this. */
export const STAGER_PULSE_ALPHA = 0.7;

/** The hover readout's icon for a socket whose reservoir is empty: the socket's own emblem. */
export const SOCKET_EMPTY_ICON = 'emblem-tube-socket';

/**
 * Build-mode arrows on a piece's edges, also on the ghost: cyan pointing out of its
 * output side, gold pointing in on each side that takes items. `side` points right.
 */
export const FACING_ARROWS: Readonly<Record<'in' | 'out', Record<PieceView, string>>> = {
  out: { down: 'facing-arrow-down', up: 'facing-arrow-up', side: 'facing-arrow-side' },
  in: { down: 'input-arrow-down', up: 'input-arrow-up', side: 'input-arrow-side' },
};

/** A door in a side wall, drawn as is on the right wall and flipped on the left. */
export const DOORWAY_SPRITE = 'doorway-side';

/** Machine status markers over a machine. A starved machine shows the missing item's icon on the bubble. */
export const STATUS_MARKERS = {
  working: loop('status-cog', 2, WORK_FPS),
  blocked: 'status-stop',
  starved: 'status-bubble',
} as const;

/** Foundry render layout, px. */
export const FOUNDRY_LAYOUT = {
  /** Gap between the top of a machine's sprite and the bottom of its status marker. */
  markerGap: 2,
  /** A conduit item icon sits this far above its ground point, so it reads as riding the channel. */
  itemLift: 3,
  /** A hopper's or crate's item icon and count sit this far above its sprite's bottom. */
  contentsRise: 30,
  /** Where the count starts, from the sprite's centre x and the icon's centre y. */
  countX: 9,
  countY: -3,
  /** Conduits lie on the floor; items riding them draw just above. */
  conduitDepth: 0.2,
  /** An arrow's centre sits this far past its tile's edge, px (negative: just inside it). */
  arrowOffset: -5,
  /** Depth nudge that puts an icon or count just in front of the piece it's drawn on. */
  onTopNudge: 0.01,
  itemDepth: 0.3,
} as const;
