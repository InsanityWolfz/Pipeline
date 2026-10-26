import { HARVEST_REACH, nodeDef } from '../data/nodes';
import { FEET_BOX } from '../data/player';
import { layItem, scatterPoint } from './drops';
import type { Command } from './input';
import { isRolling } from './movement';
import { harvestable, nodeRects, useNode, type NodeState } from './nodes';
import { roomById, type SimState } from './state';

// Harvesting a gathering node with E: stand in reach and keep still until it's done. 070: with E still held as a
// channel ends, the next channel starts on the same node, until it's empty, the player moves or E is let go.

export interface HarvestState {
  /** The node being harvested (its state id). */
  nodeId: number;
  /** Ticks into the harvest, counting the E tick as 1. */
  progress: number;
}

/** Gap between the player's feet box and a node's box, px; 0 when they touch. */
function gapTo(state: SimState, n: NodeState): number {
  const box = nodeDef(n.nodeId).feetBox;
  const p = state.player;
  const gapX = Math.max(0, Math.abs(n.x - p.x) - (FEET_BOX.w + box.w) / 2);
  const gapY = Math.max(0, Math.abs(n.y - p.y) - (FEET_BOX.h + box.h) / 2);
  return Math.hypot(gapX, gapY);
}

/** The node is in reach of the player's feet. */
const inReach = (state: SimState, n: NodeState): boolean => gapTo(state, n) <= HARVEST_REACH;

/** The nearest harvestable node in reach in the player's room, by centre distance; the first placed wins ties. */
export function nodeInReach(state: SimState): NodeState | undefined {
  const p = state.player;
  let best: NodeState | undefined;
  let bestDist = Infinity;
  for (const n of state.nodes) {
    if (n.roomId !== state.roomId || !harvestable(n) || !inReach(state, n)) continue;
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}

/** Ends a harvest in progress; its progress is lost and the node keeps its use. */
export function cancelHarvest(state: SimState): void {
  state.harvest = null;
}

/** Anything the player does this tick other than standing still ends a harvest. */
function interrupted(state: SimState, cmd: Command): boolean {
  // Without the tube (012) fire, use and a slot pick do nothing, so they don't interrupt either.
  const switching = state.hasTube && cmd.selectSlot !== null && cmd.selectSlot !== state.hotbar.selected;
  return cmd.moveX !== 0 || cmd.moveY !== 0 || isRolling(state.player) || (state.hasTube && (cmd.fire || cmd.use)) || switching;
}

/** Runs after the player and enemies act, before the tube. */
export function stepHarvest(state: SimState, cmd: Command): void {
  if (interrupted(state, cmd)) {
    cancelHarvest(state);
    return;
  }
  const harvest = state.harvest;
  if (harvest) {
    const n = state.nodes.find((node) => node.id === harvest.nodeId);
    // 060: a vent that shuts mid-harvest loses it.
    if (n && !harvestable(n)) {
      cancelHarvest(state);
      return;
    }
    harvest.progress += 1;
    if (!n || harvest.progress < nodeDef(n.nodeId).harvestTicks) return;
    complete(state, n);
    // The next channel's first tick is the next one, so each channel takes the full harvest time.
    if (cmd.interactHeld && harvestable(n) && inReach(state, n)) state.harvest = { nodeId: n.id, progress: 0 };
    return;
  }
  if (!cmd.interact) return;
  const n = nodeInReach(state);
  if (!n) return;
  state.harvest = { nodeId: n.id, progress: 1 };
}

function complete(state: SimState, n: NodeState): void {
  const def = nodeDef(n.nodeId);
  state.harvest = null;
  useNode(n);
  // Drops land on the side facing the player, never inside a node.
  const rects = nodeRects(state.nodes, n.roomId);
  const p = state.player;
  const edgeX = Math.min(Math.max(p.x, n.x - def.feetBox.w / 2), n.x + def.feetBox.w / 2);
  const edgeY = Math.min(Math.max(p.y, n.y - def.feetBox.h / 2), n.y + def.feetBox.h / 2);
  for (let i = 0; i < def.yield; i++) {
    const at = scatterPoint(roomById(n.roomId), state.rng, edgeX, edgeY, rects);
    layItem(state, def.itemId, n.roomId, at.x, at.y);
  }
  state.events.harvests.push({ id: n.id, nodeId: n.nodeId, itemId: def.itemId, x: n.x, y: n.y });
}
