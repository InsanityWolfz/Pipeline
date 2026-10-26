import { defOf } from './champions';
import { enemyDef } from '../data/enemies';
import { hasTagKeyword } from '../data/tags';
import { HOMING } from '../data/tags';
import type { ArrowState } from './arrows';
import { immune, type EnemyState } from './enemies';
import type { SimState } from './state';
import { rotate } from './volley';
import { roundEmission, shotEmission } from './emissions';
import { statOf } from './statResolve';

// Homing (029): a homing round locks at launch onto the living enemy in the
// player's room nearest the cursor, within HOMING.lockRadius of it, and each tick
// turns toward it by at most HOMING.turnDegrees, keeping its speed and range. With
// no target, or once its target is dead or gone, it flies straight (064: unless it locked at launch and a Conductor is
// in reach: relock below).

/**
 * Whether a homing round can lock onto or follow an enemy: any it can ever hit, so not an immune one (a Burrower gone
 * under). 068: the Conductor in its blink-in window is followed though it can't be hit yet, so a round locked on it
 * follows it through a blink (064.22) and lands once the window ends.
 */
const trackable = (e: EnemyState): boolean => !immune(e);

/** The enemy a homing round fired at the cursor (x, y) locks onto, or null: the nearest within its lock radius (039: resolveStat). */
export function lockTarget(state: SimState, ammoId: string, x: number, y: number): number | null {
  let best: number | null = null;
  let nearest = statOf(state, 'lock-radius', roundEmission(ammoId), HOMING.lockRadius);
  for (const e of state.enemies) {
    if (e.roomId !== state.roomId || e.health <= 0 || !trackable(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= nearest) {
      nearest = d;
      best = e.id;
    }
  }
  return best;
}

/**
 * 064: a homing round that locked on at launch and has lost its target re-locks onto the nearest enemy that asks for it
 * (the Conductor's `homingRelock`) within the round's lock radius of it (the homing rules' radius, from the round, not
 * the cursor), in the player's room. A round that never locked flies straight, as ever.
 */
function relock(state: SimState, arrow: ArrowState): number | null {
  if (!arrow.lockedAtLaunch || arrow.roomId !== state.roomId || !hasTagKeyword(arrow.ammoId, 'homing')) return null;
  let best: number | null = null;
  let nearest = statOf(state, 'lock-radius', roundEmission(arrow.ammoId), HOMING.lockRadius);
  for (const e of state.enemies) {
    if (e.roomId !== arrow.roomId || e.health <= 0 || !trackable(e) || !('homingRelock' in enemyDef(e.enemyId))) continue;
    const d = Math.hypot(e.x - arrow.x, e.y - arrow.y);
    if (d <= nearest) {
      nearest = d;
      best = e.id;
    }
  }
  return best;
}

/** Steers each homing arrow toward its target's hurtbox, by at most its turn rate; drops a lost target (064: re-locking onto the Conductor in reach). */
export function steerArrows(state: SimState): (arrow: ArrowState) => void {
  return (arrow) => {
    // A target gone under the ground (035) is lost like a dead one; a lost round keeps looking for a Conductor (064).
    const e = arrow.targetId === null ? undefined : state.enemies.find((en) => en.id === arrow.targetId && en.roomId === arrow.roomId && en.health > 0 && trackable(en));
    if (!e) {
      arrow.targetId = relock(state, arrow);
      return;
    }
    const want = Math.atan2(e.y + defOf(e).hurtbox.offsetY - arrow.y, e.x - arrow.x);
    const have = Math.atan2(arrow.dy, arrow.dx);
    // The signed turn to the target, -180..180 degrees, clamped to the cap.
    const diff = ((((want - have) * 180) / Math.PI + 540) % 360) - 180;
    // Seeker's Lens (037) sharpens the turn: Homing's turn rate through resolveStat (039).
    const max = statOf(state, 'turn-rate', shotEmission(arrow), HOMING.turnDegrees);
    const turn = Math.max(-max, Math.min(max, diff));
    const [dx, dy] = rotate(arrow.dx, arrow.dy, turn);
    const len = Math.hypot(dx, dy);
    arrow.dx = dx / len;
    arrow.dy = dy / len;
  };
}
