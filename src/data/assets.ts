// Asset keys. Render code loads and draws by these keys, never string literals.

/** The sprite atlas built by `npm run art` (assets/build/sprites.png + .json). */
export const ATLAS_KEY = 'sprites';

/** Camera views: three-quarter and straight-down. Each has its own sprite set. */
export const VIEWS = ['34', 'top'] as const;
export type ViewMode = (typeof VIEWS)[number];

/** Frame names in the atlas for single-frame sprites, one per sprite grid in assets/sprites. */
export const SPRITES = {
  leyCrystal: 'ley-crystal',
  floor34: 'floor-rune',
  floorTop: 'floor-rune-top',
  wall34: 'wall-34',
  wallTop: 'wall-top',
  ruinBlock34: 'ruin-block-34',
  ruinBlockTop: 'ruin-block-top',
} as const;

/** The room tiles drawn in each view. */
export const VIEW_TILES: Readonly<Record<ViewMode, { floor: string; wall: string; ruinBlock: string }>> = {
  '34': { floor: SPRITES.floor34, wall: SPRITES.wall34, ruinBlock: SPRITES.ruinBlock34 },
  top: { floor: SPRITES.floorTop, wall: SPRITES.wallTop, ruinBlock: SPRITES.ruinBlockTop },
};

/** An animation: the sprite grid `key` with `frames` frames (`key/0`..), or a single frame `key`. */
export interface AnimDef {
  key: string;
  frames: number;
  /** Frames per second, or 'roll' to stretch the frames over exactly one roll. */
  frameRate: number | 'roll';
  loop: boolean;
}

/** Player animations. `side` faces right; left is drawn flipped. */
export type PlayerAnim = 'idle-down' | 'idle-up' | 'idle-side' | 'walk-down' | 'walk-up' | 'walk-side' | 'roll';

const WALK_FPS = 8;
const WALK_FRAMES = 4;
const ROLL_FRAMES = 4;

function playerAnims(view: ViewMode): Record<PlayerAnim, AnimDef> {
  const def = (name: string, frames: number, frameRate: AnimDef['frameRate'], loop: boolean): AnimDef => ({
    key: `player-${view}-${name}`,
    frames,
    frameRate,
    loop,
  });
  return {
    'idle-down': def('idle-down', 1, 1, true),
    'idle-up': def('idle-up', 1, 1, true),
    'idle-side': def('idle-side', 1, 1, true),
    'walk-down': def('walk-down', WALK_FRAMES, WALK_FPS, true),
    'walk-up': def('walk-up', WALK_FRAMES, WALK_FPS, true),
    'walk-side': def('walk-side', WALK_FRAMES, WALK_FPS, true),
    roll: def('roll', ROLL_FRAMES, 'roll', false),
  };
}

export const PLAYER_ANIMS: Readonly<Record<ViewMode, Record<PlayerAnim, AnimDef>>> = {
  '34': playerAnims('34'),
  top: playerAnims('top'),
};

/** Atlas frame names for an animation. */
export function animFrames(anim: AnimDef): string[] {
  return anim.frames === 1 ? [anim.key] : Array.from({ length: anim.frames }, (_, i) => `${anim.key}/${i}`);
}
