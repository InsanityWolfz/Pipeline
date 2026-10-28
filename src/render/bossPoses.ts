import { IDLE_SPEED } from '../data/config';
import type { EnemyState } from '../sim/enemies';

// The bosses' poses for their modes (041, 060, 064), pure so enemyArt.ts (and its tests) need no Phaser. Moved out of
// bulwarkLook.ts, forgewrightLook.ts and conductorLook.ts in 076.

export type BulwarkPose = 'idle' | 'walk' | 'turn' | 'lob' | 'throw' | 'windup' | 'swipe' | 'recover' | 'hit' | 'block' | 'roar' | 'brace' | 'stomp';

/** The pose for its mode (041: the roar, and the stomp's brace, stamp and recovery); `turned` says its shield turned since the last frame. */
export function bulwarkPose(e: EnemyState, turned: boolean): BulwarkPose {
  if (e.mode === 'lob' || e.mode === 'throw' || e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover' || e.mode === 'roar' || e.mode === 'stomp') return e.mode;
  if (e.mode === 'stomp-windup') return 'brace';
  if (e.mode === 'stomp-recover') return 'recover';
  if (e.blockFlash > 0) return 'block';
  if (e.flash > 0) return 'hit';
  if (Math.hypot(e.vx, e.vy) >= IDLE_SPEED) return 'walk';
  return turned ? 'turn' : 'idle';
}

export type ForgePose = 'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' | 'block' | 'spray' | 'flood' | 'vent';

/** Its pose for its mode. */
export function forgePose(e: EnemyState): ForgePose {
  if (e.mode === 'vent') return 'vent';
  if (e.mode === 'flood-windup') return 'flood';
  if (e.mode === 'spray-windup') return 'spray';
  // The flood's blow and the spray's fling both bring the hammer down.
  if (e.mode === 'flood' || e.mode === 'spray') return 'swipe';
  if (e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover') return e.mode;
  if (e.blockFlash > 0) return 'block';
  if (e.flash > 0) return 'hit';
  return Math.hypot(e.vx, e.vy) >= IDLE_SPEED ? 'walk' : 'idle';
}

export type ConductorPose = 'idle' | 'windup' | 'swipe' | 'recover' | 'hit' | 'blink' | 'call' | 'chain';

/** Its pose for its attack and mode. */
export function conductorPose(e: EnemyState): ConductorPose {
  if (e.conductor.blinkTo >= 0) return 'blink';
  if (e.conductor.attack >= 0 && e.mode === 'recover') return 'recover';
  if (e.conductor.attack === 0 && (e.mode === 'windup' || e.mode === 'swipe')) return e.mode;
  if (e.conductor.attack === 1 && (e.mode === 'windup' || e.mode === 'swipe')) return 'call';
  if (e.conductor.attack === 2 && (e.mode === 'windup' || e.mode === 'swipe')) return 'chain';
  return e.flash > 0 ? 'hit' : 'idle';
}
