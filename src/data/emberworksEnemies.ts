import { TICK_RATE } from './config';
import { REGION_3_PART } from './drops';
import type { AttackTiming, DropTable, EnemyBase, ScreenLeashed } from './enemies';

// The Emberworks' enemies (061): each has its own read and its own answer. Starting values from the spec's table,
// tuned in playtest, before ring 4's ×4 (060); ticks at 60 Hz, distances px. Their rules are in src/sim (moteAi.ts
// and its kin); the Forgewright, the region's boss, is in forgewright.ts.

/** A ground hazard an enemy leaves (061): it beats `damage` every `everyTicks` on a player standing in it, for `ticks`. */
export interface HazardDef {
  ticks: number;
  damage: number;
  everyTicks: number;
}

/** A cinder mote: a floating ember that drifts at the player and swells, then bursts, leaving a fire pool. */
export interface MoteDef extends EnemyBase, ScreenLeashed {
  kind: 'mote';
  /**
   * With the player's feet within `triggerRange` it stops and swells for `windupTicks` as a red circle of `radius`
   * grows under it, then bursts: `damage` and `knockback` px outward over `knockTicks` on feet inside, unless a
   * roll's i-frames run. It's gone then (no drop, no XP). No recovery and no cooldown: it bursts once.
   */
  swell: AttackTiming & { triggerRange: number; radius: number; damage: number; knockback: number; knockTicks: number };
  /** The fire pool its burst leaves, `radius` round where it burst. It never hurts enemies. */
  pool: HazardDef & { radius: number };
  /** Killed, it bursts where it dies: `damage` Fire on every other enemy within `radius` (Fire's burn, 060), never the player, and no pool. */
  deathBurst: { radius: number; damage: number };
}

/** A bellows hound: walks like the Charger (035), shows its lane, then dashes down it, leaving a burning trail. */
export interface HoundDef extends EnemyBase, ScreenLeashed {
  kind: 'hound';
  /**
   * The Charger's lane and ram (hollowsEnemies.ts' `charge`): with the player within `triggerRange` along a clear
   * ground line and its cooldown ready, it winds up (`windupTicks`), the lane locked from its feet toward them,
   * `distance` long and `width` wide, then dashes down it at `speed` px/s for at most `swipeTicks`, striking once a
   * player its body touches. It stops at the lane's end or a wall (no stun, unlike the Charger) and recovers.
   */
  dash: AttackTiming & { triggerRange: number; distance: number; width: number; speed: number; damage: number; knockback: number; knockTicks: number };
  /** The burning trail its dash leaves along the ground it covered, `width` wide, from the tick it sets off. */
  trail: HazardDef & { width: number };
}

/** The Emberworks' enemies, as one union for EnemyDef. */
export type EmberworksEnemyDef = MoteDef | HoundDef;

/** The base fields they share, as the Hollows' (hollowsEnemies.ts). */
const BASE = { boss: false, hitKnockTicks: 4, hitFlashTicks: 6, leashGraceTicks: 60, homeTolerance: 4 } as const;

/**
 * Every Emberworks enemy's drops (061): 1 cinderite always, a 20% ley-iron, its part (the forge rivet) at 4%. Armor
 * (10%) is in gear.ts; the schematic roll is everyone's. A whelp drops nothing, and a mote that bursts on its own drops
 * nothing.
 */
export const EMBERWORKS_DROPS: DropTable = {
  always: [{ itemId: 'cinderite', min: 1, max: 1 }],
  chance: 0.2,
  oneOf: ['ley-iron'],
  rare: [REGION_3_PART],
};

export const CINDER_MOTE: MoteDef = {
  ...BASE,
  kind: 'mote',
  id: 'cinder-mote',
  name: 'Cinder mote',
  maxHealth: 20,
  walkSpeed: 60,
  feetBox: { w: 12, h: 6 },
  // It floats: its body is well off the ground.
  hurtbox: { w: 16, h: 18, offsetY: -16 },
  weight: 4 / 3,
  swell: {
    triggerRange: 40,
    radius: 40,
    windupTicks: 45,
    swipeTicks: 1,
    recoverTicks: 0,
    cooldownTicks: 0,
    damage: 18,
    knockback: 32,
    knockTicks: 6,
  },
  pool: { radius: 32, ticks: 180, damage: 8, everyTicks: 60 },
  deathBurst: { radius: 48, damage: 10 },
  drops: EMBERWORKS_DROPS,
  xp: 6,
  anims: 'cinder-mote',
};

const DASH = { distance: 200, speed: 420 } as const;

export const BELLOWS_HOUND: HoundDef = {
  ...BASE,
  kind: 'hound',
  id: 'bellows-hound',
  name: 'Bellows hound',
  maxHealth: 45,
  walkSpeed: 60,
  feetBox: { w: 20, h: 10 },
  hurtbox: { w: 28, h: 24, offsetY: -10 },
  weight: 1 / 2,
  dash: {
    triggerRange: 220,
    ...DASH,
    width: 24,
    windupTicks: 45,
    // The run's length at full speed: the lane ends it, or a wall first.
    swipeTicks: Math.ceil((DASH.distance / DASH.speed) * TICK_RATE),
    recoverTicks: 40,
    // Counted from the wind-up's start.
    cooldownTicks: 180,
    damage: 22,
    knockback: 32,
    knockTicks: 6,
  },
  trail: { width: 24, ticks: 180, damage: 8, everyTicks: 60 },
  drops: EMBERWORKS_DROPS,
  xp: 6,
  anims: 'bellows-hound',
};

export const EMBERWORKS_ENEMIES = { 'cinder-mote': CINDER_MOTE, 'bellows-hound': BELLOWS_HOUND } as const;
