import { animFrames, type AnimDef, type EnemyAnims } from '../data/assets';
import { familyOf, type FamilyId } from '../data/art/enemyFamilies';
import { ENEMY_MOTION } from '../data/art/enemyMotion';
import { IDLE_SPEED } from '../data/config';
import type { EnemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import { bulwarkPose } from './bulwarkLook';
import { conductorPose } from './conductorLook';
import { attacking, flinchSquash, reactionOf, staggerIndex, staggerSquash, type Reaction } from './enemyReaction';
import { releaseSquash, RELEASE_MODES, stripIndex, tremble, windupOf, windupPhase, type WindupPhase } from './enemyMotion';
import { forgePose } from './forgewrightLook';
import { STRIP_ENDS } from '../data/enemyAnims';

// 076: what an enemy's sprite shows this frame, from its state, its def and render's clocks: the anim to play, or a
// strip or stagger frame to hold (a wind-up's gather, coil and peak by its progress), the squash about its feet (the
// release snap, the flinch, the stagger), the peak's tremble, and what `ui().enemyArt` reports. Pure but for the
// clock passed in.

export type View = 'down' | 'up' | 'side';

/** What it shows, for EnemyView and the test hook. */
export interface EnemyArtShown {
  /** The pose name (`windup`, `stagger`, `hit`, `walk`…). */
  pose: string;
  phase: WindupPhase | null;
  reaction: Reaction | null;
  squash: number;
  /** Play this anim, or hold this frame. */
  anim: AnimDef;
  frame: string | null;
  /** The tremble, world px. */
  dx: number;
  dy: number;
  family: FamilyId;
}

/** Its pose before any reaction: its mode's, the shuffle (`turned`) for a shielded enemy. */
function basePose(e: EnemyState, def: EnemyDef, turned: boolean): string {
  const moving = Math.hypot(e.vx, e.vy) >= IDLE_SPEED;
  const pose = def.shield ? bulwarkPose(e, turned) : def.kind === 'forgewright' ? forgePose(e) : def.kind === 'conductor' ? conductorPose(e) : modePose(e, moving);
  // The bosses' pose functions show `hit` over idle and walking: the reaction takes that over now.
  return pose === 'hit' ? (moving ? 'walk' : 'idle') : pose;
}

/** An enemy's pose for its mode (016, 035): a Charger dazed, a Burrower digging, a Sniper stepping out of cover. */
function modePose(e: EnemyState, moving: boolean): string {
  if (e.mode === 'stun' || e.mode === 'dig') return e.mode;
  if (e.mode === 'peek') return 'step';
  if (e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover') return e.mode;
  return moving ? 'walk' : 'idle';
}

/** Poses a hit reaction shows over. */
const REACTABLE: readonly string[] = ['idle', 'walk', 'recover', 'turn'];

/**
 * The art for this frame. `staggerMs` is ms since its stagger started (null for none); `now` is scene ms, which the
 * coil's loop and the tremble run on.
 */
export function enemyArt(e: EnemyState, def: EnemyDef, anims: EnemyAnims, view: View, turned: boolean, staggerMs: number | null, now: number): EnemyArtShown {
  const family = familyOf(def.id).id;
  const anim = (pose: string): AnimDef => anims[`${pose}-${view}` as keyof EnemyAnims] ?? anims[`idle-${view}`];
  const hold = (pose: string, i: number) => {
    const a = anim(pose);
    return { anim: a, frame: animFrames(a)[Math.min(i, a.frames - 1)] ?? null };
  };
  const base = basePose(e, def, turned);
  const reaction = reactionOf({ attacking: attacking(e.mode), reactable: REACTABLE.includes(base), boss: def.boss, flash: e.flash, staggerMs });
  if (reaction === 'stagger' && staggerMs !== null) {
    return { pose: 'stagger', phase: null, reaction, squash: staggerSquash(staggerMs), ...hold('stagger', staggerIndex(staggerMs)), dx: 0, dy: 0, family };
  }
  if (reaction === 'flinch') return { pose: 'hit', phase: null, reaction, squash: flinchSquash(def.hitFlashTicks - e.flash), anim: anim('hit'), frame: null, dx: 0, dy: 0, family };
  const strip = windupOf(e);
  const stripAnim = strip && anims[`${strip.pose}-${view}` as keyof EnemyAnims];
  if (strip && stripAnim) {
    const phase = windupPhase(e.modeTicks, strip.ticks, ENEMY_MOTION.peakAt[`${def.id}:${strip.pose}`]);
    const t = tremble(phase, now, def.boss);
    return { pose: strip.pose, phase, reaction: null, squash: 0, ...hold(strip.pose, stripIndex(phase, stripAnim.frames - STRIP_ENDS, now)), dx: t.dx, dy: t.dy, family };
  }
  const squash = RELEASE_MODES.includes(e.mode) ? releaseSquash(e.modeTicks) : 0;
  // The Conductor's storm call and rod chain release from their peak (064: one pose for both).
  if ((base === 'call' || base === 'chain') && e.mode === 'swipe') return { pose: base, phase: null, reaction: null, squash, ...hold(base, 99), dx: 0, dy: 0, family };
  return { pose: base, phase: null, reaction: null, squash, anim: anim(base), frame: null, dx: 0, dy: 0, family };
}
