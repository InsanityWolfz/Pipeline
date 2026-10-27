import type { DecorRegion, SwayKind } from './decor';
import type { Quality } from './settings';

// 077: the overworld's ambient motion, render only: each region's wind, the sway of plants, vines and trees, water
// ripples on ponds and springs, and beads of light running along the ley lines toward the foundry. Times ms, sizes and
// speeds world px (and px/s), angles degrees.

/**
 * One wind per region: the screen direction it blows toward (degrees clockwise from north: east is 90), its strength
 * (it scales the sway and drifts the weather), and its gusts (every `everyMs`, × `mult` for `ms`), if any. Like the
 * mood, it follows the camera's centre and blends over 074's band.
 */
export interface Wind {
  readonly toward: number;
  readonly strength: number;
  readonly gusts?: { readonly everyMs: readonly [number, number]; readonly mult: number; readonly ms: number };
}

export const WIND: Readonly<Record<DecorRegion, Wind>> = {
  meadow: { toward: 90, strength: 1 },
  hollows: { toward: 112.5, strength: 1, gusts: { everyMs: [6000, 10000], mult: 2.5, ms: 1500 } },
  ember: { toward: 90, strength: 0.5 },
  storm: { toward: 135, strength: 1.8, gusts: { everyMs: [4000, 8000], mult: 1.5, ms: 1000 } },
};

/**
 * The sway: each plant, vine and tree turns about its foot: amplitude × wind strength (at most 1) × sin(clock × rate +
 * phase), plus a lean downwind of at most `lean` × the amplitude. A cycle takes `periodMs` (by its hash within the
 * range); the phase runs along the wind `wave` px a cycle, so gusts roll across a field. On Low nothing sways.
 * `perFrame`: at most this many objects are turned a frame (past it, in turns); `margin`: objects this far outside
 * the view (a canopy reaching in) are stepped too.
 */
export const SWAY: {
  readonly amplitude: Readonly<Record<SwayKind, number>>;
  readonly periodMs: Readonly<Record<SwayKind, readonly [number, number]>>;
  readonly lean: number;
  readonly wave: number;
  readonly perFrame: Readonly<Record<Quality, number>>;
  readonly margin: number;
  readonly bucket: number;
} = {
  amplitude: { grass: 4, flower: 3, fern: 2.5, reed: 2.5, vine: 3, tree: 0.6 },
  periodMs: { grass: [2400, 3600], flower: [2400, 3600], fern: [2400, 3600], reed: [2400, 3600], vine: [2400, 3600], tree: [4000, 5000] },
  lean: 1 / 3,
  wave: 260,
  perFrame: { low: 0, medium: 300, high: 600 },
  margin: 64,
  /** The stepper keeps each chunk's objects in squares this many px across, so a frame looks only at those in view. */
  bucket: 160,
};

/**
 * Water ripples: a ring every `everyMs` at a point in a pond's deep water (or a spring's pool), growing from
 * `grow[0]` to `grow[1]` px across, squashed to `squash` of its width, fading over `lifeMs`. Ponds' in `color`,
 * springs' in `springColor`. At most `max` rings in view by tier; High adds `glints` twinkling glints a pond.
 */
export const RIPPLES = {
  everyMs: [1400, 2600] as const,
  grow: [2, 10] as const,
  squash: 0.5,
  lifeMs: 1600,
  color: 'foam',
  springColor: 'cyan-glow',
  alpha: 0.5,
  /** Rings start within this share of the pond's radii from its middle (the deep water). */
  deep: 0.55,
  max: { low: 0, medium: 12, high: 20 } as Readonly<Record<Quality, number>>,
  glints: { perPond: 2, color: 'snow', periodMs: 1800, alpha: 0.8 },
} as const;

/**
 * Ley lines flow: soft `length` px streaks in `color` (additive, `alpha`) running along every ley line toward its last
 * point (the foundry, or a vein seam's pylon) at `speed` px/s, one every `every` tiles, at most `max` in view, by tier.
 */
export const LEY_FLOW = {
  color: 'cyan-glow',
  alpha: 0.7,
  length: 6,
  speed: 24,
  every: { low: 0, medium: 4, high: 3 } as Readonly<Record<Quality, number>>,
  max: { low: 0, medium: 24, high: 48 } as Readonly<Record<Quality, number>>,
} as const;
