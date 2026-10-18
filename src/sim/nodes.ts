import { nodeDef } from '../data/nodes';
import type { Room } from '../data/rooms';
import type { Rect } from './collision';
import { tileCentre } from './state';

// Gathering nodes as plain data: uses left and the regrow timer. Harvesting is in harvest.ts.

export interface NodeState {
  id: number;
  nodeId: string;
  /** Centre of its base, px. */
  x: number;
  y: number;
  /** Harvests left; 0 is depleted. */
  uses: number;
  /** Ticks until a depleted node is back to full; 0 when not regrowing. */
  regrow: number;
}

export function createNode(id: number, nodeId: string, at: { x: number; y: number }): NodeState {
  return { id, nodeId, x: at.x, y: at.y, uses: nodeDef(nodeId).uses, regrow: 0 };
}

/** The room's nodes at full uses, ids in placement order. */
export function createNodes(room: Room): NodeState[] {
  return (room.nodes ?? []).map((p, i) => createNode(i, p.nodeId, tileCentre(p)));
}

/** Every node's solid base, full or depleted. */
export function nodeRects(nodes: readonly NodeState[]): Rect[] {
  return nodes.map((n) => ({ x: n.x, y: n.y, ...nodeDef(n.nodeId).feetBox }));
}

/** Uses up one harvest; at 0 the node is depleted and starts regrowing. */
export function useNode(n: NodeState): void {
  n.uses = Math.max(0, n.uses - 1);
  if (n.uses === 0) n.regrow = nodeDef(n.nodeId).regrowTicks;
}

/** Counts down regrow timers; a node whose timer ends is back to full uses. */
export function stepNodes(nodes: NodeState[]): void {
  for (const n of nodes) {
    if (n.regrow === 0) continue;
    n.regrow -= 1;
    if (n.regrow === 0) n.uses = nodeDef(n.nodeId).uses;
  }
}
