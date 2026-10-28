import { FX_THRESHOLDS, type FxPriority } from '../data/fxQuality';
import { PARTICLE_BUDGET, PARTICLE_SHARES } from '../data/juice';
import type { Quality } from '../data/settings';

// 078: the particle budget's one seam. Every particle is one of three kinds, each with a fixed share of 076's
// PARTICLE_BUDGET (PARTICLE_SHARES): 076's death motes, 077's weather (014's room motes indoors), and every other
// effect. A kind may spawn up to its share less its live count, and never past the budget less every live particle.
// No share lends its unused room to another, so a busy fight can't crowd out the weather or the deaths. Inside the
// effect share, a burst's priority thins it further: soft bits stop at half full, shots at 85%, cues use the rest.

export type ParticleKind = 'death' | 'weather' | 'effect';

/** Live particles of each kind. */
export interface LiveCounts {
  death: number;
  weather: number;
  effect: number;
}

/** How many of `kind` may spawn now at `priority` (only effects are thinned by it). */
export function roomFor(kind: ParticleKind, priority: FxPriority, quality: Quality, live: Readonly<LiveCounts>): number {
  const share = PARTICLE_SHARES[quality][kind];
  const cap = kind === 'effect' ? Math.floor(share * FX_THRESHOLDS[priority]) : share;
  const total = live.death + live.weather + live.effect;
  return Math.max(0, Math.min(cap - live[kind], PARTICLE_BUDGET[quality] - total));
}

/** One per scene: the live count of each kind, reported by `Particles` (deaths, effects) and the weather (or room motes). */
export class ParticleLedger {
  readonly live: LiveCounts = { death: 0, weather: 0, effect: 0 };

  add(kind: ParticleKind, n = 1): void {
    this.live[kind] += n;
  }

  remove(kind: ParticleKind, n = 1): void {
    this.live[kind] = Math.max(0, this.live[kind] - n);
  }

  /** For a kind counted elsewhere each frame (the weather model, the room motes). */
  set(kind: ParticleKind, n: number): void {
    this.live[kind] = n;
  }

  clear(kind: ParticleKind): void {
    this.live[kind] = 0;
  }

  get total(): number {
    return this.live.death + this.live.weather + this.live.effect;
  }

  room(kind: ParticleKind, priority: FxPriority, quality: Quality): number {
    return roomFor(kind, priority, quality, this.live);
  }
}
