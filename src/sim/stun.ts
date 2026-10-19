import { attackOf } from '../data/enemies';
import { defOf } from './champions';
import { targetable, type EnemyState } from './enemies';
import type { SimState } from './state';

// Stun (039, round 3: it replaces 036's stagger): one status for every source. The enemy
// can't move or act for its ticks and a wind-up is cancelled; a Boss or a Burrowed enemy
// can't be Stunned. Rollbreaker applies it for its own 40 ticks, a Charger's wall for its
// own 60 (039.6, in the Charger's dazed pose). The enemy step counts it down (enemyAi.ts).

/** Ticks left in a recovery or a Stun already running: a new Stun never cuts them short. */
function holdLeft(e: EnemyState): number {
  if (e.mode === 'recover') return Math.max(e.stunned, attackOf(defOf(e)).recoverTicks - e.modeTicks);
  return e.stunned;
}

/**
 * Stuns an enemy for `ticks` (or longer if it was already held longer), cancelling whatever it was doing: it holds in
 * recovery, or in the `stun` pose (a Charger's wall daze), with an event. Returns whether it took.
 */
export function applyStun(state: SimState, e: EnemyState, ticks: number, pose: 'recover' | 'stun' = 'recover'): boolean {
  if (defOf(e).boss || !targetable(e)) return false;
  const hold = Math.max(holdLeft(e), ticks);
  if (pose === 'stun') e.mode = 'stun';
  else if (e.mode !== 'stun') {
    if (e.mode !== 'recover') e.modeTicks = 1;
    e.mode = 'recover';
  }
  e.stunned = hold;
  e.vx = 0;
  e.vy = 0;
  state.events.stuns.push({ id: e.id, x: e.x, y: e.y });
  return true;
}

/** A tick of a Stun: it holds still; when it runs out the enemy goes back to chasing. */
export function holdStunned(e: EnemyState): [number, number] {
  e.stunned = Math.max(0, e.stunned - 1);
  if (e.stunned === 0) {
    e.mode = 'chase';
    e.modeTicks = 0;
  } else e.modeTicks += 1;
  return [0, 0];
}
