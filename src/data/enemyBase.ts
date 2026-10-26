import type { RarePart } from './drops';

// What every enemy's def shares, whatever its region or attack (split out of enemies.ts): its drops, its base fields,
// a shield, an attack's timing and the screen leash. Each region's enemies build on these.

/** Items an enemy (or a Ruined Cache, 032) drops. */
export interface DropTable {
  /** Always dropped: `min`..`max` of the item, rolled. */
  always: readonly { itemId: string; min: number; max: number }[];
  /** Chance (0..1) of one extra item, picked evenly from `oneOf`. */
  chance: number;
  oneOf: readonly string[];
  /** `min`..`max` items, rolled, each picked evenly from `items` (032: the cache's raws). */
  picks?: readonly { items: readonly string[]; min: number; max: number }[];
  /** Rare entries (032), each rolled once per death at its chance (0..1), a champion's at `championChance` (033). */
  rare?: readonly RarePart[];
}

/** What every enemy has, whatever its attack. */
export interface EnemyBase {
  id: string;
  name: string;
  /** A boss (023) shrugs off the punch's knockback. */
  boss: boolean;
  maxHealth: number;
  /** Walk speed, px per second. */
  walkSpeed: number;
  /** Collision box at the feet, px, centred on the feet position. */
  feetBox: { w: number; h: number };
  /** Box arrows hit, px, centred `offsetY` from the feet (negative is up). */
  hurtbox: { w: number; h: number; offsetY: number };
  /** Its weight against Knockback (039, Q11): a round's hit pushes it `knockback × weight` px over `hitKnockTicks`. A boss weighs BOSS_WEIGHT (0). */
  weight: number;
  hitKnockTicks: number;
  hitFlashTicks: number;
  /** Within this distance of home, px, a returning enemy is home. */
  homeTolerance: number;
  drops: DropTable;
  /** XP for a kill (037): times its ring's and a champion's multiplier, or a boss's on its first kill. */
  xp: number;
  /** Key into ENEMY_ANIMS in src/data/assets.ts. */
  anims: string;
  /**
   * A shield (034, shared with 035): straight shots and punches whose hit point lies within `arcDegrees / 2` of its
   * facing are blocked. It turns toward the player at no more than `turnDegPerSec`.
   */
  shield?: ShieldDef;
  /** It drops nothing at all (061: a slag whelp), the schematic and armor rolls included. */
  noLoot?: boolean;
  /**
   * 065: it flies (the thunderhawk): it moves over walls, cliffs and chasms, never blocked by terrain (src/sim/flight.ts),
   * and never pushes or is pushed by an enemy on the ground.
   */
  flies?: boolean;
  /** 065: it drops at all only this share of the time (a static mite's third): its table, part, schematic and armor rolls together. */
  dropShare?: number;
}

export interface ShieldDef {
  arcDegrees: number;
  turnDegPerSec: number;
}

/** The timing every attack shares: a telegraphed wind-up, the attack pose, a recovery, and a cooldown. */
export interface AttackTiming {
  windupTicks: number;
  /** Ticks the attack pose holds; the attack lands on the first. */
  swipeTicks: number;
  recoverTicks: number;
  /** Ticks from a wind-up starting before another can start. */
  cooldownTicks: number;
}

/** Enemies that chase while on screen and head home after a grace period off it (the Bulwark leashes by its arena instead, 034). */
export interface ScreenLeashed {
  /** Ticks off screen before a chasing enemy heads home. */
  leashGraceTicks: number;
}
