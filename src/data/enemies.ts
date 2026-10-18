// Enemies. Starting values from spec 004; tune in playtest.

/** Items an enemy drops on death. */
export interface DropTable {
  /** Always dropped: `min`..`max` of the item, rolled. */
  always: readonly { itemId: string; min: number; max: number }[];
  /** Chance (0..1) of one extra item, picked evenly from `oneOf`. */
  chance: number;
  oneOf: readonly string[];
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHealth: number;
  /** Walk speed, px per second. */
  walkSpeed: number;
  /** Collision box at the feet, px, centred on the feet position. */
  feetBox: { w: number; h: number };
  /** Box arrows hit, px, centred `offsetY` from the feet (negative is up). */
  hurtbox: { w: number; h: number; offsetY: number };
  swipe: {
    /** Feet-to-feet distance that starts a wind-up, px. */
    triggerRange: number;
    /** Reach of the swipe arc from the feet, px. */
    reach: number;
    /** Full width of the arc, degrees. */
    arcDegrees: number;
    windupTicks: number;
    /** Ticks the swipe pose holds; the hit lands on the first. */
    swipeTicks: number;
    recoverTicks: number;
    /** Ticks from a wind-up starting before another can start. */
    cooldownTicks: number;
    damage: number;
    /** Push on the player, px, spread over `knockTicks`. */
    knockback: number;
    knockTicks: number;
  };
  /** Push from an arrow hit, px, spread over `hitKnockTicks`. */
  hitKnockback: number;
  hitKnockTicks: number;
  hitFlashTicks: number;
  /** Ticks off screen before a chasing enemy heads home. */
  leashGraceTicks: number;
  /** Within this distance of home, px, a returning enemy is home. */
  homeTolerance: number;
  drops: DropTable;
  /** Key into ENEMY_ANIMS in src/data/assets.ts. */
  anims: string;
}

export const ENEMIES: Readonly<Record<string, EnemyDef>> = {
  husk: {
    id: 'husk',
    name: 'Husk',
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
    hitKnockTicks: 4,
    hitFlashTicks: 6,
    leashGraceTicks: 60,
    homeTolerance: 4,
    drops: {
      always: [{ itemId: 'husk-resin', min: 1, max: 2 }],
      chance: 0.5,
      oneOf: ['wood', 'stone', 'fiber'],
    },
    anims: 'husk',
  },
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
