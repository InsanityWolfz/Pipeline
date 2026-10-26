import { NODE_SPRITES } from '../data/assets';
import { EMBERWORKS_SPRITES } from '../data/emberworksAssets';
import { STORM_ROD_LOOK, STORMCROWN_SPRITES } from '../data/stormcrownAssets';
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

/** Each cycling node's looks while it isn't open (060: a cinder vent's closed and warning; 064: a storm rod's idle and warning, and its strike). */
const CYCLE_LOOKS: Readonly<Record<string, { closed: string; warning: string; strike?: string }>> = {
  'cinder-vent': EMBERWORKS_SPRITES.vent,
  'storm-rod': { closed: STORMCROWN_SPRITES.rod.idle, warning: STORMCROWN_SPRITES.rod.warning, strike: STORMCROWN_SPRITES.rod.strike },
};

/**
 * The vector frame a node shows: 060's cinder vent shows its closed and warning looks while it has uses; 064's storm
 * rod its idle and warning looks, and the strike over the first ticks of its charge.
 */
export function nodeFrame(n: { nodeId: string; uses: number; regrow: number; phase?: number }): string {
  const frames = NODE_SPRITES[n.nodeId];
  if (!frames) throw new Error(`No frames for node '${n.nodeId}'`);
  const phase = n.phase ?? 0;
  const vent = n.uses > 0 ? ventState({ nodeId: n.nodeId, phase }) : null;
  const looks = CYCLE_LOOKS[n.nodeId];
  if (looks && (vent === 'closed' || vent === 'warning')) return looks[vent];
  const cycle = nodeDef(n.nodeId).cycle;
  if (looks?.strike && cycle && vent === 'open' && phase - cycle.closedTicks - cycle.warnTicks < STORM_ROD_LOOK.strikeTicks) return looks.strike;
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
