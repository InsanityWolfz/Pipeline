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
import { moveBox, type Rect } from './collision';
import { facingOf, facingVector, unit } from './direction';
import type { Command } from './input';
import { takeKnock } from './knockback';
import type { PlayerState } from './player';
import { tickSlow } from './slow';

// Walking, the dodge roll and knockback, one tick at a time.

const WALK_PER_TICK = WALK_SPEED / TICK_RATE;
const ACCEL_PER_TICK = WALK_PER_TICK / ACCEL_TICKS;
// Absorbs float error so the last acceleration step lands exactly on target.
const EPSILON = 1e-9;

export function isRolling(p: PlayerState): boolean {
  return p.rollTick > 0;
}

export function isInvulnerable(p: PlayerState): boolean {
  return p.rollTick > 0 && p.rollTick <= INVULN_TICKS;
}

/** What gear (036) does to moving: the walk's multiplier, the roll's distance over ROLL_TICKS, and its cooldown. */
export interface MoveStats {
  walkScale: number;
  rollDistance: number;
  rollCooldown: number;
}

const BARE: MoveStats = { walkScale: 1, rollDistance: ROLL_DISTANCE, rollCooldown: ROLL_COOLDOWN_TICKS };

/** `moves.walkScale` scales the walk (heavy armor, gear speed, firing); rolls take its distance and cooldown, never its walk speed. */
export function stepPlayer(p: PlayerState, room: Room, cmd: Command, obstacles: readonly Rect[] = [], moves: MoveStats = BARE): void {
  if (p.hurtTicks > 0) p.hurtTicks -= 1;
  // 065: the slow counts down (this tick's move already has it).
  tickSlow(p);
  if (p.rollTick >= ROLL_TICKS) endRoll(p, moves.rollCooldown);

  let rolling = isRolling(p);
  if (!rolling) {
    if (cmd.dodge && p.cooldown === 0) {
      startRoll(p, cmd);
      rolling = true;
    } else if (p.cooldown > 0) p.cooldown = Math.max(0, p.cooldown - 1);
  }

  if (rolling) {
    p.rollTick += 1;
    p.vx = (p.rollDirX * moves.rollDistance) / ROLL_TICKS;
    p.vy = (p.rollDirY * moves.rollDistance) / ROLL_TICKS;
  } else {
    walk(p, cmd, moves.walkScale);
  }

  // Knockback adds to the move, so input still steers on top of it.
  const [kx, ky] = takeKnock(p);
  const { hitX, hitY } = moveBox(room, p, FEET_BOX, p.vx + kx, p.vy + ky, obstacles, true);
  // Velocity reports actual movement. A blocked roll still runs out its timer,
  // since its speed is set again from its direction each tick.
  if (hitX) p.vx = 0;
  if (hitY) p.vy = 0;
}

function startRoll(p: PlayerState, cmd: Command): void {
  const [dx, dy] = cmd.moveX !== 0 || cmd.moveY !== 0 ? unit(cmd.moveX, cmd.moveY) : facingVector(p.facing);
  p.rollDirX = dx;
  p.rollDirY = dy;
  p.facing = facingOf(dx, dy, p.facing);
  p.rollStunned = [];
}

/** Ends a roll in progress (a death cuts one short too), starting the cooldown (036: gear shortens it). */
export function endRoll(p: PlayerState, cooldown = ROLL_COOLDOWN_TICKS): void {
  p.rollTick = 0;
  p.cooldown = cooldown;
  p.vx = p.rollDirX * WALK_PER_TICK;
  p.vy = p.rollDirY * WALK_PER_TICK;
}

function walk(p: PlayerState, cmd: Command, scale: number): void {
  const [ux, uy] = unit(cmd.moveX, cmd.moveY);
  const top = WALK_PER_TICK * scale;
  const dx = ux * top - p.vx;
  const dy = uy * top - p.vy;
  const gap = Math.hypot(dx, dy);
  if (gap <= ACCEL_PER_TICK + EPSILON) {
    p.vx = ux * top;
    p.vy = uy * top;
  } else {
    p.vx += (dx / gap) * ACCEL_PER_TICK;
    p.vy += (dy / gap) * ACCEL_PER_TICK;
  }
  p.facing = facingOf(cmd.moveX, cmd.moveY, p.facing);
}
