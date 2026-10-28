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

/** A gust eases in over this many ms as it starts, and out as it ends (smoothstep), the dust's speed and the sway with it. */
export const GUST_EASE_MS = 300;

/**
 * The sway: each plant, vine and tree turns about its foot: amplitude × wind strength (at most `maxStrength`) ×
 * sin(2π × clock / its cycle + phase), plus a lean downwind of at most `lean` × the amplitude. A cycle takes `periodMs`
 * (by its hash within the range), whatever the wind: the wind (gusts and region blends) changes only the amplitude and
 * the lean, eased over `easeMs` (review: a rate that followed the wind jumped the phase late in a session). The phase
 * runs `wave` px a cycle along its own region's wind (fixed per plant), so gusts roll across a field. On Low nothing
 * sways. `perFrame`: at most this many objects are turned a frame (past it, in turns); `margin`: objects this far
 * outside the view (a canopy reaching in) are stepped too.
 */
export const SWAY: {
  readonly amplitude: Readonly<Record<SwayKind, number>>;
  readonly periodMs: Readonly<Record<SwayKind, readonly [number, number]>>;
  readonly lean: number;
  readonly maxStrength: number;
  readonly easeMs: number;
  readonly wave: number;
  readonly hashPhase: number;
  readonly perFrame: Readonly<Record<Quality, number>>;
  readonly margin: number;
  readonly bucket: number;
  readonly nodes: readonly string[];
  readonly nodeCycle: { readonly stepMs: number; readonly steps: number; readonly phases: number };
  readonly ivy: { readonly periodMs: number; readonly phase: number };
} = {
  amplitude: { grass: 4, flower: 3, fern: 2.5, reed: 2.5, vine: 3, tree: 0.6 },
  periodMs: { grass: [2400, 3600], flower: [2400, 3600], fern: [2400, 3600], reed: [2400, 3600], vine: [2400, 3600], tree: [4000, 5000] },
  lean: 1 / 3,
  maxStrength: 1,
  /** The wind's strength and lean reach a change's 95% in this many ms. */
  easeMs: 1000,
  wave: 260,
  /** How much of a cycle the tile hash's phase spreads over (the rest comes from the position along the wind). */
  hashPhase: 0.35,
  perFrame: { low: 0, medium: 300, high: 600 },
  margin: 64,
  /** The stepper keeps each chunk's objects in squares this many px across, so a frame looks only at those in view. */
  bucket: 160,
  /** Gathering nodes that sway like trees (018's tree nodes). */
  nodes: ['tree'],
  /** A tree node's cycle: the trees' shortest plus `stepMs` × (its id mod `steps`); its phase (its id mod `phases`) / `phases`. */
  nodeCycle: { stepMs: 140, steps: 7, phases: 10 },
  /** The Fallen Colossus's ivy (a set piece's sway part): its cycle and phase. */
  ivy: { periodMs: 3000, phase: 0.3 },
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
  /** The ring frame's width, px (render scales it to a ring's size). */
  ringAcross: 20,
  /** `pool`: at most this many glints drawn; one under `minAlpha` hides. */
  glints: { perPond: 2, color: 'snow', periodMs: 1800, alpha: 0.8, pool: 16, minAlpha: 0.02 },
  /** Rings, glints and ley beads lie this far over 074's glows' depth (in this order, under everything standing). */
  depthOverGlow: { ring: 0.01, glint: 0.012, bead: 0.015 },
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
