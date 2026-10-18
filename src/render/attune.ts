import { ATTUNE_GLOW_SWELL } from '../data/juice';
import { ATTUNE, ATTUNE_TICKS } from '../data/tube';

// The attune's beats (019), read from the ticks it has left: the tube's rings
// light, the camera pans to the intake, the pipe's rings light the same way, and
// the camera pans back. Render reads these; the sim only counts the ticks down.

export interface AttuneBeat {
  /** The tube's rings lighting, 0..1, or null outside that beat. */
  gun: number | null;
  /** The pipe's rings lighting, 0..1: 0 until its beat, 1 after. */
  pipe: number;
  /** How far the camera has moved from the player to the pipe, 0..1, eased. */
  look: number;
  /** The tube's and the pipe's glow, times their usual radius: each grows as its rings light, then settles back over the next beat. */
  gunGlow: number;
  pipeGlow: number;
}

const ease = (t: number): number => t * t * (3 - 2 * t);

const settle = (t: number): number => ATTUNE_GLOW_SWELL + (1 - ATTUNE_GLOW_SWELL) * ease(t);

/** The beat the attune is on with `left` ticks to go. When nothing is playing, the tube and pipe are fully lit and the camera is on the player. */
export function attuneBeat(left: number): AttuneBeat {
  const done = { gun: null, pipe: 1, look: 0, gunGlow: 1, pipeGlow: 1 };
  if (left <= 0) return done;
  let t = ATTUNE_TICKS - left;
  if (t < ATTUNE.gun) return { ...done, gun: t / ATTUNE.gun, pipe: 0, gunGlow: ATTUNE_GLOW_SWELL * (t / ATTUNE.gun), pipeGlow: 0 };
  t -= ATTUNE.gun;
  if (t < ATTUNE.panTo) return { ...done, pipe: 0, look: ease(t / ATTUNE.panTo), gunGlow: settle(t / ATTUNE.panTo), pipeGlow: 0 };
  t -= ATTUNE.panTo;
  if (t < ATTUNE.pipe) return { ...done, pipe: t / ATTUNE.pipe, look: 1, pipeGlow: ATTUNE_GLOW_SWELL * (t / ATTUNE.pipe) };
  t -= ATTUNE.pipe;
  return { ...done, look: 1 - ease(t / ATTUNE.panBack), pipeGlow: settle(t / ATTUNE.panBack) };
}
