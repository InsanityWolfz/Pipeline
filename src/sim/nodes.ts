import { NODE_CYCLE_SALT, nodeDef, type NodeCycle } from '../data/nodes';
import type { Room } from '../data/rooms';
import type { Rect } from './collision';
import { createRng, nextInt, type RngState } from './rng';
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
  /** 060: ticks into its open-and-shut cycle (a cinder vent's); 0 for a node without one. */
  phase: number;
}

export function createNode(id: number, nodeId: string, at: { x: number; y: number }, roomId: string, phase = 0): NodeState {
  return { id, nodeId, roomId, x: at.x, y: at.y, uses: nodeDef(nodeId).uses, regrow: 0, phase };
}

/** A cycle's length, ticks. */
const period = (c: NodeCycle): number => c.closedTicks + c.warnTicks + c.openTicks;

/**
 * The rooms' nodes at full uses, ids in placement order, room by room. A node with a cycle (060) starts at its own
 * point in it, drawn in placement order from `seed`'s own stream for cycles, so the main stream is untouched.
 */
export function createNodes(rooms: readonly Room[], seed = 0): NodeState[] {
  const rng = createRng((seed ^ NODE_CYCLE_SALT) >>> 0);
  // 064: a kind with its own salt (the storm rods) draws from its own stream, so the vents' points stay as they were.
  const own = new Map<number, RngState>();
  const streamOf = (cycle: NodeCycle): RngState => {
    if (cycle.salt === undefined) return rng;
    const s = own.get(cycle.salt) ?? createRng((seed ^ cycle.salt) >>> 0);
    own.set(cycle.salt, s);
    return s;
  };
  const placed = rooms.flatMap((room) => (room.nodes ?? []).map((p) => ({ ...p, roomId: room.id })));
  return placed.map((p, i) => {
    const cycle = nodeDef(p.nodeId).cycle;
    return createNode(i, p.nodeId, tileCentre(p), p.roomId, cycle ? nextInt(streamOf(cycle), 0, period(cycle) - 1) : 0);
  });
}

/** A cycling node's state (060): closed, its warning telegraph, or open; null for a node without a cycle. */
export function ventState(n: Pick<NodeState, 'nodeId' | 'phase'>): 'closed' | 'warning' | 'open' | null {
  const c = nodeDef(n.nodeId).cycle;
  if (!c) return null;
  return n.phase < c.closedTicks ? 'closed' : n.phase < c.closedTicks + c.warnTicks ? 'warning' : 'open';
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

/**
 * Counts down regrow timers; a node whose timer ends is back to full uses. A cycling node (060) moves on through its
 * cycle; lightning striking a storm rod (064) as it turns charged is recorded in `strikes`, and hurts nobody.
 */
export function stepNodes(nodes: NodeState[], strikes: { id: number; x: number; y: number }[] = []): void {
  for (const n of nodes) {
    const cycle = nodeDef(n.nodeId).cycle;
    if (cycle) {
      n.phase = (n.phase + 1) % period(cycle);
      if (cycle.strikes && n.phase === cycle.closedTicks + cycle.warnTicks) strikes.push({ id: n.id, x: n.x, y: n.y });
    }
    if (n.regrow === 0) continue;
    n.regrow -= 1;
    if (n.regrow === 0) n.uses = nodeDef(n.nodeId).uses;
  }
}

/** 051 (B.4): a node that can be harvested now glows; a used-up one doesn't until it regrows, nor (060) a vent that isn't open. */
export const harvestable = (n: Pick<NodeState, 'uses' | 'nodeId' | 'phase'>): boolean => n.uses > 0 && ventState(n) !== 'closed' && ventState(n) !== 'warning';
