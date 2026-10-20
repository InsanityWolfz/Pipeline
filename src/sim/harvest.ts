import { HARVEST_REACH, nodeDef } from '../data/nodes';
import { FEET_BOX } from '../data/player';
import { layItem, scatterPoint } from './drops';
import type { Command } from './input';
import { isRolling } from './movement';
import { nodeRects, useNode, type NodeState } from './nodes';
import { roomById, type SimState } from './state';

// Harvesting a gathering node with E: stand in reach and keep still until it's done.

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

/** The nearest harvestable node in reach in the player's room, by centre distance; the first placed wins ties. */
export function nodeInReach(state: SimState): NodeState | undefined {
  const p = state.player;
  let best: NodeState | undefined;
  let bestDist = Infinity;
  for (const n of state.nodes) {
    if (n.roomId !== state.roomId || n.uses === 0 || gapTo(state, n) > HARVEST_REACH) continue;
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
  // Without the tube (012) fire and ammo select do nothing, so they don't interrupt either.
  const switching = state.hasTube && cmd.selectAmmo !== null && cmd.selectAmmo !== state.tube.ammoId;
  return cmd.moveX !== 0 || cmd.moveY !== 0 || isRolling(state.player) || (state.hasTube && cmd.fire) || switching;
}

/** Runs after the player and enemies act, before the tube. */
export function stepHarvest(state: SimState, cmd: Command): void {
  if (interrupted(state, cmd)) {
    cancelHarvest(state);
    return;
  }
  const harvest = state.harvest;
  if (harvest) {
    harvest.progress += 1;
    const n = state.nodes.find((node) => node.id === harvest.nodeId);
    if (n && harvest.progress >= nodeDef(n.nodeId).harvestTicks) complete(state, n);
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
