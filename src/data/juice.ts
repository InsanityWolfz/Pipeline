import type { Quality } from './settings';
import { WEATHER_CAP } from './weather';

// Feel tuning (014): screen shake, hit-stop, particles, damage numbers, the
// camera's lead, ambient light and motes. Render-only; nothing here touches the sim.

/** Whether the camera ever shakes. Off (Shaun, 2026-10-20: "turn off the screen shake entirely"); the shake requests are still logged for tests. */
export const SHAKE_ON = false;

/** Camera shake by size: duration ms and intensity (fraction of the view). A smaller shake never cuts off a bigger one. */
export const SHAKE = {
  small: { ms: 60, intensity: 0.0025 },
  medium: { ms: 160, intensity: 0.007 },
  big: { ms: 320, intensity: 0.014 },
} as const;

/**
 * 080: the only screen shake the game makes, once per boss intro, on its beat's first tick, on the world camera only
 * (Shaun, 2026-10-27: "the only time a screen shake makes sense is like during a boss spawn animation"). Off with
 * Flashes off (the "Flashes and shake" row) or a system asking for reduced motion. `SHAKE_ON` stays false for 014's.
 * About ±3.8 px across and ±2.2 px down at 640×360 for the full intro.
 */
export const INTRO_SHAKE = {
  full: { ms: 300, intensity: 0.006 },
  short: { ms: 200, intensity: 0.004 },
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
  enemy: 'snow',
  player: 'cinder-light',
  outline: 'ink',
  /** Start this far above the hit point, px: enemies, and the player. */
  enemyAbove: 24,
  playerAbove: 30,
  jitter: 8,
  stackPx: 12,
  stackMs: 400,
  stackNear: 24,
  /** 060: a burn's beat, `scale` the size of a hit's, in ember. */
  burn: { scale: 0.65, color: 'cinder-light' },
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
  // A cold hit (029): frost flakes that drift down.
  hitCold: { colors: ['foam', 'snow', 'water-light'], count: 14, speed: [40, 110], gravity: 90, lifeMs: [300, 520], size: 2, lift: 12 },
  // 060: a fire hit throws sparks that rise; a burn's catch, a puff of embers.
  // 064: a lightning hit spits pale cyan sparks.
  hitLightning: { colors: ['snow', 'cyan-glow', 'storm-glow'], count: 12, speed: [70, 160], gravity: 60, lifeMs: [160, 320], size: 2, lift: 12 },
  hitFire: { colors: ['cinder-light', 'cinder', 'flame-dark'], count: 12, speed: [40, 110], gravity: -60, lifeMs: [260, 460], size: 2, lift: 12 },
  ignite: { colors: ['cinder-light', 'cinder', 'gold-trim'], count: 8, speed: [15, 45], gravity: -90, lifeMs: [350, 600], size: 2, lift: 16 },
  // A frozen enemy cracking free (029): chips of ice flung out and falling.
  thawShards: { colors: ['foam', 'snow', 'water-light', 'rock-pale'], count: 18, speed: [50, 130], gravity: 240, lifeMs: [300, 520], size: 3, lift: 16 },
  // Rime flaking off a cluster as it's worked (029).
  harvestRime: { colors: ['foam', 'snow', 'water-light'], count: 12, speed: [30, 90], gravity: 160, lifeMs: [350, 600], size: 2, lift: 14 },
  hitPlayer: { colors: ['cinder', 'flame-dark', 'snow'], count: 12, speed: [40, 120], gravity: 180, lifeMs: [200, 360], size: 2, lift: 14 },
  embers: { colors: ['cinder-light', 'cinder', 'gold-trim', 'flame-dark'], count: 44, speed: [30, 120], gravity: -45, lifeMs: [500, 1100], size: 3 },
  footDust: { colors: ['dirt-light', 'dirt'], count: 2, speed: [6, 18], gravity: -10, lifeMs: [200, 320], size: 1 },
  rollDust: { colors: ['dirt-light', 'dirt', 'rock-pale'], count: 4, speed: [10, 35], gravity: -15, lifeMs: [250, 420], size: 2 },
  // Each node type reacts as it's worked (018): leaves off a tree, chips off a boulder, cut stalks, ley sparks.
  harvestLeaves: { colors: ['leaf-light', 'leaf-pale', 'sun'], count: 12, speed: [25, 70], gravity: 70, lifeMs: [600, 1000], size: 3, lift: 40 },
  harvestChips: { colors: ['rock-pale', 'snow', 'rock-light'], count: 10, speed: [50, 110], gravity: 260, lifeMs: [300, 480], size: 3, lift: 14 },
  harvestStalks: { colors: ['leaf-light', 'straw-light', 'straw'], count: 8, speed: [20, 55], gravity: 140, lifeMs: [500, 800], size: 3, lift: 22 },
  // 049: amber beads off a resin seep.
  harvestResin: { colors: ['resin-light', 'resin', 'resin-dark'], count: 10, speed: [25, 70], gravity: 200, lifeMs: [350, 600], size: 2, lift: 10 },
  harvestSparks: { colors: ['cyan-glow', 'cyan', 'snow'], count: 14, speed: [50, 130], gravity: 120, lifeMs: [250, 450], size: 2, lift: 14 },
  craftPuff: { colors: ['rock-pale', 'dirt-light', 'dirt'], count: 6, speed: [8, 24], gravity: -50, lifeMs: [400, 650], size: 2, lift: 14 },
  refill: { colors: ['cyan', 'cyan-glow'], count: 5, speed: [10, 30], gravity: -60, lifeMs: [300, 500], size: 1, lift: 6 },
  // 033: a schematic landing, a burst of ley and gold sparks under its pillar.
  schematic: { colors: ['cyan-glow', 'cyan', 'gold-trim', 'snow'], count: 18, speed: [40, 120], gravity: 60, lifeMs: [400, 800], size: 2, lift: 8 },
  // A side entrance's cap lifting off (024): brass flecks and ley sparks from the inlet.
  capLift: { colors: ['brass-light', 'gold-trim', 'cyan-glow', 'snow'], count: 16, speed: [30, 90], gravity: 90, lifeMs: [350, 650], size: 2, lift: 4 },
  pickup: { colors: ['gold-trim', 'cyan-glow', 'snow'], count: 8, speed: [20, 55], gravity: -40, lifeMs: [250, 450], size: 2, lift: 6 },
  place: { colors: ['dirt', 'dirt-light'], count: 6, speed: [20, 50], gravity: 60, lifeMs: [200, 320], size: 1 },
  // 034: a shot ringing off a shield (brass sparks), an enemy bomb bursting (stone and red embers), the Bulwark's pound
  // (a ring of grey-blue dust), and the Hollows' barrier breaking into cyan shards.
  blockSpark: { colors: ['brass-light', 'brass', 'gold-trim', 'snow'], count: 22, speed: [70, 170], gravity: 200, lifeMs: [180, 340], size: 3, lift: 20 },
  enemyBurst: { colors: ['danger', 'cinder', 'hollow-light', 'hollow'], count: 26, speed: [40, 130], gravity: 120, lifeMs: [300, 650], size: 3 },
  poundDust: { colors: ['hollow-pale', 'hollow-light', 'hollow'], count: 36, speed: [60, 150], gravity: -20, lifeMs: [400, 800], size: 3 },
  // 041: the Bulwark's rear stomp, a smaller pound's dust.
  // 041.16: the back wave breaking off its back, a spray of steam and grit.
  waveSpray: { colors: ['snow', 'hollow-pale', 'hollow-light'], count: 20, speed: [50, 130], gravity: -10, lifeMs: [250, 500], size: 2 },
  stompDust: { colors: ['hollow-pale', 'hollow-light', 'hollow'], count: 18, speed: [40, 110], gravity: -20, lifeMs: [300, 600], size: 2 },
  barrierShards: { colors: ['cyan', 'cyan-glow', 'snow'], count: 40, speed: [20, 90], gravity: 160, lifeMs: [500, 1000], size: 2, lift: 40 },
  // 060: a cinder vent flaring open, embers and ash rising out of its mouth.
  ventFlare: { colors: ['cinder-light', 'cinder', 'flame-dark', 'ash-pale'], count: 24, speed: [30, 110], gravity: -80, lifeMs: [400, 800], size: 2, lift: 18 },
  /** 064: a storm rod struck by lightning (sparks and glass glints off its crown), and its stormglass chipping off. */
  rodStrike: { colors: ['snow', 'cyan-glow', 'cyan', 'storm-glow'], count: 26, speed: [60, 170], gravity: 120, lifeMs: [200, 500], size: 2, lift: 56 },
  harvestStormglass: { colors: ['storm-pale', 'cyan-glow', 'storm-glow'], count: 10, speed: [30, 90], gravity: 200, lifeMs: [250, 450], size: 2, lift: 10 },
  /** 060: a Forgewright's bellows bursting (leather scraps and sparks), its hammer slam's dust, its flood spreading. */
  bellowsBurst: { colors: ['leather', 'wood-light', 'cinder-light', 'cinder'], count: 26, speed: [50, 140], gravity: 160, lifeMs: [300, 600], size: 3, lift: 10 },
  slamDust: { colors: ['ash-pale', 'ash-light', 'ash', 'cinder'], count: 34, speed: [60, 150], gravity: -20, lifeMs: [400, 800], size: 3 },
  floodFlare: { colors: ['cinder-light', 'cinder', 'flame-dark'], count: 40, speed: [20, 90], gravity: -90, lifeMs: [500, 1000], size: 3, lift: 6 },
  // 038: a landmine bursting (iron shards and ley sparks) and a cluster bomb's bomblets popping (a few embers).
  mineShards: { colors: ['iron-light', 'iron', 'cyan-glow', 'snow'], count: 30, speed: [60, 160], gravity: 200, lifeMs: [220, 480], size: 2, lift: 6 },
  bombletEmbers: { colors: ['cinder-light', 'cinder', 'gold-trim'], count: 12, speed: [30, 90], gravity: -30, lifeMs: [300, 600], size: 2 },
  // 035: a Charger's hooves kicking dust down its lane and its slam into a wall; a Burrower's ripple trailing dust and
  // its eruption throwing up rock; a Shardback's bash; the flash at a Sniper's lens as it fires.
  chargeDust: { colors: ['hollow-pale', 'hollow-light'], count: 4, speed: [10, 40], gravity: -10, lifeMs: [250, 450], size: 2 },
  chargeImpact: { colors: ['hollow-pale', 'hollow-light', 'hollow', 'brass'], count: 26, speed: [50, 140], gravity: 160, lifeMs: [250, 550], size: 3, lift: 14 },
  rippleDust: { colors: ['hollow-light', 'hollow', 'hollow-pale'], count: 3, speed: [8, 30], gravity: -6, lifeMs: [300, 550], size: 2 },
  eruption: { colors: ['hollow-dark', 'hollow', 'hollow-light', 'hollow-pale'], count: 34, speed: [60, 170], gravity: 240, lifeMs: [300, 650], size: 3, lift: 4 },
  bashSpark: { colors: ['brass-light', 'brass', 'hollow-pale'], count: 14, speed: [40, 110], gravity: 120, lifeMs: [200, 380], size: 2, lift: 14 },
  boltFlash: { colors: ['danger', 'cinder-light', 'snow'], count: 10, speed: [30, 90], gravity: 40, lifeMs: [120, 260], size: 2, lift: 30 },
} as const satisfies Record<string, ParticleBurst>;

