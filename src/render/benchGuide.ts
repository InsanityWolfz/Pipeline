import { currentObjectiveDef } from '../sim/objectives';
import type { SimState } from '../sim/state';
import type { GearPanelState } from './GearPanel';
import type { Box } from './gearPanelLayout';

/** Where the bench screen's tutorial arrow points (058.7): the identified piece's slot tab, then its row, which wears it. */
export interface BenchGuide {
  target: 'tab' | 'row';
  /** The piece it leads to. */
  id: number;
  box: Box;
}

/**
 * 058 (Shaun: "maybe you put some little arrows in the menu"): while the goal is to equip a piece, the first piece
 * not worn: on another tab, the arrow points at its slot's tab; on its own tab, at its row, whose click wears it.
 * Null once one is worn, off that goal, or with the piece's row scrolled out of sight.
 */
export function benchGuide(sim: SimState, shown: GearPanelState): BenchGuide | null {
  if (currentObjectiveDef(sim)?.check.kind !== 'equipped') return null;
  const piece = sim.gear.find((p) => sim.equipped[p.slot] !== p.id);
  if (!piece) return null;
  if (shown.tab !== piece.slot) {
    const tab = shown.tabs.find((t) => t.slot === piece.slot);
    return tab ? { target: 'tab', id: piece.id, box: tab.box } : null;
  }
  const row = shown.rows.find((r) => r.id === piece.id);
  return row ? { target: 'row', id: piece.id, box: row.box } : null;
}
