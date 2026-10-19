import { TICK_RATE } from './config';
import { REGION_2_PART } from './drops';
import type { AttackTiming, DropTable, EnemyBase, ScreenLeashed, ShieldDef } from './enemies';

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

/** A Burrower: tunnels toward the player as a ripple, then erupts under where they stood. */
export interface BurrowerDef extends EnemyBase, ScreenLeashed {
  kind: 'burrower';
  /**
   * Aggroed, it digs in for `digTicks` (still hittable), then tunnels at `speed` px/s, untargetable. With its ripple
   * within `lockRange` of the player's feet, or after `maxTunnelTicks`, and its cooldown ready, it locks their feet's
   * spot and winds up (`windupTicks`) as a ring of `radius` grows there; then erupts (the pose holds `swipeTicks`) for
   * `damage` and `knockback` px outward over `knockTicks` on feet inside, and stays surfaced and dazed for
   * `surfacedTicks` (its recovery, `recoverTicks`) before digging in again.
   */
  burrow: AttackTiming & {
    digTicks: number;
    speed: number;
    lockRange: number;
    maxTunnelTicks: number;
    radius: number;
    damage: number;
    knockback: number;
    knockTicks: number;
    surfacedTicks: number;
  };
}

/** A Shardback: a squat construct behind an armored front (034's shield rule), the Bulwark's little cousin, flanked to be hurt. */
export interface ShardbackDef extends EnemyBase, ScreenLeashed {
  kind: 'shardback';
  shield: ShieldDef;
  /**
   * It walks at the player turning its shield; with their feet within `triggerRange` and its cooldown ready it winds
   * up (`windupTicks`, still turning), then bashes along its shield's facing: feet within `reach` and inside the
   * `arcDegrees` arc take `damage` and `knockback` px over `knockTicks`. The pose holds `swipeTicks`; then it recovers
   * `recoverTicks` without turning, the window to get behind it.
   */
  bash: AttackTiming & {
    triggerRange: number;
    arcDegrees: number;
    reach: number;
    damage: number;
    knockback: number;
    knockTicks: number;
  };
}

/** Region 2's four (035), as one union for EnemyDef. */
export type HollowsEnemyDef = ChargerDef | BurrowerDef | ShardbackDef;

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

/** Surfaced and dazed after an eruption: the window to hit it. */
const SURFACED_TICKS = 150;

export const BURROWER: BurrowerDef = {
  ...BASE,
  kind: 'burrower',
  id: 'burrower',
  name: 'Burrower',
  maxHealth: 35,
  walkSpeed: 40,
  // No wider than the player's feet (16 × 8): it can always rise where they stood.
  feetBox: { w: 14, h: 8 },
  hurtbox: { w: 22, h: 20, offsetY: -8 },
  hitKnockback: 6,
  burrow: {
    digTicks: 20,
    speed: 70,
    lockRange: 12,
    maxTunnelTicks: 180,
    radius: 28,
    windupTicks: 50,
    swipeTicks: 10,
    recoverTicks: SURFACED_TICKS,
    surfacedTicks: SURFACED_TICKS,
    // Counted from the wind-up's start.
    cooldownTicks: 240,
    damage: 22,
    knockback: 32,
    knockTicks: 6,
  },
  drops: HOLLOWS_DROPS,
  anims: 'burrower',
};

export const SHARDBACK: ShardbackDef = {
  ...BASE,
  kind: 'shardback',
  id: 'shardback',
  name: 'Shardback',
  maxHealth: 70,
  walkSpeed: 40,
  feetBox: { w: 22, h: 10 },
  hurtbox: { w: 28, h: 30, offsetY: -12 },
  hitKnockback: 2,
  /** Three times the Bulwark's turn: a half turn in 1.5 s, slow enough to run round on foot. */
  shield: { arcDegrees: 180, turnDegPerSec: 120 },
  bash: {
    triggerRange: 30,
    arcDegrees: 100,
    reach: 40,
    windupTicks: 40,
    swipeTicks: 6,
    recoverTicks: 30,
    // Counted from the wind-up's start.
    cooldownTicks: 90,
    damage: 20,
    knockback: 40,
    knockTicks: 6,
  },
  drops: HOLLOWS_DROPS,
  anims: 'shardback',
};

export const HOLLOWS_ENEMIES = { charger: CHARGER, burrower: BURROWER, shardback: SHARDBACK } as const;
