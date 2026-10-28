import type { Quality } from './settings';
import { WEATHER_CAP } from './weather';

// 079: the foundry's heat, steam, sparks and ley flow pulses (render only; the sim never reads this). The Forge
// group's fire machines (the Smelter and the kiln) glow, shimmer and steam while they work and are on screen; the
// Tempering coil gets its violet light and sparks only. Steam and sparks are live particles under 076's budget, in
// weather's share (the foundry has no weather). Every colour is a palette id; every random value comes from the
// render-side seeded stream (FOUNDRY_FX_SEED).

type ByTier = Readonly<Record<Quality, number>>;

/** A point on a 1×1 machine's housing, px from its feet (x right, y up). */
export interface HousingPoint {
  readonly x: number;
  readonly rise: number;
}

/**
 * Heat: which machines run hot; the glow (014's halo) at the fire, breathing with the working loop; the shimmer (a baked
 * 4-frame additive loop, `fps`, over the housing's top, its start frame from the piece id) by tier; the steam's vent.
 */
export const HEAT = {
  machines: ['smelter', 'kiln'] as readonly string[],
  glow: { color: 'cinder', radius: 20, alpha: [0.45, 0.85] as const },
  /** Where the fire is, by machine: the Smelter's window, the kiln's mouth. */
  fire: { smelter: { x: -3, rise: 10 }, kiln: { x: 0, rise: 9 } } as Readonly<Record<string, HousingPoint>>,
  shimmer: { frames: 4, fps: 8, alpha: { low: 0, medium: 0.18, high: 0.25 } as ByTier, at: { x: 0, rise: 44 } as HousingPoint },
  /** The vent on the top face the steam leaves from. */
  vent: { x: 6, rise: 38 } as HousingPoint,
} as const;

/** A puff or a burst of particles: colours, how they move, grow, fade and how long they live. */
export interface FxPuff {
  readonly colors: readonly string[];
  /** Up, px/s, and drift either way, px/s. */
  readonly rise: readonly [number, number];
  readonly drift: number;
  /** Size, px, from birth to death. */
  readonly size: readonly [number, number];
  /** Alpha from birth to death. */
  readonly alpha: readonly [number, number];
  readonly lifeMs: readonly [number, number];
  readonly count: ByTier;
}

/** Steam: a puff from the vent every `everyMs` ± `jitterMs` (seeded), soft foam and pale stone blobs, normal blend. */
export const STEAM: FxPuff & { readonly everyMs: number; readonly jitterMs: number } = {
  colors: ['foam', 'rock-pale'],
  rise: [10, 18],
  drift: 4,
  size: [2, 6],
  alpha: [0.35, 0],
  lifeMs: [900, 1400],
  count: { low: 1, medium: 2, high: 3 },
  everyMs: 700,
  jitterMs: 200,
};

/** Quench: a Smelter's bigger puff off its cooling bar on each craft. */
export const QUENCH: FxPuff & { readonly at: HousingPoint } = {
  colors: ['foam', 'rock-pale'],
  rise: [12, 22],
  drift: 6,
  size: [3, 8],
  alpha: [0.35, 0],
  lifeMs: [900, 1400],
  count: { low: 2, medium: 4, high: 6 },
  at: { x: 3, rise: 9 },
};

/**
 * Sparks on each craft of a Smelter, kiln or coil on screen, from its fire (the coil's charge). The look (speed, cone,
 * fall, life, size and colours) is 078's machine sparks' (`MACHINE_SPARKS`); 079 sets where, when and how many.
 * Additive on the tiers listed.
 */
export const SPARKS = {
  machines: ['smelter', 'kiln', 'tempering-coil'] as readonly string[],
  count: { low: 3, medium: 6, high: 10 } as ByTier,
  additive: ['medium', 'high'] as readonly Quality[],
  /** Where they leave from, by machine (the coil's crucible). */
  at: { smelter: { x: -3, rise: 10 }, kiln: { x: 0, rise: 9 }, 'tempering-coil': { x: 0, rise: 12 } } as Readonly<Record<string, HousingPoint>>,
} as const;

/** At most this many running forge machines (nearest the view's centre) get shimmer and steam; the rest keep their glow. */
export const FORGE_FX_MAX: ByTier = { low: 4, medium: 8, high: 12 };

/** A machine counts as on screen with its footprint inside the view grown by this, px. */
export const FORGE_FX_MARGIN = 32;

/** The foundry's live particles (steam, sparks and 014's 18 room motes): weather's share, as the foundry has none. */
export const FOUNDRY_FX_CAP: ByTier = WEATHER_CAP;

/**
 * Ley flow pulses: on each item the line feeds the intake (`refills`) or an entrance firing, a front closes in on the
 * intake's mouth from the farthest ley inlay at `speed` px/s. As it passes an inlay, the rune lights `color` with a halo,
 * fading over `litMs`, and a bead slides `beadPx` toward the mouth over `beadMs`, fading. At most one new pulse every
 * `everyMs`, `live` at once by tier (none on Low); with Flashes off at `flashesOff` × their alpha.
 */
export const LEY_PULSE = {
  speed: 360,
  color: 'cyan-glow',
  litMs: 450,
  beadPx: 32,
  beadMs: 450,
  everyMs: 250,
  live: { low: 0, medium: 3, high: 5 } as ByTier,
  flashesOff: 0.7,
  alpha: 0.9,
} as const;

/** The foundry effects' render-side stream (steam timing, spawn spread), apart from the weather's. */
export const FOUNDRY_FX_SEED = 0x079f0;