/**
 * 076: the ley motes a death dissolves into (src/render/deathMotes.ts): a count by the enemy's size class
 * (DEATH_SIZE), ×`champion` for a champion, ×`perEnemy` for some (the cinder mote's own burst plays too), ×the
 * Graphics quality's scale, thinned to the per-death cap, the live death-mote cap and what PARTICLE_BUDGET has left.
 * They rise from random points of the hurtbox in the family's colours, additive on Medium and High.
 */
export const DEATH_MOTES = {
  count: { small: 10, medium: 16, large: 24, boss: 60 },
  champion: 1.5,
  perEnemy: { 'cinder-mote': 0.5 } as Readonly<Record<string, number>>,
  quality: { low: 0.5, medium: 1, high: 1.5 },
  perDeathCap: { low: 30, medium: 60, high: 90 },
  liveCap: { low: 60, medium: 120, high: 200 },
  additive: { low: false, medium: true, high: true },
  speed: [10, 40] as const,
  gravity: -60,
  lifeMs: [700, 1200] as const,
  bossLifeMs: [1000, 1800] as const,
  size: 2,
  bossSize: 3,
} as const;

/** 076: live particles of every kind the moderate set allows, by Graphics quality. 078: every particle obeys it, by share. */
export const PARTICLE_BUDGET = { low: 150, medium: 300, high: 500 } as const;

