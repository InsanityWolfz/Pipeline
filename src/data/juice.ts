// Feel tuning (014): screen shake, hit-stop, particles, damage numbers and the
// camera's lead. Render-only; nothing here touches the sim.

/** Camera shake by size: duration ms and intensity (fraction of the view). */
export const SHAKE = {
  small: { ms: 60, intensity: 0.0025 },
  medium: { ms: 160, intensity: 0.007 },
  big: { ms: 320, intensity: 0.014 },
} as const;

/** Hit-stop, in frames the struck sprite holds still: a hit, and a kill. */
export const HIT_STOP = { hit: 2, kill: 4 } as const;

/** Damage numbers: rise px, life ms, the pop's peak scale, and colour by who took it (palette ids). */
export const DAMAGE_NUMBERS = { rise: 16, lifeMs: 700, scale: 2, pop: 3, enemy: 'gold', player: 'ember', outline: 'outline' } as const;

export interface ParticleBurst {
  /** Palette ids, picked at random per particle (render-side randomness is fine: it's not the sim). */
  colors: readonly string[];
  count: number;
  /** Speed range px/s and spread around `angle` (radians; omit for all round). */
  speed: readonly [number, number];
  angle?: number;
  spread?: number;
  /** Pull, px/s², positive is down. */
  gravity: number;
  lifeMs: readonly [number, number];
  /** Pixel size of each particle. */
  size: 1 | 2;
  /** Rise into the air, px (drawn above the ground point). */
  lift?: number;
}

export const PARTICLES = {
  hitPhysical: { colors: ['white', 'mist', 'gold'], count: 10, speed: [50, 130], gravity: 200, lifeMs: [200, 360], size: 2, lift: 12 },
  hitFire: { colors: ['ember-light', 'ember', 'gold'], count: 12, speed: [40, 120], gravity: -40, lifeMs: [240, 420], size: 2, lift: 12 },
  hitPlayer: { colors: ['ember', 'ember-dark', 'white'], count: 10, speed: [40, 110], gravity: 180, lifeMs: [200, 340], size: 2, lift: 14 },
  deathMotes: { colors: ['ley-cyan', 'ley-glow', 'ley-deep'], count: 26, speed: [10, 50], gravity: -70, lifeMs: [600, 1100], size: 2, lift: 10 },
  embers: { colors: ['ember-light', 'ember', 'gold', 'ember-dark'], count: 22, speed: [40, 140], gravity: -30, lifeMs: [300, 700], size: 2 },
  footDust: { colors: ['stone-pale', 'slate-light'], count: 2, speed: [6, 18], gravity: -10, lifeMs: [200, 320], size: 1 },
  rollDust: { colors: ['stone-pale', 'slate-light', 'mist'], count: 4, speed: [10, 35], gravity: -15, lifeMs: [250, 420], size: 2 },
  harvestChips: { colors: ['earth-light', 'earth', 'stone-pale'], count: 6, speed: [40, 90], gravity: 260, lifeMs: [250, 420], size: 1, lift: 8 },
  craftPuff: { colors: ['mist', 'stone-pale', 'slate-light'], count: 6, speed: [8, 24], gravity: -50, lifeMs: [400, 650], size: 2, lift: 14 },
  refill: { colors: ['ley-cyan', 'ley-glow'], count: 5, speed: [10, 30], gravity: -60, lifeMs: [300, 500], size: 1, lift: 6 },
  pickup: { colors: ['gold', 'ley-glow', 'white'], count: 8, speed: [20, 55], gravity: -40, lifeMs: [250, 450], size: 2, lift: 6 },
  place: { colors: ['slate-light', 'stone-pale'], count: 6, speed: [20, 50], gravity: 60, lifeMs: [200, 320], size: 1 },
} as const satisfies Record<string, ParticleBurst>;

/** Footstep dust every this many ms of walking; roll dust every this many ms of rolling. */
export const DUST_EVERY_MS = { walk: 260, roll: 50 } as const;

/** The camera leads toward the aim by up to this many px, easing at this rate per frame. */
export const CAMERA_LEAD = { px: 22, ease: 0.08 } as const;

/** Squash and stretch: the drop-in on placed pieces and the squash on deposits. */
export const SQUASH = { dropPx: 6, ms: 180, squash: 0.18 } as const;

/** Ambient life: ley motes per room, fireflies in the clearing, and the glow breathing rate. */
export const AMBIENT = {
  motes: 18,
  moteSpeed: [4, 10] as const,
  fireflies: 10,
  glowBreatheMs: 2200,
  glowAlpha: [0.55, 0.9] as const,
} as const;

/** The dusk tint over each room (a palette id and alpha) and the vignette's edge darkness. */
export const ROOM_MOOD: Readonly<Record<string, { tint: string; alpha: number }>> = {
  clearing: { tint: 'violet', alpha: 0.1 },
  'ruin-hall': { tint: 'shadow-violet', alpha: 0.14 },
  foundry: { tint: 'ember-dark', alpha: 0.08 },
  shrine: { tint: 'teal-deep', alpha: 0.16 },
};
export const VIGNETTE_ALPHA = 0.55;

/** Ley light around things that aren't props: palette colour and radius, px. */
export const GLOWS = {
  crystal: { color: 'ley-cyan', radius: 30 },
  vein: { color: 'ley-cyan', radius: 22 },
  pylon: { color: 'ley-glow', radius: 44 },
  conduitItem: { color: 'ley-cyan', radius: 9 },
  tube: { color: 'ley-cyan', radius: 14 },
  socket: { color: 'ley-glow', radius: 20 },
} as const;

/** The camera only leads toward the aim while firing, and for this long after, ms. */
export const LEAD_HOLD_MS = 600;
