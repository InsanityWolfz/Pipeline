import { TICK_RATE } from '../data/config';
import { defOf } from './champions';
import type { EnemyState } from './enemies';
import type { SimState } from './state';

// The shield rule (034, shared with 035's Shardback): a shielded enemy faces a continuous
// angle and turns toward its target at no more than `turnDegPerSec`, never snapping. A
// straight shot or a punch whose hit point's bearing from its centre lies within
// `arcDegrees / 2` of that angle is blocked. Lobbed bursts never ask: they come from above.

const RAD = Math.PI / 180;

/** The signed smallest turn from angle `a` to angle `b`, radians, in (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d <= -Math.PI) d += 2 * Math.PI;
  if (d > Math.PI) d -= 2 * Math.PI;
  return d;
}

/**
 * True if a hit at (x, y) lands on the enemy's shield: its bearing from the enemy's centre (its hurtbox's middle, so a
 * shot clipping the body's side from the front still meets the shield) within half its arc of its facing. Never for an
 * enemy without one.
 */
export function shieldBlocks(e: EnemyState, x: number, y: number, fromX = 0, fromY = 0): boolean {
  const def = defOf(e);
  const shield = def.shield;
  if (!shield) return false;
  const cy = e.y + def.hurtbox.offsetY;
  // A hit right on its centre has no bearing: the side it came from decides.
  const [bx, by] = x === e.x && y === cy ? [fromX, fromY] : [x - e.x, y - cy];
  if (bx === 0 && by === 0) return false;
  return Math.abs(angleDiff(e.angle, Math.atan2(by, bx))) <= (shield.arcDegrees / 2) * RAD + 1e-9;
}

/** Turns a shielded enemy toward a world point by at most one tick's `turnDegPerSec`. */
export function turnToward(e: EnemyState, x: number, y: number): void {
  const shield = defOf(e).shield;
  if (!shield || (x === e.x && y === e.y)) return;
  const step = (shield.turnDegPerSec * RAD) / TICK_RATE;
  const d = angleDiff(e.angle, Math.atan2(y - e.y, x - e.x));
  e.angle += Math.max(-step, Math.min(step, d));
}

/** Records a blocked hit (034): render shows a brass spark and a clang there. */
export function recordBlock(state: SimState, e: EnemyState, x: number, y: number): void {
  state.events.blocked.push({ id: e.id, x, y });
  e.blockFlash = defOf(e).hitFlashTicks;
}
