import type { DecorRegion } from './decor';
import { HUD_LAYOUT } from './hudLayout';
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
 * How weather particles move and fade (render only). Rising layers drift downwind at `riseDrift` × their speed;
 * falling ones at `fallDrift` × it × the wind's strength (at most `fallMaxStrength`). Drifting and falling particles
 * sway across the wind at `swayRate` radians a second, `swayDrift` (drifting) or `swayFall` (falling) px/s across it
 * and `swayAlong` of that along it. A particle fades in over the first `fadeIn` of its life and out over the last
 * `fadeOut`; a flickering one at `flickerRate` radians a ms, its seed × `flickerSeed` apart; in a region's crossfade
 * its alpha is × min(1, `weightFloor` + its region's weight). Particles over their layer's target (a crossfade, a
 * tier change) fade out over `overMs` (review: not cut at once). A field's first lives spread over `spreadLife` of a life.
 */
export const WEATHER_MOTION = {
  riseDrift: 0.35,
  fallDrift: 0.7,
  fallMaxStrength: 1.5,
  swayRate: 1.7,
  swayDrift: 3,
  swayFall: 6,
  swayAlong: 0.5,
  fadeIn: 0.15,
  fadeOut: 0.2,
  flickerRate: 0.03,
  flickerSeed: 20,
  weightFloor: 0.4,
  overMs: 400,
  spreadLife: 0.6,
} as const;

/** Particles spawn over the view plus this many px each side, and are recycled once past it. */
export const WEATHER_MARGIN = 32;

/**
 * Weather lightning in the Stormcrown (Medium and High, with Flashes on): a strike every `everyMs` while the
 * Stormcrown's blend weight is at least `minWeight`. It strikes the Storm Tower's crown in view, else an iron rod in
 * view at least `playerMargin` tiles from the player (never within `rodNodeMargin` tiles of a storm-rod node), else a
 * cairn or a cliff top in view; with nothing suitable it skips. The bolt (064's look) runs from `above` px over the
 * view's top edge for `boltMs`, with 074's flash and rod-strike light. `riseRod`/`riseCairn`/`riseCliff`: how far up
 * the target's tile bottom the bolt lands, px. Review: a target is skipped when its bolt would run down over the
 * player (within `playerColumn` px either side of it, the bolt's spread and jag and the wanderer's half width, landing
 * lower than `playerTall` px over the player's middle) or land under the bottom HUD's strip (`hudClear` px: the hotbar
 * row and the tube slot over it, with their margins).
 */
export const WEATHER_LIGHTNING = {
  everyMs: [10000, 22000] as const,
  minWeight: 0.5,
  playerMargin: 6,
  rodNodeMargin: 4,
  boltMs: 220,
  /** The bolt's widths (064's look: a wide storm-glow glow, a cyan-glow bolt, a snow core): px. */
  boltWidth: 2.2,
  glowWidth: 9,
  /** Where it comes from: this many px over the view's top edge, up to `spread` px either side of its target. */
  above: 24,
  spread: 60,
  step: 18,
  jag: 9,
  riseRod: 74,
  riseCairn: 28,
  riseCliff: 40,
  playerColumn: 60 + 9 + 12,
  playerTall: 24,
  hudClear: HUD_LAYOUT.margin + HUD_LAYOUT.cell.h + HUD_LAYOUT.gap + HUD_LAYOUT.tubeSlot.h,
} as const;

/** The render-side weather stream's seed (src/sim/rng.ts's generator, its own stream: never the sim's). */
export const WEATHER_SEED = 0x077e47;