const shares = (q: Quality) => ({ death: DEATH_MOTES.liveCap[q], weather: WEATHER_CAP[q], effect: PARTICLE_BUDGET[q] - DEATH_MOTES.liveCap[q] - WEATHER_CAP[q] });

/**
 * 078: the budget's three fixed shares (src/render/particleBudget.ts): 076's live death-mote cap, 077's weather cap (and
 * 014's room motes indoors), and what's left for every other effect (impacts, blasts, sparks, trail bits and 014's
 * bursts). Derived, not a number of its own: retuning 076 or 077 retunes it. No share lends its room to another.
 */
export const PARTICLE_SHARES: Readonly<Record<Quality, { readonly death: number; readonly weather: number; readonly effect: number }>> = { low: shares('low'), medium: shares('medium'), high: shares('high') };

/** The burst each node type gives off while worked and when a harvest lands (018). */
export const HARVEST_BURSTS: Readonly<Record<string, keyof typeof PARTICLES>> = {
  tree: 'harvestLeaves',
  rubble: 'harvestChips',
  reeds: 'harvestStalks',
  'ley-vein': 'harvestSparks',
  'rime-outcrop': 'harvestRime',
  // 034: ley-iron chips like stone.
  'ley-iron-seam': 'harvestChips',
  'resin-seep': 'harvestResin',
  // 060: cinderite breaking off a vent's crust in hot embers.
  'cinder-vent': 'bombletEmbers',
  // 064: stormglass chipping off a charged rod in pale glints.
  'storm-rod': 'harvestStormglass',
};

