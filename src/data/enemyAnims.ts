import type { AnimDef } from './assets';

// Enemy animation sets (016): every enemy's poses in three views (side faces right; left is
// drawn flipped) and one death, as AnimDefs whose frames the rigs bake at boot.

const WALK_FRAMES = 4;

/**
 * Poses only some enemies have (034: the Bulwark's turn, lob, throw and shield block; 035: the Charger's stun, the
 * Burrower's dig, the Sniper's step out of cover), besides `recover`.
 */
export type ExtraPose = 'turn' | 'lob' | 'throw' | 'block' | 'stun' | 'dig' | 'step';

/** Enemy animations. `side` faces right; left is drawn flipped. Death has one view. `recover` is optional: without it, a recovering enemy shows idle. */
export type EnemyAnim = `${'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' | ExtraPose}-${'down' | 'up' | 'side'}` | 'death';

/** An enemy's animations: every pose but `recover` and the extras is required. */
export type EnemyAnims = Readonly<Record<Exclude<EnemyAnim, `${'recover' | ExtraPose}-${string}`>, AnimDef>> &
  Readonly<Partial<Record<`${'recover' | ExtraPose}-${'down' | 'up' | 'side'}`, AnimDef>>>;

const ENEMY_WALK_FPS = 6;
const SWIPE_FPS = 20;
const DEATH_FPS = 8;

/** Looping poses of more than one frame: the Bulwark's shuffle, a Charger's daze, a Burrower digging, a Sniper's sidestep. */
const MULTI_FRAME_EXTRAS: Readonly<Partial<Record<ExtraPose, number>>> = { turn: 2, stun: 2, dig: 2, step: 2 };

/** `windupFrames` > 1 makes the wind-up loop at walk pace (035: a Charger pawing the ground). */
export function enemyAnims(prefix: string, recover = false, extras: readonly ExtraPose[] = [], windupFrames = 1): EnemyAnims {
  const anim = (name: EnemyAnim, frames: number, frameRate: number, loop: boolean): AnimDef => ({
    key: `${prefix}-${name}`,
    frames,
    frameRate,
    loop,
  });
  const views = ['down', 'up', 'side'] as const;
  const out: Partial<Record<EnemyAnim, AnimDef>> = { death: anim('death', 4, DEATH_FPS, false) };
  for (const v of views) {
    out[`idle-${v}`] = anim(`idle-${v}`, 1, 1, true);
    out[`walk-${v}`] = anim(`walk-${v}`, WALK_FRAMES, ENEMY_WALK_FPS, true);
    out[`windup-${v}`] = anim(`windup-${v}`, windupFrames, windupFrames > 1 ? ENEMY_WALK_FPS : 1, true);
    out[`swipe-${v}`] = anim(`swipe-${v}`, 2, SWIPE_FPS, false);
    out[`hit-${v}`] = anim(`hit-${v}`, 1, 1, true);
    if (recover) out[`recover-${v}`] = anim(`recover-${v}`, 1, 1, true);
    for (const x of extras) {
      const n = MULTI_FRAME_EXTRAS[x] ?? 1;
      out[`${x}-${v}`] = anim(`${x}-${v}`, n, n > 1 ? ENEMY_WALK_FPS : 1, true);
    }
  }
  return out as EnemyAnims;
}
