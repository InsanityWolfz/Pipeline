import { attackOf } from '../data/enemies';
import { defOf } from './champions';
import { targetable, type EnemyState } from './enemies';
import type { SimState } from './state';
import { stunEndsBeam } from './tenderAi';

// Stun (039, round 3: it replaces 036's stagger): one status for every source. The enemy
// can't move or act for its ticks and a wind-up is cancelled; a Boss or a Burrowed enemy
// can't be Stunned. Rollbreaker applies it for its own 40 ticks, a Charger's wall for its
// own 60 (039.6, in the Charger's dazed pose).
//
// The two keep their own timing, exactly as before 039 (039.6: "its behaviour doesn't
// change"). A roll's Stun is counted down by the enemy step (enemyAi.ts), frozen or not,
// and the enemy chases from the tick after it ends. A wall daze alone (`dazed`) is counted
// down by the Charger's own think (chargerAi.ts), so a freeze pauses it, the Charger keeps
// watching the player through it, and the tick it ends on is its first thinking one. A
// roll's Stun on a dazed Charger turns its daze into a roll's Stun for whichever is longer.

/** Ticks left in a recovery or a Stun already running: a new Stun never cuts them short. */
function holdLeft(e: EnemyState): number {
  // A daze's count includes the tick it ends on, which is a thinking one: a tick fewer is held.
  if (e.dazed) return e.stunned - 1;
  if (e.mode === 'recover') return Math.max(e.stunned, attackOf(defOf(e)).recoverTicks - e.modeTicks);
  return e.stunned;
}

/**
 * Stuns an enemy for `ticks` (or longer if it was already held longer), cancelling whatever it was doing: it holds in
 * recovery, or dazed in the `stun` pose (a Charger's wall), with an event. Returns whether it took.
 */
export function applyStun(state: SimState, e: EnemyState, ticks: number, pose: 'recover' | 'stun' = 'recover'): boolean {
  if (defOf(e).boss || !targetable(e)) return false;
  const hold = Math.max(holdLeft(e), ticks);
  stunEndsBeam(state, e);
  if (pose === 'stun') {
    e.mode = 'stun';
    e.modeTicks = 1;
  } else if (e.mode !== 'stun') {
    if (e.mode !== 'recover') e.modeTicks = 1;
    e.mode = 'recover';
  }
  e.dazed = pose === 'stun';
  e.stunned = hold;
  e.vx = 0;
  e.vy = 0;
  state.events.stuns.push({ id: e.id, x: e.x, y: e.y });
  return true;
}

/** Whether the enemy step holds this enemy for a roll's Stun this tick (a daze is the Charger's own). */
export function stunHolds(e: EnemyState): boolean {
  return e.stunned > 0 && !e.dazed;
}

/** A tick of a roll's Stun: it holds still; when it runs out the enemy goes back to chasing. */
export function holdStunned(e: EnemyState): [number, number] {
  e.stunned = Math.max(0, e.stunned - 1);
  if (e.stunned === 0) {
    e.mode = 'chase';
    e.modeTicks = 0;
  } else e.modeTicks += 1;
  return [0, 0];
}

/** A tick of a wall daze, from the Charger's think: whether it still holds (the caller holds it), or it ends and the Charger chases on this tick. */
export function dazeHolds(e: EnemyState): boolean {
  e.stunned = Math.max(0, e.stunned - 1);
  if (e.stunned > 0) return true;
  e.dazed = false;
  e.mode = 'chase';
  e.modeTicks = 0;
  return false;
}
