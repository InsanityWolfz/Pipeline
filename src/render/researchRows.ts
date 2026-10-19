import { itemDef } from '../data/items';
import { LOST_SCHEMATIC, RESEARCH_GROUPS, RESEARCH_NODES, researchNode, whereOf, type ResearchNode } from '../data/research';
import { RESTORE_PANEL } from '../data/researchAssets';
import { count } from '../sim/inventory';
import { affordable, nodeReady, nodeState, requiresMet } from '../sim/research';
import type { SimState } from '../sim/state';

// What the restore panel and the research list show (033), pure: a node's cost as
// icons with what's carried against what's needed, and the list's rows by group.

type Research = Pick<SimState, 'research' | 'inventory'>;

/** One cost item: its icon, how many are carried and how many restoring spends. */
export interface CostShown {
  itemId: string;
  icon: string;
  have: number;
  need: number;
}

export const costOf = (sim: Pick<SimState, 'inventory'>, node: ResearchNode): CostShown[] =>
  Object.entries(node.cost).map(([itemId, need]) => ({ itemId, icon: itemDef(itemId).icon, have: count(sim.inventory, itemId), need }));

/** The restore panel's content for a node: its name and effect, its cost, and what its Restore row says and whether it works. */
export interface RestorePanelModel {
  node: string;
  name: string;
  effect: string;
  cost: CostShown[];
  action: string;
  /** Restore works now: requires restored, cost carried, not sealed. */
  enabled: boolean;
}

export function restorePanelModel(sim: Research, nodeId: string): RestorePanelModel {
  const node = researchNode(nodeId);
  const T = RESTORE_PANEL.text;
  const first = node.requires.find((r) => nodeState(sim, r) !== 'restored');
  const sealed = node.effect.kind === 'wing';
  const action = sealed ? T.sealed : first ? T.first(researchNode(first).name) : T.restore;
  const enabled = !sealed && requiresMet(sim, node) && affordable(sim.inventory, node);
  return { node: node.id, name: node.name, effect: node.description, cost: sealed ? [] : costOf(sim, node), action, enabled };
}

export type ListState = 'restored' | 'ready' | 'revealed' | 'hidden';

/**
 * A list row: the node, its name (or "Lost schematic" while hidden), its state, its cost (revealed nodes only) and
 * where its diagram is; `needs` names the node restored first while the cost is carried but its requires aren't met.
 */
export interface ResearchListRow {
  id: string;
  name: string;
  state: ListState;
  needs: string | null;
  cost: CostShown[];
  where: string;
}

export function listState(sim: Research, id: string): ListState {
  const now = nodeState(sim, id);
  if (now !== 'revealed') return now;
  return nodeReady(sim, id) ? 'ready' : 'revealed';
}

/** Every node by group (Intake, Walls, Sealed wing), in data order within each. */
export function researchRows(sim: Research): { id: string; label: string; rows: ResearchListRow[] }[] {
  return RESEARCH_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    rows: RESEARCH_NODES.filter((n) => g.anchors.includes(n.anchor.kind)).map((n) => {
      const state = listState(sim, n.id);
      const shown = state === 'ready' || state === 'revealed';
      const first = n.requires.find((r) => nodeState(sim, r) !== 'restored');
      const needs = state === 'revealed' && first && affordable(sim.inventory, n) ? researchNode(first).name : null;
      return { id: n.id, name: state === 'hidden' ? LOST_SCHEMATIC : n.name, state, needs, cost: shown ? costOf(sim, n) : [], where: whereOf(n.anchor) };
    }),
  }));
}
