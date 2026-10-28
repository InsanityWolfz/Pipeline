import { type FoundryLightSource, LIGHT_SOURCES, type LightSourceId } from '../../data/lights';
import type { SimEvents } from '../../sim/events';
import type { LightCandidate } from './lightPick';

// 074: lights that come from the sim's events and last a moment (the muzzle flash, blasts, lightning on a rod, the
// Conductor's attacks), fading out over their life; the face glow's flare after a shot; when lightning last struck
// (the ambient flash); and the Forgewrights venting now. With Flashes off, no event places a flash of light.

type PulseSource = Exclude<LightSourceId, 'round' | FoundryLightSource>;

interface Pulse {
  source: PulseSource;
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  ms: number;
  age: number;
}

const S = LIGHT_SOURCES;

export class LightPulses {
  private pulses: Pulse[] = [];
  /** Ms since the last shot (the face glow's flare), and since lightning last struck in view (the ambient flash). */
  sinceShot = Infinity;
  sinceStrike = Infinity;
  /** Forgewrights venting now, by id: where their core is. */
  readonly venting = new Map<number, { x: number; y: number }>();

  /** Ages the pulses by `deltaMs` and adds this frame's. `view` keeps far lightning from flashing the screen. */
  update(ev: SimEvents, deltaMs: number, flashes: boolean, here: boolean, view: { x: number; y: number; width: number; height: number }): void {
    this.sinceShot += deltaMs;
    this.sinceStrike += deltaMs;
    for (const p of this.pulses) p.age += deltaMs;
    // With Flashes off no flash of light shows, a pulse already lit included.
    this.pulses = flashes ? this.pulses.filter((p) => p.age < p.ms) : [];
    for (const v of ev.vents) this.venting.set(v.id, { x: v.x, y: v.y });
    for (const v of ev.ventEnds) this.venting.delete(v.id);
    if (!here) return;
    if (ev.shots.length > 0) this.sinceShot = 0;
    const near = (x: number, y: number, pad: number) => x >= view.x - pad && x <= view.x + view.width + pad && y >= view.y - pad && y <= view.y + view.height + pad;
    if (ev.rodStrikes.some((r) => near(r.x, r.y, 0)) || ev.strikes.length > 0) this.sinceStrike = 0;
    if (!flashes) return;
    const add = (source: PulseSource, x: number, y: number, radius: number, color: string, intensity: number, ms: number) => this.pulses.push({ source, x, y, radius, color, intensity, ms, age: 0 });
    for (const s of ev.shots.slice(0, 1)) add('muzzle', s.x, s.y, S.muzzle.radius, S.muzzle.color, S.muzzle.intensity, S.muzzle.ms);
    for (const b of ev.bursts) add('burst', b.x, b.y, b.radius * S.burst.radius, S.burst.color[b.damageType], S.burst.intensity, S.burst.ms);
    for (const r of ev.rodStrikes) if (near(r.x, r.y, S.rodStrike.radius)) add('rodStrike', r.x, r.y - S.rodStrike.rise, S.rodStrike.radius, S.rodStrike.color, S.rodStrike.intensity, S.rodStrike.ms);
    const C = S.conductor;
    const bolt = (x: number, y: number) => add('conductor', x, y, C.radius, C.color, C.intensity, C.ms);
    for (const b of ev.blinks) {
      bolt(b.fromX, b.fromY);
      bolt(b.toX, b.toY);
    }
    for (const l of ev.lashes) {
      bolt(l.x0, l.y0);
      bolt((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2);
      bolt(l.x1, l.y1);
    }
    for (const s of ev.strikes) bolt(s.x, s.y);
  }

  /**
   * 077: weather lightning struck at (x, y): the ambient flash, on the same clock rod strikes set (so a weather strike
   * and a rod strike together make one flash, never two stacked), and the rod-strike light there. Flashes off: neither.
   */
  strike(x: number, y: number, flashes: boolean): void {
    if (!flashes) return;
    this.sinceStrike = 0;
    const R = S.rodStrike;
    this.pulses.push({ source: 'rodStrike', x, y, radius: R.radius, color: R.color, intensity: R.intensity, ms: R.ms, age: 0 });
  }

  /** The pulses alive now, fading over their life. */
  lights(): LightCandidate[] {
    return this.pulses.map((p) => ({ source: p.source, x: p.x, y: p.y, radius: p.radius, color: p.color, intensity: p.intensity * (1 - p.age / p.ms), priority: S[p.source].priority }));
  }

  /** Forgets everything (a new room shown). */
  clear(): void {
    this.pulses = [];
    this.venting.clear();
    this.sinceShot = Infinity;
    this.sinceStrike = Infinity;
  }
}
