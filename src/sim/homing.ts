import { defOf } from './champions';
import { HOMING } from '../data/tags';
import type { ArrowState } from './arrows';
import { targetable } from './enemies';
import type { SimState } from './state';
import { rotate } from './volley';
import { playerStats } from './stats';

// Homing (029): a homing round locks at launch onto the living enemy in the
// player's room nearest the cursor, within HOMING.lockRadius of it, and each tick
// turns toward it by at most HOMING.turnDegrees, keeping its speed and range. With
// no target, or once its target is dead or gone, it flies straight.

/** The enemy a homing round fired at the cursor (x, y) locks onto, or null. */
export function lockTarget(state: SimState, x: number, y: number): number | null {
  let best: number | null = null;
  let nearest: number = HOMING.lockRadius;
  for (const e of state.enemies) {
    if (e.roomId !== state.roomId || e.health <= 0 || !targetable(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= nearest) {
      nearest = d;
      best = e.id;
    }
  }
  return best;
}

/** Steers each homing arrow toward its target's hurtbox, by at most the turn cap; drops a lost target for good. */
export function steerArrows(state: SimState): (arrow: ArrowState) => void {
  // Seeker's Lens (037) sharpens the turn, through the player's stats.
  const max = playerStats(state).ammo.homingTurn;
  return (arrow) => {
    if (arrow.targetId === null) return;
    // A target gone under the ground (035) is lost like a dead one.
    const e = state.enemies.find((en) => en.id === arrow.targetId && en.roomId === arrow.roomId && en.health > 0 && targetable(en));
    if (!e) {
      arrow.targetId = null;
      return;
    }
    const want = Math.atan2(e.y + defOf(e).hurtbox.offsetY - arrow.y, e.x - arrow.x);
    const have = Math.atan2(arrow.dy, arrow.dx);
    // The signed turn to the target, -180..180 degrees, clamped to the cap.
    const diff = ((((want - have) * 180) / Math.PI + 540) % 360) - 180;
    const turn = Math.max(-max, Math.min(max, diff));
    const [dx, dy] = rotate(arrow.dx, arrow.dy, turn);
    const len = Math.hypot(dx, dy);
    arrow.dx = dx / len;
    arrow.dy = dy / len;
  };
}
