import { ITEMS } from '../data/items';
import { RESEARCH_NODES, researchNode } from '../data/research';
import { count } from './inventory';
import { affordable, entranceCap, machineSpeed, nodeState, requiresMet, type NodeState } from './research';
import type { SimState } from './state';

/** Research in `getState()` (033). */
export interface ResearchSummary {
  /** Every node in data order: its state, and `ready` while it's revealed with its requires restored and its cost carried. */
  nodes: { id: string; state: NodeState; ready: boolean }[];
  /** Rounds each entrance holds now. */
  entranceCap: number;
  /** The multiplier on every machine's craft time now. */
  machineSpeed: number;
  /** Schematic items carried now, and those banked (in the banked snapshot or the stash), by id. */
  schematics: { carried: string[]; banked: string[] };
}

/** A node is ready to restore at its diagram: revealed, its requires restored and its cost carried (not the sealed wing). */
export function nodeReady(state: Pick<SimState, 'research' | 'inventory'>, id: string): boolean {
  const node = researchNode(id);
  return nodeState(state, id) === 'revealed' && node.effect.kind !== 'wing' && requiresMet(state, node) && affordable(state.inventory, node);
}

export function researchSummary(state: SimState): ResearchSummary {
  const schematics = Object.values(ITEMS).filter((it) => it.kind === 'schematic').map((it) => it.id);
  return {
    nodes: RESEARCH_NODES.map((n) => ({ id: n.id, state: nodeState(state, n.id), ready: nodeReady(state, n.id) })),
    entranceCap: entranceCap(state),
    machineSpeed: machineSpeed(state),
    schematics: {
      carried: schematics.filter((id) => count(state.inventory, id) > 0),
      banked: schematics.filter((id) => count(state.banked, id) > 0 || count(state.stash, id) > 0),
    },
  };
}
