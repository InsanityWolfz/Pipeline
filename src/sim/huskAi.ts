import { VIEW_HEIGHT, VIEW_WIDTH, TICK_RATE } from '../data/config';
import { enemyDef, type EnemyDef } from '../data/enemies';
import type { Room } from '../data/rooms';
import { moveBox } from './collision';
import { aimFacing, unit } from './direction';
import { aggro, separate, type EnemyState } from './enemies';
import { damagePlayer } from './health';
import { takeKnock } from './knockback';
import type { SimState } from './state';

// Melee enemy behaviour, RotMG style: aggro when on screen or hit, chase while
// on screen, head home after a grace period off screen, re-aggro on the way.
// A wind-up locks the swipe direction; the swipe lands once, then recovers.

/** True if the enemy's feet are inside the view-sized box centred on the player's feet. */
export function inAggroBox(e: EnemyState, player: { x: number; y: number }): boolean {
  return Math.abs(e.x - player.x) <= VIEW_WIDTH / 2 && Math.abs(e.y - player.y) <= VIEW_HEIGHT / 2;
}

/** Thinks, moves and faces every enemy, then pushes overlapping bodies apart. */
export function stepEnemies(state: SimState, room: Room): void {
  for (const e of state.enemies) {
    const def = enemyDef(e.enemyId);
    if (e.cooldown > 0) e.cooldown -= 1;
    if (e.flash > 0) e.flash -= 1;
    const [mx, my] = think(state, e, def);
    const [kx, ky] = takeKnock(e);
    const { hitX, hitY } = moveBox(room, e, def.feetBox, mx + kx, my + ky);
    e.vx = hitX ? 0 : mx;
    e.vy = hitY ? 0 : my;
    e.facing = swinging(e) ? aimFacing(e.swipeDirX, e.swipeDirY, e.facing) : aimFacing(e.vx, e.vy, e.facing);
  }
  separate(state.enemies, room);
}

function swinging(e: EnemyState): boolean {
  return e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover';
}

/** Advances the enemy's mode and returns this tick's own move, px. */
function think(state: SimState, e: EnemyState, def: EnemyDef): [number, number] {
  const onScreen = inAggroBox(e, state.player);
  if (e.mode === 'idle' || e.mode === 'return') {
    if (!onScreen) return e.mode === 'return' ? walkHome(e, def) : [0, 0];
    aggro(e);
  }
  e.offScreenTicks = onScreen ? 0 : e.offScreenTicks + 1;

  const { swipe } = def;
  if (e.mode === 'windup') {
    if (e.modeTicks < swipe.windupTicks) return hold(e);
    enter(e, 'swipe');
    landSwipe(state, e, def);
    return [0, 0];
  }
  if (e.mode === 'swipe') {
    if (e.modeTicks < swipe.swipeTicks) return hold(e);
    enter(e, 'recover');
    return [0, 0];
  }
  if (e.mode === 'recover') {
    if (e.modeTicks < swipe.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  return chase(state, e, def);
}

function chase(state: SimState, e: EnemyState, def: EnemyDef): [number, number] {
  if (e.offScreenTicks >= def.leashGraceTicks) {
    e.mode = 'return';
    e.modeTicks = 0;
    return walkHome(e, def);
  }
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (Math.hypot(dx, dy) > def.swipe.triggerRange) return toward(dx, dy, def);
  if (e.cooldown === 0) {
    const [ux, uy] = unit(dx, dy);
    e.swipeDirX = ux === 0 && uy === 0 ? e.swipeDirX : ux;
    e.swipeDirY = ux === 0 && uy === 0 ? e.swipeDirY : uy;
    e.cooldown = def.swipe.cooldownTicks;
    enter(e, 'windup');
  }
  // In range: stand and swing, or wait out the cooldown.
  return [0, 0];
}

function walkHome(e: EnemyState, def: EnemyDef): [number, number] {
  const dx = e.homeX - e.x;
  const dy = e.homeY - e.y;
  if (Math.hypot(dx, dy) <= def.homeTolerance) {
    e.mode = 'idle';
    e.health = def.maxHealth;
    return [0, 0];
  }
  return toward(dx, dy, def);
}

/** One tick's walk along (dx, dy), never past the target. */
function toward(dx: number, dy: number, def: EnemyDef): [number, number] {
  const step = Math.min(def.walkSpeed / TICK_RATE, Math.hypot(dx, dy));
  const [ux, uy] = unit(dx, dy);
  return [ux * step, uy * step];
}

function enter(e: EnemyState, mode: EnemyState['mode']): void {
  e.mode = mode;
  e.modeTicks = 1;
}

function hold(e: EnemyState): [number, number] {
  e.modeTicks += 1;
  return [0, 0];
}

/** Hits the player if their feet are inside the swipe arc, measured from where the enemy stands now. */
function landSwipe(state: SimState, e: EnemyState, def: EnemyDef): void {
  const { swipe } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > swipe.reach) return;
  const halfArc = (swipe.arcDegrees * Math.PI) / 360;
  // Absorbs float error so a player exactly on the arc's edge is hit.
  const EPSILON = 1e-9;
  if (dist > 0 && (dx * e.swipeDirX + dy * e.swipeDirY) / dist < Math.cos(halfArc) - EPSILON) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, swipe.damage, kx, ky, swipe.knockback, swipe.knockTicks);
}
