import { BULWARK } from './bulwark';
import { REGION_1_PART, type RarePart } from './drops';
import { HOLLOWS_ENEMIES, type HollowsEnemyDef } from './hollowsEnemies';

// Enemies. Starting values from specs 004 and 009; tune in playtest.

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
  /** Push from an arrow hit, px, spread over `hitKnockTicks`. */
  hitKnockback: number;
  hitKnockTicks: number;
  hitFlashTicks: number;
  /** Within this distance of home, px, a returning enemy is home. */
  homeTolerance: number;
  drops: DropTable;
  /** Key into ENEMY_ANIMS in src/data/assets.ts. */
  anims: string;
  /**
   * A shield (034, shared with 035): straight shots and punches whose hit point lies within `arcDegrees / 2` of its
   * facing are blocked. It turns toward the player at no more than `turnDegPerSec`.
   */
  shield?: ShieldDef;
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

/** A Husk: walks up and swipes an arc in front of it. Aggros when on screen. */
export interface MeleeDef extends EnemyBase, ScreenLeashed {
  kind: 'melee';
  swipe: AttackTiming & {
    /** Feet-to-feet distance that starts a wind-up, px. */
    triggerRange: number;
    /** Reach of the swipe arc from the feet, px. */
    reach: number;
    /** Full width of the arc, degrees. */
    arcDegrees: number;
    damage: number;
    /** Push on the player, px, spread over `knockTicks`. */
    knockback: number;
    knockTicks: number;
  };
}

/** A Wisp (009): keeps its distance, charges, then casts a slow orb at where the player stood. */
export interface CasterDef extends EnemyBase, ScreenLeashed {
  kind: 'caster';
  cast: AttackTiming & {
    /** Aggros when the player is this close, px. */
    aggroRange: number;
    /** The distance it tries to keep from the player, px. */
    keepAway: number;
    /** Closer than this, it backs away rather than casting, px. */
    backOff: number;
    /** Within this of `keepAway` it holds still rather than drifting, px. */
    settle: number;
    /** Orb speed, px per second. */
    orbSpeed: number;
    orbDamage: number;
    /** Orbs end after flying this far, px. */
    orbRange: number;
    /** An orb's hit box, px square, tested against the player's feet box. */
    orbSize: number;
    /** Push on the player, px, over `knockTicks`. */
    knockback: number;
    knockTicks: number;
  };
}

