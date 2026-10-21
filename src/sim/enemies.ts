import type { DamageType } from '../data/ammo';
import { TILE_SIZE } from '../data/config';
import { OVERWORLD_ROOM, ringOf } from '../data/overworld';
import type { Ring } from '../data/ringScale';
import { ENEMIES, enemyDef } from '../data/enemies';
import { CHAMPIONS } from '../data/champions';
import { defOf } from './champions';
import type { Room } from '../data/rooms';
import { moveBox, type Rect } from './collision';
import { chillEnemy } from './cold';
import { straightAmmo } from '../data/ammo';
import { startKnock, type Knockable } from './knockback';
import type { Facing } from './player';
import type { SimState } from './state';

// Enemies as plain data: creation, damage and bodies. Their behaviour is in enemyAi.ts.

/**
 * `lob` and `throw` (034): the Bulwark rearing back, then holding the throw. 035: `stun`, a Charger dazed by a wall;
 * `dig`, a Burrower digging in; `peek`, a Sniper stepping out of cover to a clear line. 041: the Bulwark's `roar` as it
 * enrages, and its rear stomp's `stomp-windup`, `stomp` and `stomp-recover`.
 */
export type EnemyMode = 'idle' | 'chase' | 'windup' | 'swipe' | 'recover' | 'return' | 'lob' | 'throw' | 'stun' | 'dig' | 'peek' | 'roar' | 'stomp-windup' | 'stomp' | 'stomp-recover';

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
  /** Its danger ring (041): its home tile's, set when it's created and kept as it walks. Its def is scaled by it. */
  ring: Ring;
  /** Its continuous facing, radians (034): a shielded enemy's shield points this way and turns, never snapping. */
  angle: number;
  /** Ticks before its next bomb lob (034: the Bulwark's). */
  lobCooldown: number;
  /** Ticks of shield flash left after a blocked hit (034), for render. */
  blockFlash: number;
  /** A Burrower under the ground (035): nothing can hit it, and it neither blocks nor is pushed apart. */
  underground: boolean;
  /** Where its attack is anchored (035): a Charger's lane start, a Burrower's locked spot, px. */
  spotX: number;
  spotY: number;
  /** A Charger's charge has struck the player (035): once per charge. */
  struck: boolean;
  /** Its last move ran into something solid (035: a charging Charger is stunned by it). */
  bumped: boolean;
  /** Ticks left Stunned (039: Rollbreaker's roll, or a Charger's wall daze): it holds and doesn't act. */
  stunned: number;
  /** Its Stun is a Charger's wall daze alone (039.6), which keeps the daze's own timing: see stun.ts. */
  dazed: boolean;
  /** Ticks left rising from the ground (041: the Bulwark's adds): it can't act, be hit or block until 0. */
  rising: number;
  /** The Bulwark's fight (041): enraged below 30%; its rear-stomp counter and cooldown; its adds risen this fight. */
  enraged: boolean;
  behind: number;
  stompCooldown: number;
  addsRisen: boolean;
  /** 041.16: ticks before its next pair of adds (counted once the first have risen); its back wave's countdown, the ticks its wind-up has run (0: none), and the unit direction it's locked to. */
  addsCooldown: number;
  waveCooldown: number;
  waveTicks: number;
  waveDirX: number;
  waveDirY: number;
}

/** A home's danger ring (041, the rule 037's XP used): `ringOf` its tile in the overworld, 0 in any other room. */
export const ringAt = (roomId: string, x: number, y: number): Ring => (roomId === OVERWORLD_ROOM ? ringOf(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) : 0);

