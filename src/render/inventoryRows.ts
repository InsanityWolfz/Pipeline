import { INVENTORY_GROUPS, SCHEMATICS_LABEL } from '../data/hudPanels';
import { ITEMS, UNKNOWN_SCHEMATIC, type ItemGroup } from '../data/items';
import { RESEARCH_ICONS } from '../data/researchAssets';
import { itemRisks } from '../sim/banking';
import { count } from '../sim/inventory';
import { schematicKnown } from '../sim/schematics';
import type { SimState } from '../sim/state';

// What the inventory panel lists (031), pure: every group in order, with a row per
// carried item (count above 0, in ITEMS order): its count, how many a death would
// take (the sim's banking helper) and how many are home in the stash. Gear adds the
// worn piece and the spare identified pieces, which a death never takes.

export interface InventoryRow {
  /** The item, or `worn` / `spare` for Gear's identified pieces, or `schematics` for the schematics' shared row (033). */
  itemId: string;
  count: number;
  atRisk: number;
  /** How many of it the stash holds. */
  home: number;
  /** The schematics' row: the name and icon it shows. */
  label?: { name: string; icon: string };
}

export interface InventoryGroupRows {
  id: ItemGroup;
  rows: InventoryRow[];
}

/** Gear's line for the worn piece, and for the other identified pieces. */
export const WORN_ROW = 'worn';
export const SPARE_ROW = 'spare';
/** Parts' one row for every schematic carried (033). */
export const SCHEMATIC_ROW = 'schematics';

/** What the panel reads from the sim. */
export type Held = Pick<SimState, 'inventory' | 'banked' | 'stash' | 'armor' | 'equipped' | 'research'>;

/**
 * The schematics' row name and icon (033): "Unknown schematic" while every one carried is still unknown (so several
 * unknowns never tell apart), the real name for one known kind alone, else "Schematics".
 */
export function schematicLabel(sim: Pick<SimState, 'research'>, ids: readonly string[]): { name: string; icon: string } {
  const known = ids.filter((id) => schematicKnown(sim, id));
  if (known.length === 0) return { name: UNKNOWN_SCHEMATIC.name, icon: UNKNOWN_SCHEMATIC.icon };
  const only = ids.length === 1 ? ITEMS[ids[0] ?? ''] : undefined;
  return only ? { name: only.name, icon: only.icon } : { name: SCHEMATICS_LABEL, icon: RESEARCH_ICONS.schematic };
}

export function inventoryGroups(sim: Held): InventoryGroupRows[] {
  const risks = itemRisks(sim);
  return INVENTORY_GROUPS.map(({ id }) => {
    const carried = Object.values(ITEMS).filter((it) => it.group === id && risks[it.id] !== undefined);
    const rows: InventoryRow[] = carried
      .filter((it) => it.kind !== 'schematic')
      .map((it) => ({ itemId: it.id, count: risks[it.id]?.held ?? 0, atRisk: risks[it.id]?.atRisk ?? 0, home: count(sim.stash, it.id) }));
    const schematics = carried.filter((it) => it.kind === 'schematic').map((it) => it.id);
    if (schematics.length > 0) {
      const sum = (f: (itemId: string) => number) => schematics.reduce((n, s) => n + f(s), 0);
      rows.push({
        itemId: SCHEMATIC_ROW,
        count: sum((s) => risks[s]?.held ?? 0),
        atRisk: sum((s) => risks[s]?.atRisk ?? 0),
        home: sum((s) => count(sim.stash, s)),
        label: schematicLabel(sim, schematics),
      });
    }
    if (id === 'gear') {
      const worn = sim.armor.some((a) => a.id === sim.equipped);
      const spares = sim.armor.length - (worn ? 1 : 0);
      if (worn) rows.push({ itemId: WORN_ROW, count: 1, atRisk: 0, home: 0 });
      if (spares > 0) rows.push({ itemId: SPARE_ROW, count: spares, atRisk: 0, home: 0 });
    }
    return { id, rows };
  });
}
