import { enemyDef } from '../data/enemies';
import type { Room } from '../data/rooms';
import { moveBox, type Rect } from './collision';
import { startKnock, type Knockable } from './knockback';
import type { Facing } from './player';
import type { SimState } from './state';

// Enemies as plain data: creation, damage and bodies. Their behaviour is in huskAi.ts.

export type EnemyMode = 'idle' | 'chase' | 'windup' | 'swipe' | 'recover' | 'return';

export interface EnemyState extends Knockable {
  id: number;
  enemyId: string;
  /** Enemies never change rooms. */
  roomId: string;
  /** Feet centre, px. */
  x: number;
  y: number;
  /** Where it was placed; it walks back here when it loses the player. */
  homeX: number;
  homeY: number;
  /** This tick's own movement (not knockback), px per tick. */
  vx: number;
  vy: number;
  facing: Facing;
  mode: EnemyMode;
  /** Ticks into the current wind-up, swipe or recover, counting the first as 1. */
  modeTicks: number;
  /** Ticks in a row spent outside the player's aggro box while engaged. */
  offScreenTicks: number;
  /** Ticks before another wind-up can start. */
  cooldown: number;
  health: number;
  /** Unit swipe direction, locked when a wind-up starts. */
  swipeDirX: number;
  swipeDirY: number;
  /** Ticks of hit flash left, for render. */
  flash: number;
  /** Ticks of burn left; it deals damage on every `everyTicks`-th. */
  burnTicks: number;
  /** The ammo whose burn is running, for its numbers. */
  burnAmmo: string;
}

export function createEnemy(id: number, enemyId: string, at: { x: number; y: number }, roomId: string): EnemyState {
  const def = enemyDef(enemyId);
  return {
    id,
    enemyId,
    roomId,
    x: at.x,
    y: at.y,
    homeX: at.x,
    homeY: at.y,
    vx: 0,
    vy: 0,
    facing: 'down',
    mode: 'idle',
    modeTicks: 0,
    offScreenTicks: 0,
    cooldown: 0,
    health: def.maxHealth,
    swipeDirX: 0,
    swipeDirY: 1,
    flash: 0,
    burnTicks: 0,
    burnAmmo: '',
    knockX: 0,
    knockY: 0,
    knockTicks: 0,
  };
}

/** Starts chasing the player. */
export function aggro(e: EnemyState): void {
  e.mode = 'chase';
  e.modeTicks = 0;
  e.offScreenTicks = 0;
}

/** How a hit lands: arrows knock back and flash, bursts only flash, burns do neither. */
export interface HitStyle {
  knock: boolean;
  flash: boolean;
}

const ARROW_HIT: HitStyle = { knock: true, flash: true };

/** Damages an enemy, knocking it along (dirX, dirY). A hit always aggros an idle or returning enemy. */
export function damageEnemy(
  state: SimState,
  e: EnemyState,
  amount: number,
  dirX: number,
  dirY: number,
  style: HitStyle = ARROW_HIT,
): void {
  const def = enemyDef(e.enemyId);
  e.health = Math.max(0, e.health - amount);
  if (style.flash) e.flash = def.hitFlashTicks;
  if (style.knock) startKnock(e, dirX, dirY, def.hitKnockback, def.hitKnockTicks);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  state.events.hits.push({ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: amount });
}

/** True if a ground point is inside the enemy's hurtbox. */
export function inHurtbox(e: EnemyState, x: number, y: number): boolean {
  const { hurtbox } = enemyDef(e.enemyId);
  return Math.abs(x - e.x) <= hurtbox.w / 2 && Math.abs(y - (e.y + hurtbox.offsetY)) <= hurtbox.h / 2;
}

/** A room and the solid things standing in it, for collision. */
export interface RoomBodies {
  room: Room;
  obstacles: readonly Rect[];
}

/**
 * Pushes overlapping enemies in the same room apart along the axis of least overlap,
 * half each. If a wall stops one, the other takes the rest. Runs in array order, so
 * it's deterministic.
 */
export function separate(enemies: EnemyState[], bodies: (roomId: string) => RoomBodies): void {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      if (!a || !b || a.roomId !== b.roomId) continue;
      const { room, obstacles } = bodies(a.roomId);
      const fa = enemyDef(a.enemyId).feetBox;
      const fb = enemyDef(b.enemyId).feetBox;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ox = (fa.w + fb.w) / 2 - Math.abs(dx);
      const oy = (fa.h + fb.h) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (ox <= oy) pushApart(room, obstacles, a, b, ox, dx < 0 ? -1 : 1, 0);
      else pushApart(room, obstacles, a, b, oy, 0, dy < 0 ? -1 : 1);
    }
  }
}

function pushApart(
  room: Room,
  obstacles: readonly Rect[],
  a: EnemyState,
  b: EnemyState,
  amount: number,
  ux: number,
  uy: number,
): void {
  const boxA = enemyDef(a.enemyId).feetBox;
  const boxB = enemyDef(b.enemyId).feetBox;
  const movedA = shove(room, obstacles, a, boxA, -ux * (amount / 2), -uy * (amount / 2));
  const movedB = shove(room, obstacles, b, boxB, ux * (amount - movedA), uy * (amount - movedA));
  const left = amount - movedA - movedB;
  if (left > 0) shove(room, obstacles, a, boxA, -ux * left, -uy * left);
}

/** Moves a body and returns how far it actually went. */
function shove(
  room: Room,
  obstacles: readonly Rect[],
  e: EnemyState,
  box: { w: number; h: number },
  dx: number,
  dy: number,
): number {
  const x = e.x;
  const y = e.y;
  moveBox(room, e, box, dx, dy, obstacles);
  return Math.hypot(e.x - x, e.y - y);
}