/** The Pylon Warden (009): chases, then slams the ground around itself. */
export interface SlammerDef extends EnemyBase, ScreenLeashed {
  kind: 'slammer';
  slam: AttackTiming & {
    /** Aggros when the player is this close, px. */
    aggroRange: number;
    /** Feet-to-feet distance that starts a wind-up, px. */
    triggerRange: number;
    /** The slam hits a player whose feet are within this of its feet, px. */
    radius: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
}

/** The Bulwark (034): a shielded wall that lobs bombs and pounds up close, guarding its arena. Values in bulwark.ts. */
export interface BulwarkDef extends EnemyBase {
  kind: 'bulwark';
  shield: ShieldDef;
  /** Ticks with the player outside its arena before it walks home and heals. */
  leashTicks: number;
  /** It stops walking at this fraction of the pound's trigger range from the player, rather than walking into them. */
  standOff: number;
  lob: {
    cooldownTicks: number;
    windupTicks: number;
    throwTicks: number;
    count: number;
    scatter: number;
    radius: number;
    fuseTicks: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
  pound: AttackTiming & {
    triggerRange: number;
    radius: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
}

/** Region 2's four (035) are in hollowsEnemies.ts. */
export type EnemyDef = MeleeDef | CasterDef | SlammerDef | BulwarkDef | HollowsEnemyDef;

/** Every attack's wind-up is at least this long (035): long enough to read and dodge. A data test holds every enemy to it. */
export const MIN_TELEGRAPH_TICKS = 30;

/** Shared tuning for the base fields that all three start from. */
const BASE = { hitKnockTicks: 4, hitFlashTicks: 6, leashGraceTicks: 60, homeTolerance: 4 } as const;

export const ENEMIES: Readonly<Record<string, EnemyDef>> = {
  husk: {
    ...BASE,
    kind: 'melee',
    id: 'husk',
    name: 'Husk',
    boss: false,
    maxHealth: 40,
    walkSpeed: 50,
    feetBox: { w: 16, h: 8 },
    hurtbox: { w: 20, h: 24, offsetY: -4 },
    swipe: {
      triggerRange: 28,
      reach: 40,
      arcDegrees: 120,
      windupTicks: 36,
      swipeTicks: 6,
      recoverTicks: 24,
      cooldownTicks: 60,
      damage: 20,
      knockback: 24,
      knockTicks: 6,
    },
    hitKnockback: 6,
    drops: {
      always: [{ itemId: 'husk-resin', min: 1, max: 2 }],
      chance: 0.5,
      oneOf: ['wood', 'stone', 'fiber'],
      rare: [REGION_1_PART],
    },
    anims: 'husk',
  },
  wisp: {
    ...BASE,
    kind: 'caster',
    id: 'wisp',
    name: 'Wisp',
    boss: false,
    maxHealth: 20,
    walkSpeed: 40,
    feetBox: { w: 12, h: 6 },
    hurtbox: { w: 18, h: 22, offsetY: -14 },
    cast: {
      aggroRange: 160,
      keepAway: 120,
      backOff: 90,
      settle: 2,
      windupTicks: 48,
      swipeTicks: 8,
      recoverTicks: 12,
      // Counted from the wind-up's start, so casts land at least 90 ticks apart.
      cooldownTicks: 90,
      orbSpeed: 60,
      orbDamage: 12,
      orbRange: 240,
      orbSize: 8,
      knockback: 10,
      knockTicks: 4,
    },
    hitKnockback: 8,
    drops: { always: [{ itemId: 'ley-crystal', min: 1, max: 2 }], chance: 0, oneOf: [], rare: [REGION_1_PART] },
    anims: 'wisp',
  },
  'pylon-warden': {
    ...BASE,
    kind: 'slammer',
    id: 'pylon-warden',
    name: 'Pylon Warden',
    boss: true,
    maxHealth: 200,
    walkSpeed: 35,
    feetBox: { w: 28, h: 12 },
    hurtbox: { w: 34, h: 40, offsetY: -14 },
    slam: {
      aggroRange: 200,
      triggerRange: 56,
      radius: 64,
      windupTicks: 60,
      swipeTicks: 8,
      recoverTicks: 60,
      // Counted from the wind-up's start: 60 + 8 + 60, then 120 more after the recovery.
      cooldownTicks: 248,
      damage: 30,
      knockback: 32,
      knockTicks: 8,
    },
    hitKnockback: 1,
    leashGraceTicks: 120,
    drops: {
      always: [
        { itemId: 'warden-core', min: 1, max: 1 },
        { itemId: 'stone', min: 2, max: 3 },
      ],
      chance: 0,
      oneOf: [],
    },
    anims: 'warden',
  },
  bulwark: BULWARK,
  ...HOLLOWS_ENEMIES,
};

/** Dropped items land within this distance of the corpse, px. */
export const DROP_SCATTER = 12;

/** Spots tried for each dropped item before it falls back to the corpse point. */
export const DROP_SCATTER_TRIES = 8;

export function enemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy '${id}'`);
  return def;
}

/** An enemy's def, which must be a melee (swipe) enemy. */
export function meleeDef(id: string): MeleeDef {
  const def = enemyDef(id);
  if (def.kind !== 'melee') throw new Error(`Enemy '${id}' is not melee`);
  return def;
}

/** The wind-up, attack, recover and cooldown timing of any enemy's attack. */
export function attackOf(def: EnemyDef): AttackTiming {
  switch (def.kind) {
    case 'melee':
      return def.swipe;
    case 'caster':
      return def.cast;
    case 'slammer':
      return def.slam;
    case 'bulwark':
      return def.pound;
    case 'charger':
      return def.charge;
    case 'burrower':
      return def.burrow;
    case 'shardback':
      return def.bash;
    case 'sniper':
      return def.snipe;
  }
}
