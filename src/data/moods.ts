import type { Ring } from './ringScale';
import { WORLD_SHAPE } from './worldShape';

// Region moods (074): the light each danger ring's world sits in. Render reads it; the sim never does. Region 1 is
// sunny (Realm of the Mad God), Stonefall Hollows dusky, the Emberworks orange through smoke, the Stormcrown dark (Hollow
// Knight); the dark regions are tuned toward the approved "Ley-lit" card (docs/art/style-test-2.html; 074 review). Only the world layer (ground, props, nodes) takes the ambient; the readability layer (enemies, telegraphs,
// rounds, items, the player, the HUD) never does. Every colour is a palette id.

export interface RegionMood {
  readonly name: string;
  /** The light the world layer sits in: white toward `color` by `darkness` (0 full white light, 1 the colour itself). */
  readonly ambient: { readonly color: string; readonly darkness: number };
  /** The screen wash over everything but the HUD (014's mood tint), so capped at 0.06. */
  readonly wash: { readonly color: string; readonly alpha: number };
  /** A soft haze hugging the ground, drifting `speed` px/s, or none. */
  readonly fog: { readonly color: string; readonly alpha: number; readonly speed: number } | null;
  /** The region's ley, fire and accent light colours. */
  readonly lights: { readonly ley: string; readonly fire: string; readonly accent: string };
  /** How strongly lights show: daylight drowns them, the dark lets them read. Each light's intensity is multiplied by it. */
  readonly lightScale: number;
}

const SUNNY: RegionMood = {
  name: 'sunny',
  ambient: { color: 'sun', darkness: 0.08 },
  wash: { color: 'sun', alpha: 0.04 },
  fog: null,
  lights: { ley: 'cyan', fire: 'cinder', accent: 'sun' },
  lightScale: 0.3,
};

/** One mood per danger ring: Region 1's three share the sunny one, so there is no blend inside Region 1. */
export const REGION_MOODS: Readonly<Record<Ring, RegionMood>> = {
  0: SUNNY,
  1: SUNNY,
  2: SUNNY,
  3: {
    name: 'dusk',
    ambient: { color: 'hollow', darkness: 0.7 },
    wash: { color: 'hollow-dark', alpha: 0.04 },
    fog: { color: 'hollow-dark', alpha: 0.1, speed: 4 },
    lights: { ley: 'cyan', fire: 'cinder', accent: 'vein' },
    lightScale: 1,
  },
  4: {
    name: 'smoke',
    ambient: { color: 'rust-dark', darkness: 0.6 },
    wash: { color: 'flame-dark', alpha: 0.06 },
    fog: { color: 'ash-dark', alpha: 0.15, speed: 6 },
    lights: { ley: 'cyan', fire: 'cinder', accent: 'cinder-light' },
    lightScale: 1.2,
  },
  5: {
    name: 'storm',
    ambient: { color: 'storm-dark', darkness: 0.85 },
    wash: { color: 'storm-dark', alpha: 0.06 },
    fog: { color: 'storm-dark', alpha: 0.1, speed: 12 },
    lights: { ley: 'cyan', fire: 'cinder', accent: 'storm-glow' },
    lightScale: 1.8,
  },
};

/**
 * 079: the foundry's mood, a warm torch- and forge-lit workshop: amber air (about #f7cb9b) dim enough for its fires to
 * read, far brighter than the Hollows; a light warm wash (the ambient carries the warmth, so it is under 074's cap); no
 * fog, so the build grid stays crisp. LightingView uses it whenever the foundry is shown.
 */
export const FOUNDRY_MOOD: RegionMood = {
  name: 'foundry',
  ambient: { color: 'resin', darkness: 0.55 },
  wash: { color: 'flame-dark', alpha: 0.05 },
  fog: null,
  lights: { ley: 'cyan', fire: 'cinder', accent: 'brass-light' },
  lightScale: 1,
};

/**
 * The mood follows the camera's centre and blends over `tiles` each side of a region's edge, so walking between regions
 * has no hard cut. `steps`: the blend is quantised to this many steps across a band, so the props' mood tint is set
 * again only a few times on the way across, never every frame.
 */
export const MOOD_BLEND = { tiles: 4, steps: 16 } as const;

/**
 * The region edges the mood blends across, tiles from the foundry's door: where each region's own ground starts (the
 * barrier's circle, the Hollows' cliff edge, the Emberworks' cliff edge), with the ring inside and the ring outside.
 */
export const MOOD_EDGES: readonly { readonly radius: number; readonly inner: Ring; readonly outer: Ring }[] = [
  { radius: WORLD_SHAPE.region1, inner: 2, outer: 3 },
  { radius: WORLD_SHAPE.hollows, inner: 3, outer: 4 },
  { radius: WORLD_SHAPE.emberworks, inner: 4, outer: 5 },
];

/**
 * Lightning's flash (Stormcrown): a rod struck or the Conductor's strikes landing lift the ambient toward `color` at
 * `darkness` for `holdMs`, then it eases back over `easeMs`. With Flashes off (042.10) there is none. Tinted props and
 * ground take the flash in `steps` steps (so the props' tint is set again a few times a strike, not every frame).
 */
export const LIGHTNING_FLASH = { color: 'storm-pale', darkness: 0.3, holdMs: 120, easeMs: 400, steps: 4 } as const;

/**
 * The fog (074): a tileable texture `size` px square of soft wisps (two octaves of value noise on `cells` lattices,
 * clear below `floor`), made once and tiled over the view. Each layer is drawn `scale`× and drifts along `dir` at the
 * mood's speed × `speed`, its alpha the mood's × `alpha`. Medium draws the first layer; High both, drifting apart.
 */
export const FOG_LOOK = {
  size: 256,
  cells: [4, 8] as const,
  floor: 0.18,
  layers: [
    { scale: 3, dir: [1, 0.25] as const, speed: 1, alpha: 1 },
    { scale: 2, dir: [-0.6, 0.8] as const, speed: 0.7, alpha: 0.7 },
  ],
} as const;
