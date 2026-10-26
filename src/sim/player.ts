import { MAX_HEALTH, type HealSource } from '../data/player';
import type { Knockable } from './knockback';

// The player's state: plain data so it serializes with the sim.

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface PlayerState extends Knockable {
  /** Feet centre, px. */
  x: number;
  y: number;
  /** Velocity, px per tick. */
  vx: number;
  vy: number;
  facing: Facing;
  /** Roll tick in progress, 1..ROLL_TICKS; 0 when not rolling. */
  rollTick: number;
  /** Unit roll direction, fixed when the roll starts. */
  rollDirX: number;
  rollDirY: number;
  /** Ticks left before another roll can start. */
  cooldown: number;
  /** The last aim point, world px. */
  aimX: number;
  aimY: number;
  health: number;
  /** Ticks of hit invulnerability left. */
  hurtTicks: number;
  /** Ticks left on the death animation before waking in the foundry (011); 0 when alive. */
  dying: number;
  /** What raised health this tick (030), or null. */
  healing: HealSource | null;
  /** Healing built up toward the next whole HP, in tenths of an HP·tick (10 × TICK_RATE of them make 1 HP, 036). */
  healCarry: number;
  /** The tick the last hit landed on, or null: healing waits HEALING.afterHitDelay ticks from it. */
  lastHitTick: number | null;
  /** Ticks without a hit while the Wardstone Circlet is worn (036), up to its wardTicks; 0 when not worn. */
  wardTicks: number;
  /** Last Ember (036) has saved the player since the last bank. */
  emberSpent: boolean;
  /** Enemies this roll has stunned (036: Rollbreaker Greaves, once each a roll). */
  rollStunned: number[];
  /** 065: slowed (a gale ram's gust): the share of walk and roll speed taken (0: none), and ticks left of it. */
  slow: number;
  slowTicks: number;
}

export function createPlayer(at: { x: number; y: number }): PlayerState {
  return {
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    facing: 'down',
    rollTick: 0,
    rollDirX: 0,
    rollDirY: 0,
    cooldown: 0,
    aimX: at.x,
    aimY: at.y,
    health: MAX_HEALTH,
    hurtTicks: 0,
    dying: 0,
    healing: null,
    healCarry: 0,
    lastHitTick: null,
    wardTicks: 0,
    emberSpent: false,
    rollStunned: [],
    slow: 0,
    slowTicks: 0,
    knockX: 0,
    knockY: 0,
    knockTicks: 0,
  };
}
