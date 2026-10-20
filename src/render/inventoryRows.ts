import { INVENTORY_GRID, SCHEMATICS_LABEL, sparesText } from '../data/hudPanels';
import { ITEMS, UNKNOWN_SCHEMATIC, itemDef } from '../data/items';
import { RESEARCH_ICONS } from '../data/researchAssets';
import { containerStacks, gridSlots } from '../sim/bag';
import type { Inventory } from '../sim/inventory';
import { schematicKnown } from '../sim/schematics';
import type { SimState } from '../sim/state';
import { playerStats, wornPieces } from '../sim/stats';

// What the grid inventory shows (047), pure: each slot's kind, count, icon and name, and how many of it a death would
// take (031, from the sim's bag). Schematics share one slot (033: unknown ones must never tell apart), as they shared
// the 031 panel's row; a click on it moves nothing. The footer counts the identified gear.

/** One shown slot: a stack, `itemId` its kind (the schematics' shared slot names the first), `stack` its count. */
export interface ShownSlot {
  itemId: string;
  count: number;
  atRisk: number;
  name: string;
  icon: string;
  /** False for the schematics' shared slot: clicks and drags on it do nothing. */
  movable: boolean;
}

/** What the grid reads from the sim. */
export type Held = Pick<SimState, 'inventory' | 'bag' | 'banked' | 'gear' | 'equipped' | 'research' | 'talents'>;

/**
 * The schematics' label (033): "Unknown schematic" while every one carried is still unknown (so several unknowns never
 * tell apart), the real name for one known kind alone, else "Schematics".
 */
export function schematicLabel(sim: Pick<SimState, 'research'>, ids: readonly string[]): { name: string; icon: string } {
  const known = ids.filter((id) => schematicKnown(sim, id));
  if (known.length === 0) return { name: UNKNOWN_SCHEMATIC.name, icon: UNKNOWN_SCHEMATIC.icon };
  const only = ids.length === 1 ? ITEMS[ids[0] ?? ''] : undefined;
  return only ? { name: only.name, icon: only.icon } : { name: SCHEMATICS_LABEL, icon: RESEARCH_ICONS.schematic };
}

const isSchematic = (id: string): boolean => ITEMS[id]?.kind === 'schematic';

/** The grid's slots in order: every stack (047), the schematics folded into one slot where the first of them stood. */
export function inventorySlots(sim: Held): ShownSlot[] {
  const slots = gridSlots(sim);
  const schematics = [...new Set(slots.filter((s) => isSchematic(s.itemId)).map((s) => s.itemId))];
  const out: ShownSlot[] = [];
  let folded = false;
  for (const s of slots) {
    if (!isSchematic(s.itemId)) {
      const def = itemDef(s.itemId);
      out.push({ itemId: s.itemId, count: s.count, atRisk: s.atRisk, name: def.name, icon: def.icon, movable: true });
      continue;
    }
    if (folded) continue;
    folded = true;
    const all = slots.filter((x) => isSchematic(x.itemId));
    const label = schematicLabel(sim, schematics);
    out.push({ itemId: s.itemId, count: all.reduce((n, x) => n + x.count, 0), atRisk: all.reduce((n, x) => n + x.atRisk, 0), ...label, movable: false });
  }
  return out;
}

/** A hopper's or crate's own slots (047): its stacks, never anything the player carries. */
export function containerSlots(contents: Inventory): ShownSlot[] {
  return containerStacks(contents).map((s) => {
    const def = itemDef(s.itemId);
    return { itemId: s.itemId, count: s.count, atRisk: 0, name: def.name, icon: def.icon, movable: true };
  });
}

/** The footer's gear line (031, 036): the worn pieces and their armor, and the spare identified pieces, which a death never takes; empty with none. */
export function gearLine(sim: Held): string {
  const T = INVENTORY_GRID.text;
  const worn = wornPieces(sim).length;
  const spares = sim.gear.length - worn;
  const parts = [...(worn > 0 ? [`${worn} ${T.worn}${T.sep}${T.armor} ${playerStats(sim).armor}`] : []), ...(spares > 0 ? [sparesText(spares)] : [])];
  return parts.join(T.sep);
}
