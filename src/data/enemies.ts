import { BULWARK, type BulwarkDef } from './bulwark';
import { FORGEWRIGHT, type ForgewrightDef } from './forgewright';
import { CONDUCTOR, type ConductorDef } from './conductor';
import { BOSS_WEIGHT } from './combat';
import { REGION_1_PART } from './drops';
import type { AttackTiming, EnemyBase, ScreenLeashed } from './enemyBase';
import { HOLLOWS_ENEMIES, type HollowsEnemyDef } from './hollowsEnemies';
import { EMBERWORKS_ENEMIES, type EmberworksEnemyDef } from './emberworksEnemies';
import { STORMCROWN_ENEMIES, type StormcrownEnemyDef } from './stormcrownEnemies';

// Enemies. Starting values from specs 004 and 009; tune in playtest. What every enemy shares is in enemyBase.ts.

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

/** A Wisp (009): wakes on screen (045, note 13), keeps its distance, charges, then casts a slow orb at where the player stood. */
export interface CasterDef extends EnemyBase, ScreenLeashed {
  kind: 'caster';
  cast: AttackTiming & {
    /** 045: it wakes on screen like other enemies (017); awake, it closes to this many px before keeping its distance and casting. */
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

/** The Bulwark (034) is in bulwark.ts, the Forgewright (060) in forgewright.ts; Region 2's four (035) are in hollowsEnemies.ts, Region 3's (061) in emberworksEnemies.ts, Region 4's (065) in stormcrownEnemies.ts. */
export type { BulwarkDef, ConductorDef, ForgewrightDef };
export type EnemyDef = MeleeDef | CasterDef | SlammerDef | BulwarkDef | ForgewrightDef | ConductorDef | HollowsEnemyDef | EmberworksEnemyDef | StormcrownEnemyDef;

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
    weight: 1,
    drops: {
      always: [{ itemId: 'husk-resin', min: 1, max: 2 }],
      chance: 0.5,
      oneOf: ['wood', 'stone', 'fiber'],
      rare: [REGION_1_PART],
    },
    xp: 5,
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
    weight: 4 / 3,
    drops: { always: [{ itemId: 'ley-crystal', min: 1, max: 2 }], chance: 0, oneOf: [], rare: [REGION_1_PART] },
    xp: 6,
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
    weight: BOSS_WEIGHT,
    leashGraceTicks: 120,
    drops: {
      always: [
        { itemId: 'warden-core', min: 1, max: 1 },
        { itemId: 'stone', min: 2, max: 3 },
      ],
      chance: 0,
      oneOf: [],
    },
    xp: 150,
    anims: 'warden',
  },
  bulwark: BULWARK,
  forgewright: FORGEWRIGHT,
  conductor: CONDUCTOR,
  ...HOLLOWS_ENEMIES,
  ...EMBERWORKS_ENEMIES,
  ...STORMCROWN_ENEMIES,
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
    case 'forgewright':
      return def.slam;
    // 064: its first attack's timing; each of its three keeps its own (src/sim/conductorAi.ts).
    case 'conductor':
      return { windupTicks: def.lash.windupTicks, swipeTicks: def.lash.activeTicks, recoverTicks: def.lash.recoverTicks, cooldownTicks: def.lash.cooldownTicks };
    case 'charger':
      return def.charge;
    case 'burrower':
      // Its recovery is its daze on the surface.
      return { ...def.burrow, recoverTicks: def.burrow.surfacedTicks };
    case 'shardback':
      return def.bash;
    case 'sniper':
      return def.snipe;
    case 'mote':
      return def.swell;
    case 'hound':
      return def.dash;
    case 'golem':
      return def.slam;
    case 'tender':
      return def.beam;
    case 'hawk':
      return def.dive;
    case 'mite':
      return def.zap;
    case 'sentinel':
      return def.strike;
    case 'ram':
      return def.gust;
  }
}
