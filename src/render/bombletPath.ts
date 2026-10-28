import { MINE_LOOK } from '../data/mineAssets';
import type { BombletState } from '../sim/mines';

// 038: where a cluster bomb's bomblet is drawn on its way out: from the burst to its spot over its delay, up an arc
// (MINE_LOOK.bombletArc px at its top). MineView draws its pellet there; 078's fuse glint sits on it. Pure.

/** The bomblet's ground point and drawn height now, in one reused answer. */
const AT = { x: 0, y: 0, lift: 0 };

export function bombletAt(b: Pick<BombletState, 'fromX' | 'fromY' | 'x' | 'y' | 'ticks' | 'delay'>): { x: number; y: number; lift: number } {
  const t = 1 - b.ticks / b.delay;
  AT.x = b.fromX + (b.x - b.fromX) * t;
  AT.y = b.fromY + (b.y - b.fromY) * t;
  AT.lift = 4 * MINE_LOOK.bombletArc * t * (1 - t);
  return AT;
}
