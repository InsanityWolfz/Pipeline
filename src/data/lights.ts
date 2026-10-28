import type { Quality } from './settings';

// Dynamic lights (074): what gives light, its colour (palette id), radius (world px), intensity and priority (0 is kept
// first). Render reads sim state and events and places lights; they are looks only and never feed the sim. Light
// colours follow the theme rule: ley is cyan, fire ember, lightning storm violet; nothing else glows.

/** A source of light: by tier, kept by priority first, then by distance from the camera's centre. */
interface LightSource {
  /** One colour, or one per damage type (blasts). */
  readonly color: string | Readonly<Record<string, string>>;
  /** World px; for `burst` and `ley`, × the blast's or the glow's own radius. */
  readonly radius: number;
  readonly intensity: number;
  readonly priority: number;
  readonly tiers: readonly Quality[];
  /** A timed light's life, ms (it fades out over it). */
  readonly ms?: number;
  /** The face glow's flare on a shot: × `flare` for `flareMs`. */
  readonly flare?: number;
  readonly flareMs?: number;
  /** How far above its point the light sits, px (the face in the hood, a rod's crown). */
  readonly rise?: number;
  /** Fires: a radius per kind, and the flicker (± share) and its rate (Hz); the kilns' and chimneys' placing. */
  readonly radii?: Readonly<Record<string, number>>;
  readonly kiln?: { readonly rise: number; readonly perTile: number; readonly max: number };
  readonly chimney?: { readonly rises: readonly number[]; readonly intensity: number; readonly stumpRise: number };
  readonly flicker?: number;
  readonly flickerHz?: number;
  /** Ley lines: a light every this many tiles along a line, by tier. */
  readonly every?: Readonly<Partial<Record<Quality, number>>>;
}

const LIT: readonly Quality[] = ['medium', 'high'];

export const LIGHT_SOURCES = {
  /** The wanderer's face glow; it flares × `flare` for `flareMs` on each shot. */
  face: { color: 'cyan', radius: 48, intensity: 0.8, priority: 0, tiers: LIT, flare: 1.6, flareMs: 120, rise: 30 },
  /** The muzzle flash on each volley (`shots` events). */
  muzzle: { color: 'cyan-glow', radius: 64, intensity: 1.2, priority: 1, tiers: LIT, ms: 80 },
  /** The Conductor's blink, arc lash, storm-call strikes and rod chain. */
  conductor: { color: 'storm-glow', radius: 96, intensity: 1.4, priority: 1, tiers: LIT, ms: 200 },
  /** The Forgewright's vents (its core while it vents) and heat flood, while they burn. */
  forgewright: { color: 'cinder', radius: 88, intensity: 1.2, priority: 1, tiers: LIT },
  /** Lightning striking a storm rod (the Rod Field), lit `rise` px up the rod. */
  rodStrike: { color: 'storm-pale', radius: 112, intensity: 1.5, priority: 1, tiers: LIT, ms: 200, rise: 40 },
  /** Blasts (`bursts` events), coloured by damage type; radius × the blast's. */
  burst: { color: { physical: 'cyan-glow', fire: 'cinder', cold: 'foam', lightning: 'storm-glow' }, radius: 1.5, intensity: 1, priority: 2, tiers: LIT, ms: 150 },
  /**
   * Fires: braziers, flaring Emberworks vents, burning ground; a ±`flicker` flicker. 074.7: the Emberworks' kiln mouths
   * and chimney tops too: a light per row of kilns side by side, `kiln.rise` px up from their feet, its radius `kiln`
   * plus `kiln.perTile` a kiln past the first (at most `kiln.max`); a light at each chimney's lip, `chimney.rises` px up
   * by its look (the frame emberworksTiles picks; 077: a broken stump's at its own lip, `stumpRise`).
   */
  fire: {
    color: 'cinder',
    radius: 64,
    radii: { brazier: 64, vent: 72, ground: 40, kiln: 60, chimney: 40 },
    kiln: { rise: 10, perTile: 14, max: 104 },
    chimney: { rises: [76, 68] as const, intensity: 0.7, stumpRise: 36 },
    intensity: 0.9,
    priority: 2,
    tiers: LIT,
    flicker: 0.15,
    flickerHz: 7,
  },
  /** Ley crystals, veins, pylons and Ley Springs, in their GLOWS colour, radius × theirs, breathing with today's glows. */
  ley: { color: 'cyan', radius: 1.5, intensity: 0.7, priority: 3, tiers: LIT },
  /** Ley lines: a light every `every` tiles (by tier) along each line in view. */
  leyLine: { color: 'cyan', radius: 40, intensity: 0.5, priority: 3, tiers: LIT, every: { medium: 6, high: 3 } },
} as const satisfies Record<string, LightSource>;

/** 079: the foundry's own sources: its wall fires (braziers and torches), the intake's mouth, and working forge machines. */
export type FoundryLightSource = 'wall' | 'intake' | 'forge';

export type LightSourceId = keyof typeof LIGHT_SOURCES | 'round' | FoundryLightSource;

/** Rounds in flight (High only): ley bolts cyan, fire, cold and lightning rounds their type's colour; plain arrows and bombs none. */
export const ROUND_LIGHTS = {
  radius: 28,
  intensity: 0.7,
  priority: 4,
  tiers: ['high'] as readonly Quality[],
  byType: { fire: 'cinder', cold: 'foam', lightning: 'storm-glow' } as Readonly<Record<string, string>>,
  byAmmo: { 'ley-bolt': 'cyan' } as Readonly<Record<string, string>>,
} as const;

/** The most lights in view per tier; the game config's `render.maxLights` is High's. */
export const LIGHT_BUDGET: Readonly<Record<Quality, number>> = { low: 0, medium: 8, high: 16 };

