import { nodeDef } from '../data/nodes';
import type { Room } from '../data/rooms';
import type { Rect } from './collision';
import { tileCentre } from './tiles';

// Gathering nodes as plain data: uses left and the regrow timer. Harvesting is in harvest.ts.

export interface NodeState {
  id: number;
  nodeId: string;
  roomId: string;
  /** Centre of its base, px. */
  x: number;
  y: number;
  /** Harvests left; 0 is depleted. */
  uses: number;
  /** Ticks until a depleted node is back to full; 0 when not regrowing. */
  regrow: number;
}

export function createNode(id: number, nodeId: string, at: { x: number; y: number }, roomId: string): NodeState {
  return { id, nodeId, roomId, x: at.x, y: at.y, uses: nodeDef(nodeId).uses, regrow: 0 };
}

/** The rooms' nodes at full uses, ids in placement order, room by room. */
export function createNodes(rooms: readonly Room[]): NodeState[] {
  const placed = rooms.flatMap((room) => (room.nodes ?? []).map((p) => ({ ...p, roomId: room.id })));
  return placed.map((p, i) => createNode(i, p.nodeId, tileCentre(p), p.roomId));
}

/** The solid base of every node in a room, full or depleted. */
export function nodeRects(nodes: readonly NodeState[], roomId: string): Rect[] {
  return nodes.filter((n) => n.roomId === roomId).map((n) => ({ x: n.x, y: n.y, ...nodeDef(n.nodeId).feetBox }));
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

/** 051 (B.4): a node that can be harvested now glows; a used-up one doesn't until it regrows. */
export const harvestable = (n: Pick<NodeState, 'uses'>): boolean => n.uses > 0;
