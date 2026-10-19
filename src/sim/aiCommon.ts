import { TICK_RATE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { attackOf, type EnemyDef } from '../data/enemies';
import { defOf } from './champions';
import { unit } from './direction';
import { aggro, type EnemyState } from './enemies';
import type { SimState } from './state';

// Pieces every enemy AI shares: the aggro box, walking, going home, and the
// wind-up → attack → recover cycle. The attack itself lands in each AI's file.

/** True if the enemy's feet are inside the view-sized box centred on the player's feet. */
export function inAggroBox(e: EnemyState, player: { x: number; y: number }): boolean {
  return Math.abs(e.x - player.x) <= VIEW_WIDTH / 2 && Math.abs(e.y - player.y) <= VIEW_HEIGHT / 2;
}

/** One tick's walk along (dx, dy), never past the target. */
export function toward(dx: number, dy: number, def: EnemyDef): [number, number] {
  const step = Math.min(def.walkSpeed / TICK_RATE, Math.hypot(dx, dy));
  const [ux, uy] = unit(dx, dy);
  return [ux * step, uy * step];
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
 * wasn't attacking), so the caller moves on.
 */
export function stepAttack(e: EnemyState, def: EnemyDef, land: () => void): [number, number] | null {
  const timing = attackOf(def);
  if (e.mode === 'windup') {
    if (e.modeTicks < timing.windupTicks) return hold(e);
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
export function leash(e: EnemyState, def: EnemyDef): [number, number] | null {
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
  if (e.mode === 'idle' || e.mode === 'return') {
    // Anything on screen wakes, however many (Shaun, 017: a player who rounds up a crowd gets the crowd).
    if (!here || !sees) return e.mode === 'return' ? walkHome(e, defOf(e)) : [0, 0];
    aggro(e);
  }
  e.offScreenTicks = here && inAggroBox(e, state.player) ? 0 : e.offScreenTicks + 1;
  return null;
}
