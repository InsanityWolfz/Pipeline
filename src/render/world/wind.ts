import { GUST_EASE_MS, WIND } from '../../data/ambient';
import { DECOR_REGIONS, type DecorRegion } from '../../data/decor';
import { nextFloat, type RngState } from '../../sim/rng';
import type { WeatherWind } from './weatherModel';

// 077: the wind where the camera is: each region's (direction, strength and gusts, src/data/ambient.ts) blended by its
// weight in 074's mood blend, as the mood is. Gusts come on a clock per region from the render-side stream, easing in
// and out over GUST_EASE_MS (review: not in one step). It leans the sway, drifts the weather and slants the rain. Pure
// but for the stream.

interface Gust {
  /** Ms until the next gust, and ms left of the one blowing (0 when none). */
  wait: number;
  left: number;
  /** How far in it has eased, 0..1. */
  level: number;
}

const smoothstep = (k: number): number => k * k * (3 - 2 * k);

/** The unit vector a screen bearing (degrees clockwise from north) points toward. */
export const toward = (deg: number): { dx: number; dy: number } => ({ dx: Math.sin((deg * Math.PI) / 180), dy: -Math.cos((deg * Math.PI) / 180) });

export class WindNow {
  private readonly rng: RngState;
  private readonly gusts = new Map<DecorRegion, Gust>();
  /** The wind this frame. */
  now: WeatherWind = { strength: 1, dx: 1, dy: 0, gust: 1 };

  constructor(rng: RngState) {
    this.rng = rng;
    for (const r of DECOR_REGIONS) {
      const g = WIND[r].gusts;
      if (g) this.gusts.set(r, { wait: g.everyMs[0] + nextFloat(rng) * (g.everyMs[1] - g.everyMs[0]), left: 0, level: 0 });
    }
  }

  /** Whether a region's gust blows now. */
  gusting(r: DecorRegion): boolean {
    return (this.gusts.get(r)?.left ?? 0) > 0;
  }

  /** Advances the gusts by `dt` ms and blends the regions' winds by `weights`. */
  step(dt: number, weights: Readonly<Record<DecorRegion, number>>): WeatherWind {
    for (const [r, g] of this.gusts) {
      const def = WIND[r].gusts;
      if (!def) continue;
      if (g.left > 0) g.left = Math.max(0, g.left - dt);
      else {
        g.wait -= dt;
        if (g.wait <= 0) {
          g.left = def.ms;
          g.wait = def.everyMs[0] + nextFloat(this.rng) * (def.everyMs[1] - def.everyMs[0]);
        }
      }
      const to = g.left > 0 ? 1 : 0;
      g.level += Math.max(-dt / GUST_EASE_MS, Math.min(dt / GUST_EASE_MS, to - g.level));
    }
    let dx = 0;
    let dy = 0;
    let strength = 0;
    let gust = 0;
    let total = 0;
    for (const r of DECOR_REGIONS) {
      const w = weights[r];
      if (w <= 0) continue;
      const def = WIND[r];
      const mult = 1 + ((def.gusts?.mult ?? 1) - 1) * smoothstep(this.gusts.get(r)?.level ?? 0);
      const v = toward(def.toward);
      dx += v.dx * w;
      dy += v.dy * w;
      strength += def.strength * mult * w;
      gust += mult * w;
      total += w;
    }
    const len = Math.hypot(dx, dy) || 1;
    this.now = total > 0 ? { strength: strength / total, dx: dx / len, dy: dy / len, gust: gust / total } : { strength: 1, dx: 1, dy: 0, gust: 1 };
    return this.now;
  }
}