/** While a node is worked: a small burst this often, ms; a tree shakes this far either way, px, this many times a second. */
export const HARVEST_WORK = { burstMs: 220, shakeNodeId: 'tree', shakePx: 1.5, shakeHz: 9 } as const;

/** Footstep dust every this many ms of walking, roll dust every this many ms of rolling; walking is moving faster than `minSpeed` px/tick. */
export const DUST = { walkMs: 260, rollMs: 50, minSpeed: 0.2 } as const;

/** Squash and stretch: the drop-in on placed pieces. The squash settles `settle` × `ms`. */
export const SQUASH = { dropPx: 6, ms: 180, squash: 0.18, settle: 1.5 } as const;

/** Ambient life: ley motes per room, and how they drift and flicker. */
export const AMBIENT = {
  motes: 18,
  moteSpeed: [4, 10] as const,
  moteColors: ['cyan', 'cyan-glow'] as const,
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

/** Ley light around things that aren't props: palette colour and radius, px. The intake's glow (019) swells by `pulse` for `ms` as an item goes in. */
export const GLOWS = {
  crystal: { color: 'cyan', radius: 30 },
  vein: { color: 'cyan', radius: 22 },
  pylon: { color: 'cyan-glow', radius: 44 },
  conduitItem: { color: 'cyan', radius: 9 },
  /** Ley light pooling along every conduit (020). */
  conduit: { color: 'cyan', radius: 13 },
  tube: { color: 'cyan', radius: 14 },
  intake: { color: 'cyan-glow', radius: 40, pulse: 1.4, ms: 300 },
} as const;

/** While attuning (019), the tube's glow and then the intake's grow from nothing to this times their radius as their rings light, then settle. */
export const ATTUNE_GLOW_SWELL = 2.2;

/**
 * The tint over a room (a palette id and alpha): the foundry's warm forge glow over the sandstone (020), kept until 079.
 * 074: outside, the region's mood (src/data/moods.ts) washes the screen instead; the sandbox takes Region 1's.
 */
export const ROOM_MOOD: Readonly<Record<string, { tint: string; alpha: number }>> = {
  foundry: { tint: 'flame-dark', alpha: 0.1 },
};

/** The vignette: edge darkness, and where the darkening starts (fraction of the corner distance). */
export const VIGNETTE = { alpha: 0.55, inner: 0.45 } as const;

/**
 * A picked-up item (021) slides from where it lay into the player over this many ms, shrinking to
 * `endScale`, drawn over whatever stands between (a tree it lay behind). Cosmetic: the sim has already
 * moved it into the inventory.
 */
export const PICKUP_SLIDE = { ms: 140, endScale: 0.6 } as const;