/**
 * A light's height over the ground, × its radius. Phaser's lights shade a flat surface by the angle to the light, so a
 * low light (its default, 0.1) is a hot pin-point; this height gives a soft pool that reaches about its radius.
 */
export const LIGHT_Z = 0.45;

/**
 * The light catch: an enemy, the player or a ground item inside a light's radius gets an additive copy of its frame in
 * the light's colour, its alpha the light's falloff at the feet (× `gain`), from the `nearest` lights, at most `maxAlpha`.
 */
export const LIGHT_CATCH = { maxAlpha: 0.35, nearest: 2, gain: 0.5, tiers: LIT } as const;

/**
 * What each Graphics quality tier turns on: whether lights are placed at all; how they light the ground (`pools`: a
 * soft additive pool of each light's colour on the ground, a few quads; `litGround`: Phaser's per-pixel lighting) and
 * the props (`litProps`); the light catch, fog layers and lightning's ambient flash. (074.13: Medium lights the ground
 * with pools, so the default costs about what Low does even on a software renderer; High uses Phaser's lighting.)
 */
export const QUALITY_LOOK: Readonly<Record<Quality, { lights: boolean; pools: boolean; litGround: boolean; litProps: boolean; catch: boolean; fog: number; flash: boolean }>> = {
  low: { lights: false, pools: false, litGround: false, litProps: false, catch: false, fog: 0, flash: false },
  medium: { lights: true, pools: true, litGround: false, litProps: false, catch: true, fog: 1, flash: true },
  high: { lights: true, pools: false, litGround: true, litProps: true, catch: true, fog: 2, flash: true },
};

/**
 * Medium's light pools: a soft radial texture `size` px across (white, its alpha falling off as Phaser's lights do,
 * 1 − (d/r)²), drawn additively in the light's colour at `alpha` × the light's intensity (at most `maxAlpha`), just
 * over the ground and under the glows, fog and everything standing.
 */
export const LIGHT_POOL = { size: 128, alpha: 0.3, maxAlpha: 0.55 } as const;

/**
 * 077: the set pieces that give light (Medium and High), placed where each piece's art says (`lightAt` in
 * src/data/setPieces.ts): the Ley Tower's cracked crystal is a ley light (breathing with 014's glows), the Great
 * Furnace's mouth and the Great Crucible's glow are fires (flickering ±15%). The other set pieces give none.
 */
/** 077: a set piece's breathing light (the Ley Tower's crystal) swings between `floor` and 1 of its intensity, on the glows' beat `stagger` beats along. */
export const SET_PIECE_BREATHE = { floor: 0.75, stagger: 5 } as const;

export const SET_PIECE_LIGHTS: Readonly<Record<string, { readonly source: 'ley' | 'fire'; readonly color: string; readonly radius: number; readonly intensity: number; readonly priority: number; readonly flicker?: boolean }>> = {
  'ley-tower': { source: 'ley', color: 'cyan', radius: 96, intensity: 0.7, priority: 3 },
  'great-furnace': { source: 'fire', color: 'cinder', radius: 96, intensity: 0.9, priority: 2, flicker: true },
  'great-crucible': { source: 'fire', color: 'cinder', radius: 72, intensity: 0.8, priority: 2, flicker: true },
};

/** 079: one of the foundry's lights: colour (palette id), radius px, intensity, ± flicker share at `flickerHz`, priority. */
export interface FoundryLight {
  readonly color: string;
  readonly radius: number;
  readonly intensity: number;
  readonly flicker: number;
  readonly flickerHz: number;
  readonly priority: number;
  /** How far above its point it sits, px: a machine's fire over its feet, a wall fire's flame over its prop's base. */
  readonly rise: number;
  /** Steady with Flashes off (the coil's lightning); a fire still flickers within ±15% (074.3). */
  readonly steadyWithoutFlashes?: boolean;
}

/**
 * 079: the foundry's lights (Medium and High, through 074's picker and budget). The room's own fires and the intake
 * are priority 2, so its look stays steady however many forges run; working forge machines on screen fill the rest of
 * the budget at priority 3, nearest the camera's centre first.
 * - `walls`: by a prop's `light` key (src/data/props.ts): the two braziers (074's `fire.brazier`) and the four torches.
 * - `intake`: the pipe's mouth, its radius 1.5 × the intake's glow (`GLOWS.intake`), breathing and swelling with it.
 * - `machines`: by machine id, only while working and on screen.
 */
export const FOUNDRY_LIGHTS = {
  tiers: LIT,
  walls: {
    brazier: { color: 'cinder', radius: 64, intensity: 0.9, flicker: 0.15, flickerHz: 7, priority: 2, rise: 22 },
    torch: { color: 'cinder', radius: 48, intensity: 0.8, flicker: 0.15, flickerHz: 7, priority: 2, rise: 18 },
  } as Readonly<Record<string, FoundryLight>>,
  intake: { color: 'cyan-glow', radius: 1.5, intensity: 0.7, flicker: 0, flickerHz: 0, priority: 2, rise: 0 } as FoundryLight,
  machines: {
    smelter: { color: 'cinder', radius: 56, intensity: 0.9, flicker: 0.15, flickerHz: 7, priority: 3, rise: 10 },
    kiln: { color: 'cinder', radius: 56, intensity: 0.9, flicker: 0.15, flickerHz: 7, priority: 3, rise: 9 },
    'tempering-coil': { color: 'storm-glow', radius: 40, intensity: 0.7, flicker: 0.15, flickerHz: 11, priority: 3, rise: 12, steadyWithoutFlashes: true },
  } as Readonly<Record<string, FoundryLight>>,
} as const;
