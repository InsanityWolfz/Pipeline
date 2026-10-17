// Asset keys. Render code loads and draws by these keys, never string literals.

/** The sprite atlas built by `npm run art` (assets/build/sprites.png + .json). */
export const ATLAS_KEY = 'sprites';

/** Frame names in the atlas for single-frame sprites, one per sprite grid in assets/sprites. */
export const SPRITES = {
  leyCrystal: 'ley-crystal',
  floor: 'floor-rune',
  wall: 'wall',
  ruinBlock: 'ruin-block',
  arrow: 'arrow',
  arrowShadow: 'arrow-shadow',
  crosshair: 'crosshair',
  hudSlot: 'hud-slot',
  iconArrow: 'icon-arrow',
} as const;

/** The tube held by the player, by direction. `side` points right; left is drawn flipped. */
export const TUBE_SPRITES = {
  down: 'tube-down',
  up: 'tube-up',
  side: 'tube-side',
} as const;

/**
 * Where the tube's top-left corner sits relative to the player's feet (the bottom
 * centre of the player sprite), px, for the right-facing side; left mirrors it.
 * `behind` draws it under the player.
 */
export const TUBE_GRIP: Readonly<Record<keyof typeof TUBE_SPRITES, { x: number; y: number; behind: boolean }>> = {
  down: { x: -5, y: -24, behind: false },
  up: { x: 3, y: -37, behind: true },
  side: { x: 2, y: -22, behind: true },
};

/** The HUD number font: frames `hud-digits/0`..`/9`, then `/` as frame 10. */
export const HUD_DIGITS = { key: 'hud-digits', glyphs: '0123456789/', advance: 4 } as const;

/** Atlas frame for one HUD font character. */
export function digitFrame(ch: string): string {
  const index = HUD_DIGITS.glyphs.indexOf(ch);
  if (index < 0) throw new Error(`No HUD glyph for '${ch}'`);
  return `${HUD_DIGITS.key}/${index}`;
}

/** Hotbar slot layout, px from the slot's top-left. */
export const HUD_SLOT_LAYOUT = {
  icon: { x: 4, y: 4 },
  loaded: { x: 25, y: 5 },
  carried: { x: 25, y: 13 },
  /** The load progress bar inside the well, along its bottom edge. */
  loadBar: { x: 4, y: 18, w: 36, h: 2 },
  /** Gap below the slot to the bottom of the screen. */
  margin: 6,
} as const;

/** An animation: the sprite grid `key` with `frames` frames (`key/0`..), or a single frame `key`. */
export interface AnimDef {
  key: string;
  frames: number;
  /**
   * Frames per second, or 'roll' to stretch the frames over exactly one roll.
   * The roll rate is computed in src/render/PlayerView.ts, since this file can't
   * import tuning (the art build loads it on its own).
   */
  frameRate: number | 'roll';
  loop: boolean;
}

/** Player animations. `side` faces right; left is drawn flipped. */
export type PlayerAnim =
  | 'idle-down'
  | 'idle-up'
  | 'idle-side'
  | 'walk-down'
  | 'walk-up'
  | 'walk-side'
  | 'fire-down'
  | 'fire-up'
  | 'fire-side'
  | 'roll';

const WALK_FPS = 8;
const WALK_FRAMES = 4;
const ROLL_FRAMES = 4;

const playerAnim = (name: PlayerAnim, frames: number, frameRate: AnimDef['frameRate'], loop: boolean): AnimDef => ({
  key: `player-${name}`,
  frames,
  frameRate,
  loop,
});

export const PLAYER_ANIMS: Readonly<Record<PlayerAnim, AnimDef>> = {
  'idle-down': playerAnim('idle-down', 1, 1, true),
  'idle-up': playerAnim('idle-up', 1, 1, true),
  'idle-side': playerAnim('idle-side', 1, 1, true),
  'walk-down': playerAnim('walk-down', WALK_FRAMES, WALK_FPS, true),
  'walk-up': playerAnim('walk-up', WALK_FRAMES, WALK_FPS, true),
  'walk-side': playerAnim('walk-side', WALK_FRAMES, WALK_FPS, true),
  'fire-down': playerAnim('fire-down', 1, 1, true),
  'fire-up': playerAnim('fire-up', 1, 1, true),
  'fire-side': playerAnim('fire-side', 1, 1, true),
  roll: playerAnim('roll', ROLL_FRAMES, 'roll', false),
};

/** Atlas frame names for an animation. */
export function animFrames(anim: AnimDef): string[] {
  return anim.frames === 1 ? [anim.key] : Array.from({ length: anim.frames }, (_, i) => `${anim.key}/${i}`);
}
