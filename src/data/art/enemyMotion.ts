import { SNIPER } from '../hollowsEnemies';
import type { EnemyPoseName } from './enemyRig';

// 076: how enemies move on screen, as tuning. Visual only: render reads the sim's mode, modeTicks and flash and fits
// these inside them, so no tick of the sim changes. src/render/enemyMotion.ts turns them into poses.

/** Poses that are wind-up strips: gather, coil (1 or 2 frames), peak, picked by the wind-up's progress. */
export const WINDUP_STRIPS: readonly EnemyPoseName[] = ['windup', 'lob', 'brace', 'spray', 'flood', 'call', 'chain'];

export const ENEMY_MOTION = {
  /**
   * A wind-up's phases by its progress (modeTicks / windupTicks): gather below `gather`, peak from `peak` (and always
   * the last `minPeakTicks` at least), coil between. `coilFps`: a two-frame coil alternates at walk pace.
   */
  phases: { gather: 0.2, peak: 0.85, minPeakTicks: 5, coilFps: 6 },
  /** Per-attack overrides of the peak's start, by `enemyId:pose`: the Sniper's peak is its lock. */
  peakAt: { 'sniper:windup': SNIPER.snipe.trackTicks / SNIPER.snipe.windupTicks } as Readonly<Record<string, number>>,
  /** The peak's tremble: the sprite's own (never the camera), world px either way, at `hz`; bosses `bossPx`. */
  tremble: { px: 0.8, bossPx: 1.2, hz: 20 },
  /**
   * An attack's first frames (the swipe and its kin): a stretch that settles over `ticks`. Not for the releases in
   * `none` (by `enemyId:mode`): slams, stomps and the static mite's discharge, whose impact frame is baked squashed
   * and must land that way.
   */
  release: {
    squash: -0.12,
    ticks: 4,
    none: ['pylon-warden:swipe', 'slag-golem:swipe', 'bulwark:swipe', 'bulwark:stomp', 'forgewright:swipe', 'forgewright:spray', 'forgewright:flood', 'static-mite:swipe'] as readonly string[],
  },
  /** The flinch while the sim's flash runs: a snap of `squash`, ringing down over `ringTicks` with an overshoot. */
  flinch: { squash: 0.1, ringTicks: 3 },
  /**
   * The stagger: two frames, reel then recover, over `ms` (18 render ticks), the reel for the first `reelMs`, a
   * squash of `squash` easing out. One frame's hits of at least `threshold` of its max health, or a punch, on a
   * non-boss.
   */
  stagger: { ms: 300, reelMs: 150, squash: 0.12, threshold: 0.4 },
  /**
   * Deaths: the struck pose for `struckMs` (bosses `bossStruckMs`), then the dissolve over `fadeMs` (`bossFadeMs`):
   * narrowing to `narrow`, stretching to `stretch`, fading out; an additive copy in the family's first mote colour
   * rising to `tintAlpha` (`dimTintAlpha` with Flashes off) by `tintPeak` of the dissolve and fading with it; the
   * motes in `waves` waves.
   */
  dissolve: { struckMs: 100, bossStruckMs: 200, fadeMs: 500, bossFadeMs: 1200, narrow: 0.8, stretch: 1.1, tintAlpha: 0.5, dimTintAlpha: 0.25, tintPeak: 0.3, waves: 3 },
} as const;
