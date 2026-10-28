import { animFrames, type AnimDef, type EnemyAnims } from '../data/assets';
import { familyOf, type FamilyId } from '../data/art/enemyFamilies';
import { ENEMY_MOTION } from '../data/art/enemyMotion';
import { IDLE_SPEED } from '../data/config';
import type { EnemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import { bulwarkPose, conductorPose, forgePose } from './bossPoses';
import { attacking, flinchSquash, reactionOf, staggerIndex, staggerSquash, type Reaction } from './enemyReaction';
import { releaseSquash, RELEASE_MODES, stripIndex, tremble, windupOf, windupPhase, type WindupPhase } from './enemyMotion';
import { STRIP_ENDS } from '../data/enemyAnims';
import { introBeat, introFrame, introSquash } from './bossIntro';
import { BOSS_PHASE_LOOK } from '../data/art/bossPhases';
import { grounded } from '../sim/conductorRods';

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

// Review 8: what a frame would otherwise build per enemy (anim keys, frame-name lists, `enemyId:pose` keys, the
// reaction's input) is looked up once and kept, as 075's wanderer does.

/** Each anim set's anims by view and pose (null: the set lacks it). */
const animCache = new WeakMap<EnemyAnims, Record<View, Map<string, AnimDef | null>>>();
/** Each anim's frame names. */
const frameCache = new WeakMap<AnimDef, readonly string[]>();
/** Per enemy kind: its family, its peak overrides by pose, and the release modes that don't stretch. */
const kindCache = new Map<string, { family: FamilyId; peakAt: Map<string, number>; still: Set<string> }>();
/** The reaction's input, filled per call. */
const reactionIn = { attacking: false, reactable: false, boss: false, flash: 0, staggerMs: null as number | null };

/** The set's anim for a pose in a view, or null if it has none. */
function ownAnim(anims: EnemyAnims, view: View, pose: string): AnimDef | null {
  let byView = animCache.get(anims);
  if (!byView) {
    byView = { down: new Map(), up: new Map(), side: new Map() };
    animCache.set(anims, byView);
  }
  const m = byView[view];
  let a = m.get(pose);
  if (a === undefined) {
    a = anims[`${pose}-${view}` as keyof EnemyAnims] ?? null;
    m.set(pose, a);
  }
  return a;
}

/** The anim for a pose, `idle` standing in for one the set lacks. */
const animOf = (anims: EnemyAnims, view: View, pose: string): AnimDef => ownAnim(anims, view, pose) ?? ownAnim(anims, view, 'idle') ?? anims['idle-side'];

function framesOf(a: AnimDef): readonly string[] {
  let f = frameCache.get(a);
  if (!f) {
    f = animFrames(a);
    frameCache.set(a, f);
  }
  return f;
}

/** An anim's frame `i` (its last, past the end). */
function frameAt(a: AnimDef, i: number): string | null {
  return framesOf(a)[Math.min(i, a.frames - 1)] ?? null;
}

function kindOf(def: EnemyDef): { family: FamilyId; peakAt: Map<string, number>; still: Set<string> } {
  let k = kindCache.get(def.id);
  if (!k) {
    const peakAt = new Map<string, number>();
    for (const [key, v] of Object.entries(ENEMY_MOTION.peakAt)) if (key.startsWith(`${def.id}:`)) peakAt.set(key.slice(def.id.length + 1), v);
    const still = new Set(ENEMY_MOTION.release.none.filter((key) => key.startsWith(`${def.id}:`)).map((key) => key.slice(def.id.length + 1)));
    k = { family: familyOf(def.id).id, peakAt, still };
    kindCache.set(def.id, k);
  }
  return k;
}

/** A blank art, for a caller to keep and pass back each frame. */
export const blankArt = (anim: AnimDef): EnemyArtShown => ({ pose: 'idle', phase: null, reaction: null, squash: 0, anim, frame: null, dx: 0, dy: 0, family: 'ruin' });

function fill(out: EnemyArtShown, pose: string, phase: WindupPhase | null, reaction: Reaction | null, squash: number, anim: AnimDef, frame: string | null, dx: number, dy: number, family: FamilyId): EnemyArtShown {
  out.pose = pose;
  out.phase = phase;
  out.reaction = reaction;
  out.squash = squash;
  out.anim = anim;
  out.frame = frame;
  out.dx = dx;
  out.dy = dy;
  out.family = family;
  return out;
}

/**
 * The art for this frame, written into `out` (a caller's own, kept from frame to frame; a new one without it).
 * `staggerMs` is ms since its stagger started (null for none); `now` is scene ms, which the coil's loop and the tremble
 * run on. 080: `introShort` says a boss in its intro plays the short one (the sim's `introShort`).
 */
export function enemyArt(e: EnemyState, def: EnemyDef, anims: EnemyAnims, view: View, turned: boolean, staggerMs: number | null, now: number, out?: EnemyArtShown, introShort = false): EnemyArtShown {
  const kind = kindOf(def);
  const family = kind.family;
  const o = out ?? blankArt(animOf(anims, view, 'idle'));
  // 080: a boss asleep at its post shows its dormant pose; in its intro, the beat's pose by intro ticks.
  if (def.boss && e.mode === 'idle') {
    const a = ownAnim(anims, view, 'dormant');
    if (a) return fill(o, 'dormant', null, null, 0, a, frameAt(a, 0), 0, 0, family);
  }
  if (def.boss && e.mode === 'intro') {
    const b = introBeat(e.modeTicks, introShort);
    const a = ownAnim(anims, view, b.beat);
    if (a) return fill(o, b.beat, null, null, introSquash(b.beat, b.at, b.length, introShort), a, frameAt(a, introFrame(b.beat, b.at, b.length, introShort)), 0, 0, family);
  }
  const base = basePose(e, def, turned);
  reactionIn.attacking = attacking(e.mode);
  reactionIn.reactable = REACTABLE.includes(base);
  reactionIn.boss = def.boss;
  reactionIn.flash = e.flash;
  reactionIn.staggerMs = staggerMs;
  const reaction = reactionOf(reactionIn);
  if (reaction === 'stagger' && staggerMs !== null) {
    const a = animOf(anims, view, 'stagger');
    return fill(o, 'stagger', null, reaction, staggerSquash(staggerMs), a, frameAt(a, staggerIndex(staggerMs)), 0, 0, family);
  }
  if (reaction === 'flinch') return fill(o, 'hit', null, reaction, flinchSquash(def.hitFlashTicks - e.flash), animOf(anims, view, 'hit'), null, 0, 0, family);
  const strip = windupOf(e);
  const stripAnim = strip && ownAnim(anims, view, strip.pose);
  if (strip && stripAnim) {
    const phase = windupPhase(e.modeTicks, strip.ticks, kind.peakAt.get(strip.pose));
    const t = tremble(phase, now, def.boss);
    return fill(o, strip.pose, phase, null, 0, stripAnim, frameAt(stripAnim, stripIndex(phase, stripAnim.frames - STRIP_ENDS, now)), t.dx, t.dy, family);
  }
  const squash = RELEASE_MODES.includes(e.mode) && !kind.still.has(e.mode) ? releaseSquash(e.modeTicks) : 0;
  // 080: the Bulwark's roar, three frames by its progress (rear back, roar, settle into the hunch).
  if (base === 'roar' && def.kind === 'bulwark') {
    const a = animOf(anims, view, 'roar');
    return fill(o, 'roar', null, null, 0, a, frameAt(a, Math.floor((e.modeTicks / def.enrage.roarTicks) * a.frames)), 0, 0, family);
  }
  // The Conductor's storm call and rod chain release from their peak (064: one pose for both).
  if ((base === 'call' || base === 'chain') && e.mode === 'swipe') {
    const a = animOf(anims, view, base);
    return fill(o, base, null, null, squash, a, frameAt(a, 99), 0, 0, family);
  }
  // 080: the enraged Bulwark's lower, forward hunch on idle, walk and turn; the grounded Conductor's lowered stance.
  const P = BOSS_PHASE_LOOK;
  if (def.kind === 'bulwark' && e.enraged && HUNCHED.includes(base)) {
    const H = P.bulwark.enraged.hunch;
    const dir = e.facing === 'left' ? -1 : e.facing === 'right' ? 1 : 0;
    return fill(o, base, null, null, squash + H.squash, animOf(anims, view, base), null, H.shift * dir, H.sink, family);
  }
  const sink = def.kind === 'conductor' && grounded(e) ? P.conductor.grounded.sink : 0;
  return fill(o, base, null, null, squash, animOf(anims, view, base), null, 0, sink, family);
}

/** 080: poses the enraged Bulwark hunches over. */
const HUNCHED: readonly string[] = ['idle', 'walk', 'turn'];
