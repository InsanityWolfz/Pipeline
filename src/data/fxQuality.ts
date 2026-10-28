import type { PARTICLES } from './juice';
import type { Quality } from './settings';

// 078: how the effect particles share their room, and what each Graphics quality tier draws (src/render/particleBudget.ts,
// src/render/fx/). Render only.

export type FxPriority = 'cue' | 'shot' | 'soft';

/** 078's own bursts, by name, beside 014's `PARTICLES` keys. */
export type FxBurstName = 'impact' | 'end' | 'blast' | 'muzzle' | 'machineSparks' | 'trailBits' | 'landingDust';

/**
 * Each burst's priority inside the effect share. Cues (enemy and boss attacks, hazards, a hit on the player, a shot
 * ringing off a shield) use all of it; shots (078's impacts, blasts and muzzle sparks, freezes, thaws, ignites,
 * harvests, pickups and the foundry's bursts) only while it is under 85% full; soft bits (trail bits, landing dust,
 * footsteps) under 50%. A call site that plays an enemy's attack with another key passes `cue`.
 */
export const FX_PRIORITY: Readonly<Record<keyof typeof PARTICLES | FxBurstName, FxPriority>> = {
  enemyBurst: 'cue',
  poundDust: 'cue',
  stompDust: 'cue',
  waveSpray: 'cue',
  chargeDust: 'cue',
  chargeImpact: 'cue',
  rippleDust: 'cue',
  eruption: 'cue',
  bashSpark: 'cue',
  boltFlash: 'cue',
  ventFlare: 'cue',
  slamDust: 'cue',
  floodFlare: 'cue',
  bellowsBurst: 'cue',
  rodStrike: 'cue',
  barrierShards: 'cue',
  blockSpark: 'cue',
  hitPlayer: 'cue',
  hitPhysical: 'shot',
  hitCold: 'shot',
  hitFire: 'shot',
  hitLightning: 'shot',
  ignite: 'shot',
  thawShards: 'shot',
  embers: 'shot',
  mineShards: 'shot',
  bombletEmbers: 'shot',
  harvestRime: 'shot',
  harvestLeaves: 'shot',
  harvestChips: 'shot',
  harvestStalks: 'shot',
  harvestResin: 'shot',
  harvestSparks: 'shot',
  harvestStormglass: 'shot',
  craftPuff: 'shot',
  refill: 'shot',
  schematic: 'shot',
  capLift: 'shot',
  pickup: 'shot',
  place: 'shot',
  impact: 'shot',
  end: 'shot',
  blast: 'shot',
  muzzle: 'shot',
  machineSparks: 'shot',
  footDust: 'soft',
  rollDust: 'soft',
  trailBits: 'soft',
  landingDust: 'soft',
};

/** How full the effect share may be for a priority to spawn: cues to the top, shots to 85%, soft bits to 50%. */
export const FX_THRESHOLDS: Readonly<Record<FxPriority, number>> = { cue: 1, shot: 0.85, soft: 0.5 };

export interface FxQuality {
  /** Every effect burst's count × this (Low rounds down, an impact keeps at least 1; High rounds). */
  scale: number;
  /** Rounds drawn with a trail at once; the rest fly without. */
  trailCap: number;
  /** The trail's core colour, and High's soft glow edge. */
  core: boolean;
  edge: boolean;
  /** Trail bits and fuse smoke every this many ms, or none. */
  bitMs: number | null;
  smokeMs: number | null;
  markCap: number;
  /** Additive particles and ribbons (ley, lightning, embers). */
  additive: boolean;
}

export const FX_QUALITY: Readonly<Record<Quality, FxQuality>> = {
  low: { scale: 0.5, trailCap: 24, core: false, edge: false, bitMs: null, smokeMs: null, markCap: 6, additive: false },
  medium: { scale: 1, trailCap: 48, core: true, edge: false, bitMs: 80, smokeMs: 60, markCap: 12, additive: true },
  high: { scale: 1.25, trailCap: 96, core: true, edge: true, bitMs: 40, smokeMs: 40, markCap: 24, additive: true },
};

/**
 * Trails and marks: a trail slot keeps at most `points` drawn points (cut to its length when drawn) and fades over
 * `fadeMs` after its round ends; a trail tapers from `tail` of its width to all of it, its core `core` of the width,
 * High's edge `edge` × the width at `edgeAlpha`. Anything lasting past `sparkMs` lingers (drawn under the telegraphs);
 * impact sparks sort `behind` behind the enemy they struck (its feet less that). Shock rings and flashes come
 * from pools of `shockRings` and `flashes`. Crackle and flicker reroll every frame.
 */
export const FX_LOOK = {
  points: 24,
  fadeMs: 120,
  /** Slots kept beyond the tier's cap for trails still fading after their rounds ended. */
  fadeSlots: 24,
  tail: 0.4,
  core: 1 / 3,
  edge: 2.4,
  edgeAlpha: 0.18,
  sparkMs: 400,
  behind: 0.5,
  shockRings: 8,
  flashes: 24,
  /** The rim of the shock ring, px, and its core's share of it. */
  shockWidth: 2,
} as const;

/**
 * Machine sparks (078): 4 sparks from a machine's window when it finishes a craft. Colours by build group, a stage
 * machine by its tag (an element takes its own impact colours from AMMO_FX), a piece by its id. Logistics has none.
 */
export const MACHINE_SPARKS = {
  burst: { count: 4, speed: [30, 80] as const, cone: 1.2, gravity: 220, lifeMs: [200, 350] as const, size: 1 },
  /** Up from the machine's feet to its window, px. */
  windowLift: 14,
  byCategory: {
    arrows: ['brass-light', 'wood-light'],
    bombs: ['cinder-light', 'brass-light'],
    ley: ['cyan-glow', 'cyan'],
    mines: ['iron-light', 'brass-light'],
    forge: ['cinder-light', 'cinder', 'brass-light'],
  } as Readonly<Record<string, readonly string[]>>,
  byShape: { homing: ['cyan-glow', 'cyan'], split: ['cyan-glow', 'cyan'], cluster: ['cinder-light', 'gold-trim'] } as Readonly<Record<string, readonly string[]>>,
  byPiece: { 'tempering-coil': ['storm-glow', 'snow'] } as Readonly<Record<string, readonly string[]>>,
} as const;
