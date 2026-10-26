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

/** A static mite: a tiny spark-beetle that always comes in a swarm of `swarm` (a trio), running at the player to zap them. */
export interface MiteDef extends EnemyBase, ScreenLeashed {
  kind: 'mite';
  /** It spawns and moves with this many of its kind (065: a trio), each one pack member; they wake together. */
  swarm: number;
  /**
   * With the player's feet within `triggerRange` (contact) and its cooldown ready, it stops and winds up a red pulse of
   * `radius` under it (`windupTicks`), then zaps: `damage` and `knockback` px out over `knockTicks` on feet inside,
   * unless a roll's i-frames run. The zap shows `swipeTicks`; then it backs off from the player for `recoverTicks`.
   */
  zap: AttackTiming & { triggerRange: number; radius: number; damage: number; knockback: number; knockTicks: number };
  /** Killed, it discharges: `damage` lightning into every other mite within `radius` (which can kill them in turn, chaining), never the player. */
  discharge: { radius: number; damage: number };
}

/** A storm sentinel: a slow rod-turret that keeps its distance and calls strikes down on the player from range. */
export interface SentinelDef extends EnemyBase, ScreenLeashed {
  kind: 'sentinel';
  /** It keeps between `min` and `max` px from the player (061's keep-distance), backing off when closer. */
  keep: { min: number; max: number };
  /**
   * With its cooldown ready, the player within `range` along a clear line, and none of its own circles still waiting,
   * it calls a red strike circle of `radius` down on the player's feet (064's strikes), holding still as it calls
   * (`windupTicks`, the circle's wait); the strike lands then for `damage` and `knockback` px out over `knockTicks` on
   * feet inside (a roll's i-frames let it pass). Its call's pose shows `swipeTicks`, then it recovers `recoverTicks`.
   */
  strike: AttackTiming & { range: number; radius: number; damage: number; knockback: number; knockTicks: number };
}

/** The Stormcrown's enemies, as one union for EnemyDef. */
export type StormcrownEnemyDef = HawkDef | MiteDef | SentinelDef;

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

/** A mite drops at a third of the rate (065), so a trio drops like one enemy. */
const MITE_DROP_SHARE = 1 / 3;

export const STATIC_MITE: MiteDef = {
  ...BASE,
  kind: 'mite',
  id: 'static-mite',
  name: 'Static mite',
  maxHealth: 12,
  walkSpeed: 90,
  feetBox: { w: 10, h: 6 },
  hurtbox: { w: 14, h: 12, offsetY: -5 },
  weight: 4 / 3,
  swarm: 3,
  zap: {
    triggerRange: 16,
    radius: 20,
    windupTicks: 30,
    swipeTicks: 6,
    // It backs off.
    recoverTicks: 40,
    // Counted from the wind-up's start.
    cooldownTicks: 60,
    damage: 8,
    knockback: 8,
    knockTicks: 4,
  },
  discharge: { radius: 40, damage: 12 },
  drops: STORMCROWN_DROPS,
  dropShare: MITE_DROP_SHARE,
  xp: 3,
  anims: 'static-mite',
};

const KEEP = { min: 200, max: 300 } as const;

export const STORM_SENTINEL: SentinelDef = {
  ...BASE,
  kind: 'sentinel',
  id: 'storm-sentinel',
  name: 'Storm sentinel',
  maxHealth: 60,
  walkSpeed: 20,
  feetBox: { w: 22, h: 10 },
  hurtbox: { w: 26, h: 34, offsetY: -14 },
  weight: 1 / 2,
  keep: KEEP,
  strike: {
    // It calls only from within its band's far edge.
    range: KEEP.max,
    radius: 36,
    windupTicks: 60,
    swipeTicks: 8,
    recoverTicks: 30,
    // Counted from the wind-up's start.
    cooldownTicks: 120,
    damage: 30,
    knockback: 24,
    knockTicks: 6,
  },
  drops: STORMCROWN_DROPS,
  xp: 8,
  anims: 'storm-sentinel',
};

export const STORMCROWN_ENEMIES = {
  thunderhawk: THUNDERHAWK,
  'static-mite': STATIC_MITE,
  'storm-sentinel': STORM_SENTINEL,
} as const;
