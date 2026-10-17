// Asset keys. Render code loads and draws by these keys, never string literals.

/** The sprite atlas built by `npm run art` (assets/build/sprites.png + .json). */
export const ATLAS_KEY = 'sprites';

/** Frame names in the atlas for single-frame sprites, one per sprite grid in assets/sprites. */
export const SPRITES = {
  leyCrystal: 'ley-crystal',
  floor: 'floor-rune',
  wall: 'wall',
  ruinBlock: 'ruin-block',
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
export type PlayerAnim = 'idle-down' | 'idle-up' | 'idle-side' | 'walk-down' | 'walk-up' | 'walk-side' | 'roll';

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
  roll: playerAnim('roll', ROLL_FRAMES, 'roll', false),
};

/** Atlas frame names for an animation. */
export function animFrames(anim: AnimDef): string[] {
  return anim.frames === 1 ? [anim.key] : Array.from({ length: anim.frames }, (_, i) => `${anim.key}/${i}`);
}
