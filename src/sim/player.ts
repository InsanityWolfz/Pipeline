// The player's movement state: plain data so it serializes with the sim.

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
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
}

export function createPlayer(at: { x: number; y: number }): PlayerState {
  return { x: at.x, y: at.y, vx: 0, vy: 0, facing: 'down', rollTick: 0, rollDirX: 0, rollDirY: 0, cooldown: 0, aimX: at.x, aimY: at.y };
}
