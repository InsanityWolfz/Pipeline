import { ITEMS } from '../data/items';
import { RESEARCH_NODES } from '../data/research';
import { count } from './inventory';
import { entranceCap, machineSpeed, nodeReady, nodeState, type NodeState } from './research';
import type { SimState } from './state';

/** Research in `getState()` (033). */
export interface ResearchSummary {
  /** Every node in data order: its state, and `ready` while it's revealed with its requires restored and its cost carried. */
  nodes: { id: string; state: NodeState; ready: boolean }[];
  /** Rounds each entrance holds now. */
  entranceCap: number;
  /** The multiplier on every machine's craft time now. */
  machineSpeed: number;
  /** Schematic items carried now, and those banked: carried and in the banked snapshot, or at home in the stash (one a restore spent is neither). */
  schematics: { carried: string[]; banked: string[] };
}

export function researchSummary(state: SimState): ResearchSummary {
  const schematics = Object.values(ITEMS).filter((it) => it.kind === 'schematic').map((it) => it.id);
  return {
    nodes: RESEARCH_NODES.map((n) => ({ id: n.id, state: nodeState(state, n.id), ready: nodeReady(state, n.id) })),
    entranceCap: entranceCap(state),
    machineSpeed: machineSpeed(state),
    schematics: {
      carried: schematics.filter((id) => count(state.inventory, id) > 0),
      banked: schematics.filter((id) => Math.min(count(state.inventory, id), count(state.banked, id)) > 0 || count(state.stash, id) > 0),
    },
  };
}
