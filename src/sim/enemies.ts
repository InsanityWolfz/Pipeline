import type { DamageType } from '../data/ammo';
import { enemyDef } from '../data/enemies';
import { defOf } from './champions';
import type { Room } from '../data/rooms';
import { moveBox, type Rect } from './collision';
import { chillEnemy, frozenFast } from './cold';
import { startKnock, type Knockable } from './knockback';
import type { Facing } from './player';
import type { SimState } from './state';

// Enemies as plain data: creation, damage and bodies. Their behaviour is in enemyAi.ts.

/** `lob` and `throw` (034): the Bulwark rearing back, then holding the throw. */
export type EnemyMode = 'idle' | 'chase' | 'windup' | 'swipe' | 'recover' | 'return' | 'lob' | 'throw';

export interface EnemyState extends Knockable {
  id: number;
  enemyId: string;
  /** Enemies never change rooms. */
  roomId: string;
  /** What it belongs to (017): `field` (the tutorial pack), a site id (its guards), `pop-…` (a population pack), or ''. */
  group: string;
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
  /** Chill stacks from cold hits (029); each slows it. */
  chill: number;
  /** Ticks before the chill runs out and the stacks drop to 0. */
  chillTicks: number;
  /** Ticks left frozen: it doesn't move or think. */
  frozen: number;
  /** Ticks after a thaw in which cold hits add no stacks. */
  refreeze: number;
  /** A champion (032), by name, or null: the sim reads its scaled def (`defOf`). */
  champion: { name: string } | null;
  /** Its continuous facing, radians (034): a shielded enemy's shield points this way and turns, never snapping. */
  angle: number;
  /** Ticks before its next bomb lob (034: the Bulwark's). */
  lobCooldown: number;
  /** Ticks of shield flash left after a blocked hit (034), for render. */
  blockFlash: number;
}

export function createEnemy(id: number, enemyId: string, at: { x: number; y: number }, roomId: string, group = ''): EnemyState {
  const def = enemyDef(enemyId);
  return {
    id,
    enemyId,
    roomId,
    group,
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
    chill: 0,
    chillTicks: 0,
    frozen: 0,
    refreeze: 0,
    champion: null,
    angle: Math.PI / 2,
    lobCooldown: def.kind === 'bulwark' ? def.lob.cooldownTicks : 0,
    blockFlash: 0,
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

/** How a hit lands: arrows knock back and flash, bursts only flash. A cold hit chills (029). */
export interface HitStyle {
  knock: boolean;
  flash: boolean;
  /** Recorded on the hit event so render can colour it; it changes no rule. */
  damageType: DamageType;
  /** A punch (023): its hit event is marked so render plays the punch's thud for it. */
  melee?: boolean;
}

const ARROW_HIT: HitStyle = { knock: true, flash: true, damageType: 'physical' };

/** Damages an enemy, knocking it along (dirX, dirY). A hit always aggros an idle or returning enemy. */
export function damageEnemy(
  state: SimState,
  e: EnemyState,
  amount: number,
  dirX: number,
  dirY: number,
  style: HitStyle = ARROW_HIT,
): void {
  const def = defOf(e);
  e.health = Math.max(0, e.health - amount);
  if (style.flash) e.flash = def.hitFlashTicks;
  // A frozen boss shrugs off knockback (029).
  if (style.knock && !frozenFast(e)) startKnock(e, dirX, dirY, def.hitKnockback, def.hitKnockTicks);
  if (style.damageType === 'cold' && e.health > 0) chillEnemy(state, e);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  state.events.hits.push({ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: amount, damageType: style.damageType, ...(style.melee ? { melee: true as const } : {}) });
}

/** True if a ground point is inside the enemy's hurtbox. */
export function inHurtbox(e: EnemyState, x: number, y: number): boolean {
  const { hurtbox } = defOf(e);
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
      const fa = defOf(a).feetBox;
      const fb = defOf(b).feetBox;
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
  const boxA = defOf(a).feetBox;
  const boxB = defOf(b).feetBox;
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
