import { TICK_RATE } from './config';
import { REGION_3_PART } from './drops';
import type { MeleeDef } from './enemies';
import type { AttackTiming, DropTable, EnemyBase, ScreenLeashed } from './enemyBase';

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

/** A slag golem: walks slowly at the player, slams a circle ahead of it, and splits into two slag whelps as it dies. */
export interface GolemDef extends EnemyBase, ScreenLeashed {
  kind: 'golem';
  /**
   * With the player's feet within `triggerRange` and its cooldown ready, it winds up (`windupTicks`) a red circle of
   * `radius` centred `ahead` px in front of it, locked at the wind-up's start; then slams it (the pose holds
   * `swipeTicks`) for `damage` and `knockback` px out from the circle's centre over `knockTicks` on feet inside, then
   * recovers `recoverTicks`.
   */
  slam: AttackTiming & { triggerRange: number; radius: number; ahead: number; damage: number; knockback: number; knockTicks: number };
  /** As it dies, `count` of `into` rise where it fell, one each side, `apart` px out square to its facing, in its pack and ring. */
  split: { into: string; count: number; apart: number };
}

/** A kiln-tender: keeps its distance and repairs its packmates with a beam; it has no attack of its own. */
export interface TenderDef extends EnemyBase, ScreenLeashed {
  kind: 'tender';
  /** It keeps between `min` and `max` px from the player, backing off when closer and closing in when farther. */
  keep: { min: number; max: number };
  /**
   * Every `cooldownTicks` (from the wind-up's start) it picks the living packmate, not itself and never a boss, with
   * the lowest share of its max health below full, within `range` px along a clear line; winds up `windupTicks` (a
   * thin beam to it); then channels for up to `swipeTicks`, healing it `heal` a second, never past its max. The
   * channel breaks on a blocked line, the target's death, or any damage to the tender; then it recovers `recoverTicks`.
   */
  beam: AttackTiming & { range: number; heal: number };
}

/** The Emberworks' enemies, as one union for EnemyDef (the slag whelp is a MeleeDef, the Husk's kind). */
export type EmberworksEnemyDef = MoteDef | HoundDef | GolemDef | TenderDef;

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

export const SLAG_GOLEM: GolemDef = {
  ...BASE,
  kind: 'golem',
  id: 'slag-golem',
  name: 'Slag golem',
  maxHealth: 120,
  walkSpeed: 30,
  feetBox: { w: 26, h: 12 },
  hurtbox: { w: 32, h: 34, offsetY: -14 },
  weight: 1 / 3,
  slam: {
    triggerRange: 48,
    radius: 40,
    ahead: 32,
    windupTicks: 54,
    swipeTicks: 8,
    recoverTicks: 48,
    // Counted from the wind-up's start.
    cooldownTicks: 150,
    damage: 30,
    knockback: 40,
    knockTicks: 8,
  },
  split: { into: 'slag-whelp', count: 2, apart: 14 },
  drops: EMBERWORKS_DROPS,
  xp: 6,
  anims: 'slag-golem',
};

/** A slag whelp (061): a small, quick blob of slag that bites a short arc in front of it, the Husk's way (004). It only rises from a golem. */
export const SLAG_WHELP: MeleeDef = {
  ...BASE,
  kind: 'melee',
  id: 'slag-whelp',
  name: 'Slag whelp',
  maxHealth: 15,
  walkSpeed: 70,
  feetBox: { w: 12, h: 6 },
  hurtbox: { w: 16, h: 14, offsetY: -5 },
  weight: 4 / 3,
  swipe: {
    triggerRange: 20,
    reach: 24,
    arcDegrees: 90,
    windupTicks: 30,
    swipeTicks: 6,
    recoverTicks: 20,
    // Counted from the wind-up's start.
    cooldownTicks: 60,
    damage: 10,
    knockback: 12,
    knockTicks: 4,
  },
  drops: { always: [], chance: 0, oneOf: [] },
  noLoot: true,
  xp: 1,
  anims: 'slag-whelp',
};

export const KILN_TENDER: TenderDef = {
  ...BASE,
  kind: 'tender',
  id: 'kiln-tender',
  name: 'Kiln-tender',
  maxHealth: 40,
  walkSpeed: 45,
  feetBox: { w: 16, h: 8 },
  hurtbox: { w: 22, h: 28, offsetY: -12 },
  weight: 1,
  keep: { min: 160, max: 240 },
  beam: {
    range: 200,
    heal: 6,
    windupTicks: 30,
    // The channel's longest run.
    swipeTicks: 180,
    recoverTicks: 30,
    // Counted from the wind-up's start.
    cooldownTicks: 240,
  },
  drops: EMBERWORKS_DROPS,
  xp: 6,
  anims: 'kiln-tender',
};

export const EMBERWORKS_ENEMIES = {
  'cinder-mote': CINDER_MOTE,
  'bellows-hound': BELLOWS_HOUND,
  'slag-golem': SLAG_GOLEM,
  'slag-whelp': SLAG_WHELP,
  'kiln-tender': KILN_TENDER,
} as const;
