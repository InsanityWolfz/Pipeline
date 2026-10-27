import type { AnimDef } from './assets';

// Enemy animation sets (016): every enemy's poses in three views (side faces right; left is
// drawn flipped) and one death, as AnimDefs whose frames the rigs bake at boot.

const WALK_FRAMES = 4;

/**
 * Poses only some enemies have (034: the Bulwark's turn, lob, throw and shield block; 035: the Charger's stun, the
 * Burrower's dig, the Sniper's step out of cover; 041: the Bulwark's roar, and its stomp's brace and stamp; 060: the
 * Forgewright's spray, flood and vent stagger; 064: the Conductor's blink, call and chain), besides
 * `recover`.
 */
export type ExtraPose = 'turn' | 'lob' | 'throw' | 'block' | 'stun' | 'dig' | 'step' | 'roar' | 'brace' | 'stomp' | 'spray' | 'flood' | 'vent' | 'blink' | 'call' | 'chain';

/**
 * Enemy animations. `side` faces right; left is drawn flipped. `recover` is optional: without it, a recovering enemy
 * shows idle. 076: `stagger` (not for bosses), and the struck `death` frame in every view.
 */
export type EnemyAnim = `${'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' | 'stagger' | 'death' | ExtraPose}-${'down' | 'up' | 'side'}`;

/** An enemy's animations: every pose but `recover`, `stagger` and the extras is required. */
export type EnemyAnims = Readonly<Record<Exclude<EnemyAnim, `${'recover' | 'stagger' | ExtraPose}-${string}`>, AnimDef>> &
  Readonly<Partial<Record<`${'recover' | 'stagger' | ExtraPose}-${'down' | 'up' | 'side'}`, AnimDef>>>;

const ENEMY_WALK_FPS = 6;
const SWIPE_FPS = 20;

/** 076: a wind-up strip's frames besides its coil: gather and peak. */
export const STRIP_ENDS = 2;
/** 076: the stagger's frames, reel and recover. */
export const STAGGER_FRAMES = 2;

/**
 * Looping poses of more than one frame: the Bulwark's shuffle, a Charger's daze, a Burrower digging, a Sniper's
 * sidestep, the Forgewright's vent stagger (060), the Conductor's blink flicker (064). 076: the bosses' attack strips
 * (gather, coil, peak), which render shows by the wind-up's progress rather than playing.
 */
const MULTI_FRAME_EXTRAS: Readonly<Partial<Record<ExtraPose, number>>> = { turn: 2, stun: 2, dig: 2, step: 2, roar: 2, vent: 2, blink: 2, lob: 3, brace: 3, spray: 3, flood: 3, call: 3, chain: 3 };

/**
 * `windupFrames` is the wind-up's coil: 2 alternates at walk pace (035: a Charger pawing the ground). 076: the wind-up
 * is a strip of gather, the coil and peak, which render picks by progress; a boss (`boss`) has no stagger.
 */
export function enemyAnims(prefix: string, recover = false, extras: readonly ExtraPose[] = [], windupFrames = 1, boss = false): EnemyAnims {
  const anim = (name: EnemyAnim, frames: number, frameRate: number, loop: boolean): AnimDef => ({
    key: `${prefix}-${name}`,
    frames,
    frameRate,
    loop,
  });
  const views = ['down', 'up', 'side'] as const;
  const out: Partial<Record<EnemyAnim, AnimDef>> = {};
  for (const v of views) {
    out[`idle-${v}`] = anim(`idle-${v}`, 1, 1, true);
    out[`walk-${v}`] = anim(`walk-${v}`, WALK_FRAMES, ENEMY_WALK_FPS, true);
    out[`windup-${v}`] = anim(`windup-${v}`, windupFrames + STRIP_ENDS, ENEMY_WALK_FPS, false);
    out[`swipe-${v}`] = anim(`swipe-${v}`, 2, SWIPE_FPS, false);
    out[`hit-${v}`] = anim(`hit-${v}`, 1, 1, true);
    if (!boss) out[`stagger-${v}`] = anim(`stagger-${v}`, STAGGER_FRAMES, ENEMY_WALK_FPS, false);
    out[`death-${v}`] = anim(`death-${v}`, 1, 1, false);
    if (recover) out[`recover-${v}`] = anim(`recover-${v}`, 1, 1, true);
    for (const x of extras) {
      const n = MULTI_FRAME_EXTRAS[x] ?? 1;
      out[`${x}-${v}`] = anim(`${x}-${v}`, n, n > 1 ? ENEMY_WALK_FPS : 1, true);
    }
  }
  return out as EnemyAnims;
}
