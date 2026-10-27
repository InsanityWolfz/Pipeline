import type { DecorRegion } from './decor';
import type { Quality } from './settings';

// 077: each region's weather, render only and only in the overworld: Region 1's drifting pollen and ley motes, the
// Hollows' dust, the Emberworks' ash and embers, the Stormcrown's rain and lightning. A layer's count is particles
// alive in view, by tier; they spawn over the view plus `WEATHER_MARGIN` and are recycled at the upwind edge as they
// drift out. Colours are palette ids; sizes px, speeds px/s, lives ms.

/**
 * How a layer moves: drifting along the wind with a slow sway, rising, falling while fluttering downwind, rain
 * streaks slanted downwind, or splashes (a ring on the ground that shows a moment).
 */
export type WeatherMotion = 'drift' | 'rise' | 'fall' | 'rain' | 'splash';

export interface WeatherLayer {
  readonly id: string;
  readonly colors: readonly string[];
  /** The particle's look: a square dot `size` px (min, max), a flake, a rain streak, a splash ring. */
  readonly look: 'dot' | 'flake' | 'streak' | 'splash';
  readonly size: readonly [number, number];
  readonly motion: WeatherMotion;
  readonly speed: readonly [number, number];
  readonly lifeMs: readonly [number, number];
  readonly alpha: number;
  /** Additive on these tiers. */
  readonly additive: readonly Quality[];
  readonly count: Readonly<Record<Quality, number>>;
  /** A brightness flicker within ± this share (embers). */
  readonly flicker?: number;
  /** Rain's slant downwind, degrees from straight down. */
  readonly slant?: number;
  /** Gusts speed it up (dust). */
  readonly gusty?: boolean;
}

export interface RegionWeather {
  readonly name: string;
  readonly layers: readonly WeatherLayer[];
  /** Weather lightning (the Stormcrown's). */
  readonly lightning?: boolean;
}

const LIT: readonly Quality[] = ['medium', 'high'];

export const WEATHER: Readonly<Record<DecorRegion, RegionWeather>> = {
  meadow: {
    name: 'motes',
    layers: [
      { id: 'pollen', colors: ['sun', 'snow'], look: 'dot', size: [1, 1], motion: 'drift', speed: [4, 10], lifeMs: [4000, 7000], alpha: 0.6, additive: [], count: { low: 6, medium: 14, high: 22 } },
      { id: 'ley-motes', colors: ['cyan-glow', 'cyan'], look: 'dot', size: [1, 1], motion: 'rise', speed: [3, 8], lifeMs: [4000, 7000], alpha: 0.6, additive: LIT, count: { low: 2, medium: 6, high: 10 } },
    ],
  },
  hollows: {
    name: 'dust',
    layers: [{ id: 'dust', colors: ['hollow-pale', 'rock-pale', 'sand'], look: 'dot', size: [1, 2], motion: 'drift', speed: [12, 24], lifeMs: [3000, 6000], alpha: 0.45, additive: [], count: { low: 16, medium: 40, high: 70 }, gusty: true }],
  },
  ember: {
    name: 'ash and embers',
    layers: [
      { id: 'ash', colors: ['ash-pale', 'ash-light'], look: 'flake', size: [2, 2], motion: 'fall', speed: [6, 14], lifeMs: [4000, 7000], alpha: 0.55, additive: [], count: { low: 12, medium: 30, high: 50 } },
      { id: 'embers', colors: ['cinder', 'cinder-light'], look: 'dot', size: [1, 1], motion: 'rise', speed: [10, 24], lifeMs: [1500, 3000], alpha: 0.8, additive: LIT, count: { low: 6, medium: 15, high: 30 }, flicker: 0.15 },
    ],
  },
  storm: {
    name: 'rain and lightning',
    layers: [
      { id: 'rain', colors: ['storm-pale', 'foam'], look: 'streak', size: [1, 7], motion: 'rain', speed: [320, 420], lifeMs: [500, 900], alpha: 0.35, additive: [], count: { low: 30, medium: 80, high: 140 }, slant: 15 },
      { id: 'splashes', colors: ['storm-pale'], look: 'splash', size: [3, 3], motion: 'splash', speed: [0, 0], lifeMs: [120, 120], alpha: 0.4, additive: [], count: { low: 0, medium: 0, high: 20 } },
    ],
    lightning: true,
  },
};

/** The most weather particles alive in view, by tier. */
export const WEATHER_CAP: Readonly<Record<Quality, number>> = { low: 40, medium: 100, high: 160 };

/**
 * The particle budget weather shares (076, not yet on main: `PARTICLE_BUDGET` and the live death-mote cap in its
 * src/data/juice.ts). Weather spawns a particle only while the live total of every kind is below `particles` minus
 * `deathMotes`, so deaths always have their room. These mirror 076's numbers; when 076 merges they read its constants.
 */
export const WEATHER_BUDGET: { readonly particles: Readonly<Record<Quality, number>>; readonly deathMotes: Readonly<Record<Quality, number>> } = {
  particles: { low: 150, medium: 300, high: 500 },
  deathMotes: { low: 60, medium: 120, high: 200 },
};

/** Particles spawn over the view plus this many px each side, and are recycled once past it. */
export const WEATHER_MARGIN = 32;

/**
 * Weather lightning in the Stormcrown (Medium and High, with Flashes on): a strike every `everyMs` while the
 * Stormcrown's blend weight is at least `minWeight`. It strikes the Storm Tower's crown in view, else an iron rod in
 * view at least `playerMargin` tiles from the player (never within `rodNodeMargin` tiles of a storm-rod node), else a
 * cairn or a cliff top in view; with nothing suitable it skips. The bolt (064's look) runs from `above` px over the
 * view's top edge for `boltMs`, with 074's flash and rod-strike light. `riseRod`/`riseCairn`/`riseCliff`: how far up
 * the target's tile bottom the bolt lands, px.
 */
export const WEATHER_LIGHTNING = {
  everyMs: [10000, 22000] as const,
  minWeight: 0.5,
  playerMargin: 6,
  rodNodeMargin: 4,
  boltMs: 220,
  above: 24,
  step: 18,
  jag: 9,
  riseRod: 74,
  riseCairn: 28,
  riseCliff: 40,
} as const;

/** The render-side weather stream's seed (src/sim/rng.ts's generator, its own stream: never the sim's). */
export const WEATHER_SEED = 0x077e47;
