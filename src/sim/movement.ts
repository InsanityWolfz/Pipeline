import { TICK_RATE } from '../data/config';
import {
  ACCEL_TICKS,
  FEET_BOX,
  INVULN_TICKS,
  ROLL_COOLDOWN_TICKS,
  ROLL_DISTANCE,
  ROLL_TICKS,
  WALK_SPEED,
} from '../data/player';
import type { Room } from '../data/rooms';
import { moveBox } from './collision';
import type { Command } from './input';
import type { Facing, PlayerState } from './player';

// Walking and the dodge roll, one tick at a time.

const WALK_PER_TICK = WALK_SPEED / TICK_RATE;
const ACCEL_PER_TICK = WALK_PER_TICK / ACCEL_TICKS;
const ROLL_PER_TICK = ROLL_DISTANCE / ROLL_TICKS;
// Absorbs float error so the last acceleration step lands exactly on target.
const EPSILON = 1e-9;

export function isRolling(p: PlayerState): boolean {
  return p.rollTick > 0;
}

export function isInvulnerable(p: PlayerState): boolean {
  return p.rollTick > 0 && p.rollTick <= INVULN_TICKS;
}

export function stepPlayer(p: PlayerState, room: Room, cmd: Command): void {
  if (p.rollTick >= ROLL_TICKS) endRoll(p);

  let rolling = isRolling(p);
  if (!rolling) {
    if (cmd.dodge && p.cooldown === 0) {
      startRoll(p, cmd);
      rolling = true;
    } else if (p.cooldown > 0) p.cooldown -= 1;
  }

  if (rolling) {
    p.rollTick += 1;
    p.vx = p.rollDirX * ROLL_PER_TICK;
    p.vy = p.rollDirY * ROLL_PER_TICK;
  } else {
    walk(p, cmd);
  }

  const { hitX, hitY } = moveBox(room, p, FEET_BOX, p.vx, p.vy);
  // A blocked roll keeps its speed so its timer runs out as normal; walking stops dead.
  if (!rolling) {
    if (hitX) p.vx = 0;
    if (hitY) p.vy = 0;
  }
}

function startRoll(p: PlayerState, cmd: Command): void {
  const [dx, dy] = cmd.moveX !== 0 || cmd.moveY !== 0 ? unit(cmd.moveX, cmd.moveY) : facingVector(p.facing);
  p.rollDirX = dx;
  p.rollDirY = dy;
  p.facing = facingOf(dx, dy, p.facing);
}

function endRoll(p: PlayerState): void {
  p.rollTick = 0;
  p.cooldown = ROLL_COOLDOWN_TICKS;
  p.vx = p.rollDirX * WALK_PER_TICK;
  p.vy = p.rollDirY * WALK_PER_TICK;
}

function walk(p: PlayerState, cmd: Command): void {
  const [ux, uy] = unit(cmd.moveX, cmd.moveY);
  const dx = ux * WALK_PER_TICK - p.vx;
  const dy = uy * WALK_PER_TICK - p.vy;
  const gap = Math.hypot(dx, dy);
  if (gap <= ACCEL_PER_TICK + EPSILON) {
    p.vx = ux * WALK_PER_TICK;
    p.vy = uy * WALK_PER_TICK;
  } else {
    p.vx += (dx / gap) * ACCEL_PER_TICK;
    p.vy += (dy / gap) * ACCEL_PER_TICK;
  }
  p.facing = facingOf(cmd.moveX, cmd.moveY, p.facing);
}

function unit(x: number, y: number): [number, number] {
  const len = Math.hypot(x, y);
  return len === 0 ? [0, 0] : [x / len, y / len];
}

/** Snaps a direction to 4 ways; horizontal wins on diagonals. Zero keeps the current facing. */
function facingOf(x: number, y: number, current: Facing): Facing {
  if (x !== 0) return x > 0 ? 'right' : 'left';
  if (y !== 0) return y > 0 ? 'down' : 'up';
  return current;
}

function facingVector(f: Facing): [number, number] {
  return f === 'up' ? [0, -1] : f === 'down' ? [0, 1] : f === 'left' ? [-1, 0] : [1, 0];
}
