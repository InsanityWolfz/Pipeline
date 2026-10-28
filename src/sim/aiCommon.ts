import { TICK_RATE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { attackOf, type BulwarkDef, type ConductorDef, type EnemyDef, type ForgewrightDef } from '../data/enemies';
import { defOf } from './champions';
import { unit } from './direction';
import { arenaWaits, inArenaWithPlayer } from './arenaWait';
import { aggro, type EnemyState } from './enemies';
import type { SimState } from './state';

// Pieces every enemy AI shares: the aggro box, walking, going home, and the
// wind-up → attack → recover cycle. The attack itself lands in each AI's file.

/** True if the enemy's feet are inside the view-sized box centred on the player's feet. */
export function inAggroBox(e: Pick<EnemyState, 'x' | 'y'>, player: { x: number; y: number }): boolean {
  return Math.abs(e.x - player.x) <= VIEW_WIDTH / 2 && Math.abs(e.y - player.y) <= VIEW_HEIGHT / 2;
}

/**
 * 073: an enemy starts an attack (any wind-up, a kiln-tender's heal beam too) only while it is on screen: in the
 * player's room, inside the aggro box. Anything inside a boss arena with the player follows the boss rules and may
 * start from anywhere in it (073.5). Held, an AI does what it does while its cooldown runs (073.2).
 */
export function mayStart(state: Pick<SimState, 'player' | 'roomId'>, e: Pick<EnemyState, 'x' | 'y' | 'roomId'>): boolean {
  return e.roomId === state.roomId && (inAggroBox(e, state.player) || inArenaWithPlayer(state, e));
}

/** One tick's walk along (dx, dy), never past the target. */
export function toward(dx: number, dy: number, def: EnemyDef): [number, number] {
  const step = Math.min(def.walkSpeed / TICK_RATE, Math.hypot(dx, dy));
  const [ux, uy] = unit(dx, dy);
  return [ux * step, uy * step];
}

/** Its band from the player (061's kiln-tender, 065's storm sentinel): back off when closer than `min`, close in when farther than `max`, else hold. */
export function keepDistance(def: EnemyDef, keep: { min: number; max: number }, dx: number, dy: number): [number, number] {
  const dist = Math.hypot(dx, dy);
  if (dist < keep.min) return toward(-dx, -dy, def);
  if (dist > keep.max) return toward(dx, dy, def);
  return [0, 0];
}

/** Walks home; once there it idles at full health. */
export function walkHome(e: EnemyState, def: EnemyDef): [number, number] {
  const dx = e.homeX - e.x;
  const dy = e.homeY - e.y;
  if (Math.hypot(dx, dy) <= def.homeTolerance) {
    e.mode = 'idle';
    e.health = def.maxHealth;
    return [0, 0];
  }
  return toward(dx, dy, def);
}

export function enter(e: EnemyState, mode: EnemyState['mode']): void {
  e.mode = mode;
  e.modeTicks = 1;
}

export function hold(e: EnemyState): [number, number] {
  e.modeTicks += 1;
  return [0, 0];
}

/** Locks the attack direction toward (dx, dy) (keeping the old one at zero length) and starts a wind-up. */
export function startWindup(e: EnemyState, def: EnemyDef, dx: number, dy: number): void {
  const [ux, uy] = unit(dx, dy);
  if (ux !== 0 || uy !== 0) {
    e.swipeDirX = ux;
    e.swipeDirY = uy;
  }
  e.cooldown = attackOf(def).cooldownTicks;
  enter(e, 'windup');
}

/**
 * Runs a wind-up, attack or recover in progress: `land` fires as the attack
 * pose starts. Returns the tick's move, or null once it's back to chasing (or
 * wasn't attacking), so the caller moves on. `windupTicks` overrides the def's (041.16: an enraged Bulwark's pound).
 */
export function stepAttack(e: EnemyState, def: EnemyDef, land: () => void, windupTicks?: number): [number, number] | null {
  const timing = attackOf(def);
  if (e.mode === 'windup') {
    if (e.modeTicks < (windupTicks ?? timing.windupTicks)) return hold(e);
    enter(e, 'swipe');
    land();
    return [0, 0];
  }
  if (e.mode === 'swipe') {
    if (e.modeTicks < timing.swipeTicks) return hold(e);
    enter(e, 'recover');
    return [0, 0];
  }
  if (e.mode === 'recover') {
    if (e.modeTicks < timing.recoverTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  return null;
}

/** Past the off-screen grace, a chasing enemy heads home. Returns its move if so. */
export function leash(e: EnemyState, def: Exclude<EnemyDef, BulwarkDef | ForgewrightDef | ConductorDef>): [number, number] | null {
  if (e.offScreenTicks < def.leashGraceTicks) return null;
  e.mode = 'return';
  e.modeTicks = 0;
  return walkHome(e, def);
}

/**
 * Aggro and leash bookkeeping shared by every kind: wakes an idle or returning
 * enemy that `sees` the player, counts ticks off screen. Returns a move to make
 * instead of thinking further (idle or walking home), or null to go on.
 */
export function engage(state: SimState, e: EnemyState, sees: boolean): [number, number] | null {
  // A player in another room is never seen.
  // A dying player is gone as far as enemies care: chasers turn for home at once.
  const here = e.roomId === state.roomId && state.player.dying === 0;
  if (!here && e.mode === 'chase' && state.player.dying > 0) {
    e.mode = 'return';
    e.modeTicks = 0;
  }
  // 059: posted in a boss arena, it waits for the player to come through the door, and goes back to its post once
  // they're out (src/sim/arenaWait.ts).
  const waits = arenaWaits(state, e);
  if (waits && e.mode === 'chase') {
    e.mode = 'return';
    e.modeTicks = 0;
  }
  // 073.5 (Shaun: "the boss rules apply to its attack and aggro"): inside a boss arena with the player, it wakes and
  // stays in the fight as the Bulwark does, on screen or not.
  const inArena = here && inArenaWithPlayer(state, e);
  if (e.mode === 'idle' || e.mode === 'return') {
    // Anything on screen wakes, however many (Shaun, 017: a player who rounds up a crowd gets the crowd).
    if (!here || !(sees || inArena) || waits) return e.mode === 'return' ? walkHome(e, defOf(e)) : [0, 0];
    aggro(e);
  }
  e.offScreenTicks = here && (inAggroBox(e, state.player) || inArena) ? 0 : e.offScreenTicks + 1;
  return null;
}

/** Absorbs float error so a player exactly on an arc's edge is hit. */
const ARC_EPSILON = 1e-9;

/** True if a point (dx, dy) from an attacker's feet is within `reach` and inside the `arcDegrees` arc along the unit (dirX, dirY): a Husk's swipe, a Shardback's bash. */
export function inArc(dx: number, dy: number, dirX: number, dirY: number, reach: number, arcDegrees: number): boolean {
  const dist = Math.hypot(dx, dy);
  if (dist > reach) return false;
  const half = (arcDegrees * Math.PI) / 360;
  return dist === 0 || (dx * dirX + dy * dirY) / dist >= Math.cos(half) - ARC_EPSILON;
}
