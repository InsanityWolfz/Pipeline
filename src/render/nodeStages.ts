import { NODE_SPRITES } from '../data/assets';
import { EMBERWORKS_SPRITES } from '../data/emberworksAssets';
import { nodeDef, REGROW_STAGES } from '../data/nodes';
import { ventState } from '../sim/nodes';

// Which look a node shows (018), from the sim's uses and regrow timer, and which
// node a claimed pylon reaches for when its supply port produces a raw. Pure, so
// tests can pin them down.

/** The regrow stage for a depleted node: 0 bare remains just after depletion, up to REGROW_STAGES just before it returns. */
export function regrowStage(regrow: number, regrowTicks: number): number {
  const progress = 1 - Math.max(0, Math.min(regrow, regrowTicks)) / regrowTicks;
  return Math.min(REGROW_STAGES, Math.floor(progress * (REGROW_STAGES + 1)));
}

/** The vector frame a node shows: 060's cinder vent shows its closed and warning looks while it has uses. */
export function nodeFrame(n: { nodeId: string; uses: number; regrow: number; phase?: number }): string {
  const frames = NODE_SPRITES[n.nodeId];
  if (!frames) throw new Error(`No frames for node '${n.nodeId}'`);
  const vent = n.uses > 0 ? ventState({ nodeId: n.nodeId, phase: n.phase ?? 0 }) : null;
  if (vent === 'closed' || vent === 'warning') return EMBERWORKS_SPRITES.vent[vent];
  const frame = n.uses > 0 ? frames.uses[Math.min(n.uses, frames.uses.length) - 1] : frames.regrow[regrowStage(n.regrow, nodeDef(n.nodeId).regrowTicks)];
  if (!frame) throw new Error(`No frame for node '${n.nodeId}' at ${n.uses} uses`);
  return frame;
}

/** The nearest node in a room within `radius` px of a point whose harvest gives `itemId`, if any. */
export function harvestTarget<N extends { nodeId: string; roomId: string; x: number; y: number }>(
  nodes: readonly N[],
  roomId: string,
  itemId: string,
  at: { x: number; y: number },
  radius: number,
): N | undefined {
  let best: N | undefined;
  let bestD = Infinity;
  for (const n of nodes) {
    if (n.roomId !== roomId || nodeDef(n.nodeId).itemId !== itemId) continue;
    const d = Math.hypot(n.x - at.x, n.y - at.y);
    if (d <= radius && d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}
