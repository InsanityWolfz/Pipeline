// Feel tuning (014): screen shake, hit-stop, particles, damage numbers, the
// camera's lead, ambient light and motes. Render-only; nothing here touches the sim.

/** Camera shake by size: duration ms and intensity (fraction of the view). A smaller shake never cuts off a bigger one. */
export const SHAKE = {
  small: { ms: 60, intensity: 0.0025 },
  medium: { ms: 160, intensity: 0.007 },
  big: { ms: 320, intensity: 0.014 },
} as const;

/** Hit-stop: how long a struck enemy's sprite holds still, ms (about 3 frames at 60 Hz). */
export const HIT_STOP_MS = 50;

/**
 * Damage numbers: they pop from `pop` to `scale`, then rise and fade. Colour by
 * who took the hit; a dark outline keeps them readable over a white flash. Numbers
 * that land near each other within `stackMs` stack upward by `stackPx`.
 */
export const DAMAGE_NUMBERS = {
  rise: 16,
  lifeMs: 700,
  scale: 2,
  pop: 3,
  enemy: 'white',
  player: 'ember-light',
  outline: 'outline',
  /** Start this far above the hit point, px: enemies, and the player. */
  enemyAbove: 24,
  playerAbove: 30,
  jitter: 8,
  stackPx: 12,
  stackMs: 400,
  stackNear: 24,
} as const;

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
  size: 1 | 2 | 3;
  /** Rise into the air, px (drawn above the ground point). */
  lift?: number;
}

// Daylight colours (016).
export const PARTICLES = {
  hitPhysical: { colors: ['snow', 'rock-pale', 'gold-trim'], count: 14, speed: [60, 150], gravity: 220, lifeMs: [220, 380], size: 2, lift: 12 },
  hitFire: { colors: ['cinder-light', 'cinder', 'gold-trim'], count: 16, speed: [50, 140], gravity: -60, lifeMs: [260, 460], size: 2, lift: 12 },
  hitPlayer: { colors: ['cinder', 'flame-dark', 'snow'], count: 12, speed: [40, 120], gravity: 180, lifeMs: [200, 360], size: 2, lift: 14 },
  deathMotes: { colors: ['cyan', 'cyan-glow', 'cyan-deep'], count: 26, speed: [10, 50], gravity: -70, lifeMs: [600, 1100], size: 2, lift: 10 },
  embers: { colors: ['cinder-light', 'cinder', 'gold-trim', 'flame-dark'], count: 44, speed: [30, 120], gravity: -45, lifeMs: [500, 1100], size: 3 },
  footDust: { colors: ['dirt-light', 'dirt'], count: 2, speed: [6, 18], gravity: -10, lifeMs: [200, 320], size: 1 },
  rollDust: { colors: ['dirt-light', 'dirt', 'rock-pale'], count: 4, speed: [10, 35], gravity: -15, lifeMs: [250, 420], size: 2 },
  // Each node type reacts as it's worked (018): leaves off a tree, chips off a boulder, cut stalks, ley sparks.
  harvestLeaves: { colors: ['leaf', 'leaf-light', 'leaf-dark'], count: 9, speed: [20, 60], gravity: 70, lifeMs: [500, 900], size: 2, lift: 34 },
  harvestChips: { colors: ['rock-light', 'rock', 'rock-pale'], count: 8, speed: [40, 90], gravity: 260, lifeMs: [250, 420], size: 2, lift: 8 },
  harvestStalks: { colors: ['leaf-dark', 'leaf', 'straw'], count: 6, speed: [15, 45], gravity: 140, lifeMs: [400, 700], size: 2, lift: 16 },
  harvestSparks: { colors: ['cyan-glow', 'cyan', 'snow'], count: 10, speed: [40, 110], gravity: 120, lifeMs: [200, 380], size: 1, lift: 10 },
  craftPuff: { colors: ['rock-pale', 'dirt-light', 'dirt'], count: 6, speed: [8, 24], gravity: -50, lifeMs: [400, 650], size: 2, lift: 14 },
  refill: { colors: ['cyan', 'cyan-glow'], count: 5, speed: [10, 30], gravity: -60, lifeMs: [300, 500], size: 1, lift: 6 },
  pickup: { colors: ['gold-trim', 'cyan-glow', 'snow'], count: 8, speed: [20, 55], gravity: -40, lifeMs: [250, 450], size: 2, lift: 6 },
  place: { colors: ['dirt', 'dirt-light'], count: 6, speed: [20, 50], gravity: 60, lifeMs: [200, 320], size: 1 },
} as const satisfies Record<string, ParticleBurst>;

/** The burst each node type gives off while worked and when a harvest lands (018). */
export const HARVEST_BURSTS: Readonly<Record<string, keyof typeof PARTICLES>> = {
  tree: 'harvestLeaves',
  rubble: 'harvestChips',
  reeds: 'harvestStalks',
  'ley-vein': 'harvestSparks',
};

/** While a node is worked: a small burst this often, ms; a tree shakes this far either way, px, this many times a second. */
export const HARVEST_WORK = { burstMs: 220, shakePx: 1.5, shakeHz: 9 } as const;

/** Footstep dust every this many ms of walking, roll dust every this many ms of rolling; walking is moving faster than `minSpeed` px/tick. */
export const DUST = { walkMs: 260, rollMs: 50, minSpeed: 0.2 } as const;

/** Squash and stretch: the drop-in on placed pieces. The squash settles `settle` × `ms`. */
export const SQUASH = { dropPx: 6, ms: 180, squash: 0.18, settle: 1.5 } as const;

/** Ambient life: ley motes per room, and how they drift and flicker. */
export const AMBIENT = {
  motes: 18,
  moteSpeed: [4, 10] as const,
  moteColors: ['ley-cyan', 'ley-glow'] as const,
  /** Sway speed (radians/s) and size (px/s). */
  moteSway: { rate: 0.8, x: 3, y: 2, flicker: 1.3, minAlpha: 0.25, alphaRange: 0.5 },
  glowBreatheMs: 2200,
  glowAlpha: [0.55, 0.9] as const,
  /** Motes sway up and down at this fraction of their side-to-side rate. */
  swayYSkew: 0.7,
  /** Each glow breathes this far out of step with the one before (0–1). */
  glowStagger: 0.37,
} as const;

/** The glow texture: its radius px, the alpha steps it falls off in (so it stays crisp), and its peak alpha. */
export const GLOW_TEXTURE = { radius: 32, bands: 5, alpha: 0.6 } as const;

/** Ley light around things that aren't props: palette colour and radius, px. A refilling socket's glow swells by `pulse`. */
export const GLOWS = {
  crystal: { color: 'ley-cyan', radius: 30 },
  vein: { color: 'ley-cyan', radius: 22 },
  pylon: { color: 'ley-glow', radius: 44 },
  conduitItem: { color: 'ley-cyan', radius: 9 },
  tube: { color: 'ley-cyan', radius: 14 },
  socket: { color: 'ley-glow', radius: 20, pulse: 1.4 },
} as const;

/** The dusk tint over each room (a palette id and alpha). */
export const ROOM_MOOD: Readonly<Record<string, { tint: string; alpha: number }>> = {
  // Daylight outside (017): a faint warm wash, no dusk.
  overworld: { tint: 'sun', alpha: 0.04 },
  foundry: { tint: 'ember-dark', alpha: 0.08 },
};

/** The vignette: edge darkness, and where the darkening starts (fraction of the corner distance). */
export const VIGNETTE = { alpha: 0.55, inner: 0.45 } as const;
