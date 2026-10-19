import { TICK_RATE } from './config';
import { REGION_2_PART } from './drops';
import type { AttackTiming, DropTable, EnemyBase, ScreenLeashed } from './enemies';

// Stonefall Hollows' enemies (035): each asks for a different dodge. Starting values from
// the spec's table, tuned in playtest; ticks at 60 Hz, distances px. Their rules are in
// src/sim (chargerAi.ts and its kin); the Bulwark, the region's boss, is in bulwark.ts.

/** A Charger: shows its lane, then rams down it. */
export interface ChargerDef extends EnemyBase, ScreenLeashed {
  kind: 'charger';
  /**
   * With the player within `triggerRange` along a clear ground line and its cooldown ready, it plants and winds up
   * (`windupTicks`), the lane locked from its feet toward them: `distance` long, `width` wide. Then it charges down it
   * at `speed` px/s (the pose holds at most `swipeTicks`, its run's length), striking once a player whose feet box
   * touches its body (a circle `width` across round its feet) for `damage` and `knockback` px along the lane over
   * `knockTicks`. At the lane's end it holds still `recoverTicks`; a wall first stuns it `stunTicks` instead.
   */
  charge: AttackTiming & {
    triggerRange: number;
    distance: number;
    width: number;
    speed: number;
    damage: number;
    knockback: number;
    knockTicks: number;
    stunTicks: number;
  };
}

/** Region 2's four (035), as one union for EnemyDef. */
export type HollowsEnemyDef = ChargerDef;

/** The base fields they share, as the old enemies' (enemies.ts). */
const BASE = { boss: false, hitKnockTicks: 4, hitFlashTicks: 6, leashGraceTicks: 60, homeTolerance: 4 } as const;

/** Every Region 2 enemy's drops (035): 1 ley-iron always, a 50% stone (the Husk's raw chance), its part at 4%. Armor (10%) is in armor.ts; the schematic roll is everyone's. */
const HOLLOWS_DROPS: DropTable = {
  always: [{ itemId: 'ley-iron', min: 1, max: 1 }],
  chance: 0.5,
  oneOf: ['stone'],
  rare: [REGION_2_PART],
};

const CHARGE = { distance: 220, speed: 360 } as const;

export const CHARGER: ChargerDef = {
  ...BASE,
  kind: 'charger',
  id: 'charger',
  name: 'Charger',
  maxHealth: 50,
  walkSpeed: 45,
  feetBox: { w: 22, h: 10 },
  hurtbox: { w: 28, h: 26, offsetY: -10 },
  hitKnockback: 3,
  charge: {
    triggerRange: 200,
    ...CHARGE,
    width: 24,
    windupTicks: 45,
    // The run's length at full speed: the lane ends it, or a wall first.
    swipeTicks: Math.ceil((CHARGE.distance / CHARGE.speed) * TICK_RATE),
    recoverTicks: 45,
    // Counted from the wind-up's start.
    cooldownTicks: 180,
    damage: 25,
    knockback: 48,
    knockTicks: 8,
    stunTicks: 60,
  },
  drops: HOLLOWS_DROPS,
  anims: 'charger',
};

export const HOLLOWS_ENEMIES = { charger: CHARGER } as const;
