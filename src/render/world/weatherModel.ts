import { DECOR_REGIONS, type DecorRegion } from '../../data/decor';
import type { Ring } from '../../data/ringScale';
import type { Quality } from '../../data/settings';
import { WEATHER, WEATHER_BUDGET, WEATHER_CAP, WEATHER_MARGIN, WEATHER_MOTION, type WeatherLayer } from '../../data/weather';
import { nextFloat, type RngState } from '../../sim/rng';

// 077: the weather as a pure model (render only): each region's weight in 074's mood blend, the layers' target counts
// by tier (Low's in a boss fight), the shared particle budget's gate, and the particles themselves: spawned over the
// view plus WEATHER_MARGIN, moved by the wind, and recycled at the upwind edge once they drift out, so the cost
// follows the count, not the map. Every value a particle gets comes from the render-side stream, so the same seed and
// frames replay the same. Particles over their layer's target fade out over WEATHER_MOTION.overMs (review). WeatherView
// draws it.

type View = { x: number; y: number; width: number; height: number };
const M = WEATHER_MOTION;

/** Every layer by `region/id`, for a fading particle whose region left the blend. */
const LAYERS = new Map<string, WeatherLayer>(DECOR_REGIONS.flatMap((r) => WEATHER[r].layers.map((l) => [`${r}/${l.id}`, l] as const)));

/** The region a danger ring's mood belongs to. */
export const regionOfRing = (ring: Ring | number): DecorRegion => (ring <= 2 ? 'meadow' : ring === 3 ? 'hollows' : ring === 4 ? 'ember' : 'storm');

/** Each region's weight where the camera is, from 074's mood (its ring, the ring outside while blending, and the blend). */
export function weatherWeights(mood: { ring: number; outer: number | null; blend: number }): Record<DecorRegion, number> {
  const w = Object.fromEntries(DECOR_REGIONS.map((r) => [r, 0])) as Record<DecorRegion, number>;
  const inner = regionOfRing(mood.ring);
  if (mood.outer === null) {
    w[inner] = 1;
    return w;
  }
  const outer = regionOfRing(mood.outer);
  w[inner] += 1 - mood.blend;
  w[outer] += mood.blend;
  return w;
}

/** One layer's target: how many of it should be alive in view now. */
export interface LayerTarget {
  region: DecorRegion;
  layer: WeatherLayer;
  count: number;
  weight: number;
}

/** The layers' targets: each region's tier counts × its weight (Low's counts in a boss fight), within WEATHER_CAP. */
export function layerTargets(weights: Record<DecorRegion, number>, quality: Quality, fight: boolean): LayerTarget[] {
  const tier: Quality = fight ? 'low' : quality;
  const out: LayerTarget[] = [];
  for (const region of DECOR_REGIONS) {
    const weight = weights[region];
    if (weight <= 0) continue;
    for (const layer of WEATHER[region].layers) out.push({ region, layer, count: Math.round(layer.count[tier] * weight), weight });
  }
  const total = out.reduce((n, t) => n + t.count, 0);
  const cap = WEATHER_CAP[tier];
  if (total > cap) for (const t of out) t.count = Math.floor((t.count * cap) / total);
  return out;
}

/** How many weather particles may spawn now: the budget less the death motes' room and every particle alive. */
export function budgetRoom(quality: Quality, liveOther: number, liveWeather: number): number {
  return Math.max(0, WEATHER_BUDGET.particles[quality] - WEATHER_BUDGET.deathMotes[quality] - liveOther - liveWeather);
}

/** A weather particle as modelled: where, how it moves, its age and life (ms), its look. */
export interface WeatherParticle {
  layer: string;
  region: DecorRegion;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  /** Its own phase (sway, flutter, flicker), 0..1. */
  seed: number;
  /** Its region's weight when it spawned (scales its alpha in a crossfade). */
  weight: number;
  /** Ms left of its fade-out once over its layer's target; null while it counts. */
  fadeLeft: number | null;
}

/** The wind the weather moves in: its strength (gusts included) and the unit direction it blows toward. */
export interface WeatherWind {
  strength: number;
  dx: number;
  dy: number;
  /** × on gusty layers while a gust blows (1 otherwise). */
  gust: number;
}

const between = (rng: RngState, r: readonly [number, number]): number => r[0] + nextFloat(rng) * (r[1] - r[0]);

/** A particle's velocity for its layer in a wind, px/s. */
function velocity(layer: WeatherLayer, speed: number, wind: WeatherWind): { vx: number; vy: number } {
  switch (layer.motion) {
    case 'drift':
      return { vx: wind.dx * speed, vy: wind.dy * speed };
    case 'rise':
      return { vx: wind.dx * speed * M.riseDrift, vy: -speed };
    case 'fall':
      return { vx: wind.dx * speed * M.fallDrift * Math.min(M.fallMaxStrength, wind.strength), vy: speed };
    case 'rain': {
      const a = ((layer.slant ?? 0) * Math.PI) / 180;
      return { vx: Math.sin(a) * Math.sign(wind.dx || 1) * speed, vy: Math.cos(a) * speed };
    }
    case 'splash':
      return { vx: 0, vy: 0 };
  }
}

export class WeatherModel {
  readonly particles: WeatherParticle[] = [];
  private readonly rng: RngState;
  /** Spawned and recycled since boot, for the test hook. */
  spawned = 0;
  recycled = 0;

  constructor(rng: RngState) {
    this.rng = rng;
  }

