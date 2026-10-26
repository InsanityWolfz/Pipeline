import { TICK_RATE } from './config';
import { REGION_4_PART } from './drops';
import type { AttackTiming, DropTable, EnemyBase, ScreenLeashed } from './enemies';

// The Stormcrown's enemies (065), built to test a late build: each has its own read and its own answer. Starting values
// from the spec's table, tuned in playtest, before ring 5's ×10 (064); ticks at 60 Hz, distances px. Their rules are in
// src/sim (hawkAi.ts and its kin); the Conductor, the region's boss, is in conductor.ts.

/**
 * A thunderhawk: a brass-and-slate storm bird construct that flies over walls (`flies`) and circles the player at
 * `orbit.radius`, turning at no more than `orbit.turnDegPerSec`, so straight shots lead it poorly and homing rounds
 * track it.
 */
export interface HawkDef extends EnemyBase, ScreenLeashed {
  kind: 'hawk';
  flies: true;
  orbit: { radius: number; turnDegPerSec: number };
  /**
   * With its cooldown ready and the player's feet within `distance`, it hovers and marks its dive line (`windupTicks`):
   * from where it hovers through the player's feet, locked at the wind-up's start, `distance` long and `width` wide.
   * Then it dives down it at `speed` px/s for at most `swipeTicks` (the run's length), over walls and through enemies,
   * striking once a player whose feet box touches its body (a circle `width` across) for `damage` and `knockback` px
   * along the line over `knockTicks`. It climbs away to its orbit over `recoverTicks`.
   */
  dive: AttackTiming & { distance: number; width: number; speed: number; damage: number; knockback: number; knockTicks: number };
}

/** The Stormcrown's enemies, as one union for EnemyDef. */
export type StormcrownEnemyDef = HawkDef;

/** The base fields they share, as the Emberworks' (emberworksEnemies.ts). */
const BASE = { boss: false, hitKnockTicks: 4, hitFlashTicks: 6, leashGraceTicks: 60, homeTolerance: 4 } as const;

/**
 * Every Stormcrown enemy's drops (065): 1 stormglass always, a 20% cinderite, its part (the storm coil) at 4%. Armor
 * (10%) is in gear.ts; the schematic roll is everyone's.
 */
export const STORMCROWN_DROPS: DropTable = {
  always: [{ itemId: 'stormglass', min: 1, max: 1 }],
  chance: 0.2,
  oneOf: ['cinderite'],
  rare: [REGION_4_PART],
};

const DIVE = { distance: 260, speed: 480 } as const;

export const THUNDERHAWK: HawkDef = {
  ...BASE,
  kind: 'hawk',
  flies: true,
  id: 'thunderhawk',
  name: 'Thunderhawk',
  maxHealth: 40,
  walkSpeed: 110,
  feetBox: { w: 16, h: 8 },
  // It flies: its body is well off the ground, over its shadow.
  hurtbox: { w: 26, h: 20, offsetY: -30 },
  weight: 1,
  orbit: { radius: 160, turnDegPerSec: 180 },
  dive: {
    ...DIVE,
    width: 20,
    windupTicks: 45,
    // The run's length at full speed.
    swipeTicks: Math.ceil((DIVE.distance / DIVE.speed) * TICK_RATE),
    // It climbs away to its orbit.
    recoverTicks: 60,
    // Counted from the wind-up's start.
    cooldownTicks: 210,
    damage: 24,
    knockback: 32,
    knockTicks: 6,
  },
  drops: STORMCROWN_DROPS,
  xp: 8,
  anims: 'thunderhawk',
};

export const STORMCROWN_ENEMIES = {
  thunderhawk: THUNDERHAWK,
} as const;
