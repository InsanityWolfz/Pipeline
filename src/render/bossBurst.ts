import { PARTICLE_BUDGET, type ParticleBurst } from '../data/juice';
import type { Quality } from '../data/settings';
import type { Particles } from './Particles';

// 080: the boss intros' and phase looks' bursts, shared by BossIntroView and BossPhaseView: a burst's count at the
// Graphics quality's scale (074), thinned hard to the room PARTICLE_BUDGET has left after every live particle.

/** How many of a burst's `count` particles throw now: × the tier's scale, at most the budget's room (never below 0). */
export function burstCount(count: number, scale: Readonly<Record<Quality, number>>, quality: Quality, live: number): number {
  return Math.max(0, Math.min(PARTICLE_BUDGET[quality] - live, Math.round(count * scale[quality])));
}

/** Throws a burst at the tier's count within the budget from a ground point; returns how many it threw. */
export function emitWithin(particles: Particles | undefined, b: ParticleBurst, scale: Readonly<Record<Quality, number>>, quality: Quality, x: number, y: number): number {
  if (!particles) return 0;
  const count = burstCount(b.count, scale, quality, particles.count);
  if (count > 0) particles.emit({ ...b, count }, x, y);
  return count;
}