  /** A new particle of `t`'s layer at (x, y). */
  private make(t: LayerTarget, x: number, y: number, wind: WeatherWind): WeatherParticle {
    const L = t.layer;
    const speed = between(this.rng, L.speed);
    const v = velocity(L, speed, wind);
    return {
      layer: L.id,
      region: t.region,
      x,
      y,
      ...v,
      age: 0,
      life: between(this.rng, L.lifeMs),
      size: Math.round(between(this.rng, L.size)),
      color: L.colors[Math.floor(nextFloat(this.rng) * L.colors.length)] ?? L.colors[0] ?? 'snow',
      seed: nextFloat(this.rng),
      weight: t.weight,
      fadeLeft: null,
    };
  }

  /** A point over the view and its margin. */
  private anywhere(v: View): { x: number; y: number } {
    const m = WEATHER_MARGIN;
    return { x: v.x - m + nextFloat(this.rng) * (v.width + 2 * m), y: v.y - m + nextFloat(this.rng) * (v.height + 2 * m) };
  }

  /** A point on the upwind edge strip (the side the wind and the particle's own motion come from). */
  private upwind(v: View, p: WeatherParticle): { x: number; y: number } {
    const m = WEATHER_MARGIN;
    const fromX = Math.abs(p.vx) >= Math.abs(p.vy);
    const along = nextFloat(this.rng);
    if (fromX) return { x: p.vx > 0 ? v.x - m : v.x + v.width + m, y: v.y - m + along * (v.height + 2 * m) };
    return { x: v.x - m + along * (v.width + 2 * m), y: p.vy > 0 ? v.y - m : v.y + v.height + m };
  }

  /**
   * One frame of `dt` ms in `view`: ages and moves the particles, kills the old, fades out those past their layer's
   * target, recycles those that drifted out at the upwind edge (a fading one dies there), and spawns toward each
   * layer's target while the budget's `room` lasts. Returns the particles that died this frame (so the view frees
   * what drew them).
   */
  step(dt: number, view: View, targets: readonly LayerTarget[], room: number, wind: WeatherWind): WeatherParticle[] {
    const s = dt / 1000;
    const m = WEATHER_MARGIN;
    const dead: WeatherParticle[] = [];
    const live = new Map<string, number>();
    const want = new Map(targets.map((t) => [`${t.region}/${t.layer.id}`, t]));
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      const key = `${p.region}/${p.layer}`;
      const t = want.get(key);
      const n = live.get(key) ?? 0;
      p.age += dt;
      if (p.fadeLeft !== null) p.fadeLeft -= dt;
      else if (!t || n >= t.count) p.fadeLeft = M.overMs;
      const layer = t?.layer ?? LAYERS.get(key);
      if (p.age >= p.life || (p.fadeLeft !== null && p.fadeLeft <= 0) || !layer) {
        this.particles.splice(i, 1);
        dead.push(p);
        continue;
      }
      if (p.fadeLeft === null) live.set(key, n + 1);
      const g = layer.gusty ? wind.gust : 1;
      const sway = layer.motion === 'drift' || layer.motion === 'fall' ? Math.sin((p.age / 1000) * M.swayRate + p.seed * 2 * Math.PI) * (layer.motion === 'fall' ? M.swayFall : M.swayDrift) : 0;
      p.x += (p.vx * g - wind.dy * sway) * s;
      p.y += (p.vy * g + wind.dx * sway * M.swayAlong) * s;
      if (p.x < view.x - m || p.x > view.x + view.width + m || p.y < view.y - m || p.y > view.y + view.height + m) {
        if (p.fadeLeft !== null) {
          this.particles.splice(i, 1);
          dead.push(p);
          continue;
        }
        const at = this.upwind(view, p);
        p.x = at.x;
        p.y = at.y;
        this.recycled += 1;
      }
    }
    let left = room;
    for (const t of targets) {
      const key = `${t.region}/${t.layer.id}`;
      let n = live.get(key) ?? 0;
      while (n < t.count && left > 0) {
        const at = this.anywhere(view);
        const p = this.make(t, at.x, at.y, wind);
        // Spread the first lives, so a field doesn't all die at once.
        p.age = t.layer.motion === 'splash' ? 0 : nextFloat(this.rng) * p.life * M.spreadLife;
        this.particles.push(p);
        this.spawned += 1;
        n += 1;
        left -= 1;
      }
      live.set(key, n);
    }
    return dead;
  }

  /** Particles drawn (fading ones too: the budget counts them), of a layer or all. */
  count(layer?: string): number {
    return layer ? this.particles.filter((p) => p.layer === layer).length : this.particles.length;
  }

  /** Particles that count toward their layers' targets (not fading out). */
  live(): number {
    let n = 0;
    for (const p of this.particles) if (p.fadeLeft === null) n += 1;
    return n;
  }

  /**
   * A particle's alpha now: its layer's, faded in and out over its life, flickering (embers), scaled in a crossfade,
   * and fading out over WEATHER_MOTION.overMs once over its layer's target.
   */
  static alpha(p: WeatherParticle, layer: WeatherLayer): number {
    const k = p.age / p.life;
    const env = Math.min(1, k / M.fadeIn, (1 - k) / M.fadeOut);
    const flicker = layer.flicker ? 1 + layer.flicker * Math.sin(p.age * M.flickerRate + p.seed * M.flickerSeed) : 1;
    const over = p.fadeLeft === null ? 1 : Math.max(0, p.fadeLeft / M.overMs);
    return Math.max(0, layer.alpha * env * flicker * Math.min(1, M.weightFloor + p.weight) * over);
  }
}
