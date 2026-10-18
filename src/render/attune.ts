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
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/** The beat the attune is on with `left` ticks to go. When nothing is playing, the tube and pipe are fully lit and the camera is on the player. */
export function attuneBeat(left: number): AttuneBeat {
  if (left <= 0) return { gun: null, pipe: 1, look: 0 };
  let t = ATTUNE_TICKS - left;
  if (t < ATTUNE.gun) return { gun: t / ATTUNE.gun, pipe: 0, look: 0 };
  t -= ATTUNE.gun;
  if (t < ATTUNE.panTo) return { gun: null, pipe: 0, look: ease(t / ATTUNE.panTo) };
  t -= ATTUNE.panTo;
  if (t < ATTUNE.pipe) return { gun: null, pipe: t / ATTUNE.pipe, look: 1 };
  t -= ATTUNE.pipe;
  return { gun: null, pipe: 1, look: 1 - ease(t / ATTUNE.panBack) };
}