export function createEnemy(id: number, enemyId: string, at: { x: number; y: number }, roomId: string, group = ''): EnemyState {
  const def = enemyDef(enemyId);
  const ring = ringAt(roomId, at.x, at.y);
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
    health: defOf({ enemyId, champion: null, ring }).maxHealth,
    swipeDirX: 0,
    swipeDirY: 1,
    flash: 0,
    chill: 0,
    chillTicks: 0,
    frozen: 0,
    refreeze: 0,
    champion: null,
    ring,
    angle: Math.PI / 2,
    lobCooldown: def.kind === 'bulwark' ? def.lob.cooldownTicks : 0,
    blockFlash: 0,
    underground: false,
    spotX: at.x,
    spotY: at.y,
    struck: false,
    bumped: false,
    stunned: 0,
    dazed: false,
    rising: 0,
    enraged: false,
    behind: 0,
    stompCooldown: 0,
    addsRisen: false,
    addsCooldown: 0,
    waveCooldown: def.kind === 'bulwark' ? def.wave.everyTicks : 0,
    waveTicks: 0,
    waveDirX: 0,
    waveDirY: 0,
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

/** How a hit lands: a round's Knockback (039: px before the enemy's weight; 0 for none) and its flash. A cold hit chills (029). */
export interface HitStyle {
  knock: number;
  flash: boolean;
  /** Recorded on the hit event so render can colour it; it changes no rule. */
  damageType: DamageType;
  /** A punch (023): its hit event is marked so render plays the punch's thud for it. */
  melee?: boolean;
}

/** An arrow's hit, with its Knockback. */
const ARROW_HIT: HitStyle = { knock: straightAmmo('arrow').knockback, flash: true, damageType: 'physical' };

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
  // Knockback (039): the round's push times the enemy's weight (a boss weighs 0, frozen or not).
  const push = style.knock * def.weight;
  if (push > 0) startKnock(e, dirX, dirY, push, def.hitKnockTicks);
  if (style.damageType === 'cold' && e.health > 0) chillEnemy(state, e);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  state.events.hits.push({ target: 'enemy', id: e.id, x: e.x, y: e.y, damage: amount, damageType: style.damageType, ...(style.melee ? { melee: true as const } : {}) });
}

/** Whether shots, punches and bursts can reach it (035: not a Burrower underground; 041: not an add still rising). */
export const targetable = (e: Pick<EnemyState, 'underground' | 'rising'>): boolean => !e.underground && e.rising <= 0;

/** It passes through other enemies (035): a Burrower underground, a Charger mid-charge, an add rising (041). Separation leaves it be. */
export const passesThrough = (e: EnemyState): boolean => e.underground || e.rising > 0 || (e.mode === 'swipe' && defOf(e).kind === 'charger');

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

/** The largest side any enemy's feet box can have, px: a champion's scaled up (032), a boss's its own. */
const LARGEST_FEET = Math.max(...Object.values(ENEMIES).map((d) => Math.max(d.feetBox.w, d.feetBox.h) * (d.boss ? 1 : CHAMPIONS.scale)));

/**
 * Bodies further apart than this on both axes at the tick's start can't be touching by the time their pair comes up,
 * px: twice two of the largest feet boxes side by side, room for any two to touch plus the pushes in between (053: the
 * round world's many packs made the all-pairs check the tick's biggest cost).
 */
export const NEAR = 4 * LARGEST_FEET;

/** Every pair (i < j) of same-room enemies within NEAR on both axes, in array order, found through a grid of NEAR cells. */
function nearPairs(enemies: readonly EnemyState[]): [number, number][] {
  const cells = new Map<string, number[]>();
  const cellOf = (e: EnemyState, dx: number, dy: number) => `${e.roomId}|${Math.floor(e.x / NEAR) + dx}|${Math.floor(e.y / NEAR) + dy}`;
  enemies.forEach((e, i) => {
    const key = cellOf(e, 0, 0);
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  });
  const pairs: [number, number][] = [];
  enemies.forEach((a, i) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of cells.get(cellOf(a, dx, dy)) ?? []) {
          const b = enemies[j];
          if (j > i && b && Math.abs(b.x - a.x) <= NEAR && Math.abs(b.y - a.y) <= NEAR) pairs.push([i, j]);
        }
      }
    }
  });
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

/**
 * Pushes overlapping enemies in the same room apart along the axis of least overlap,
 * half each. If a wall stops one, the other takes the rest. Runs in array order, so
 * it's deterministic; only pairs near each other at the start are tried (053), in the same order.
 */
export function separate(enemies: EnemyState[], bodies: (roomId: string) => RoomBodies): void {
  for (const [i, j] of nearPairs(enemies)) {
    const a = enemies[i];
    const b = enemies[j];
    if (!a || !b || a.roomId !== b.roomId || passesThrough(a) || passesThrough(b)) continue;
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
