import { INVENTORY_GROUPS } from '../data/hudPanels';
import { ITEMS, type ItemGroup } from '../data/items';
import { itemRisks } from '../sim/banking';
import { count } from '../sim/inventory';
import type { SimState } from '../sim/state';

// What the inventory panel lists (031), pure: every group in order, with a row per
// carried item (count above 0, in ITEMS order): its count, how many a death would
// take (the sim's banking helper) and how many are home in the stash. Gear adds the
// worn piece and the spare identified pieces, which a death never takes.

export interface InventoryRow {
  /** The item, or `worn` / `spare` for Gear's identified pieces. */
  itemId: string;
  count: number;
  atRisk: number;
  /** How many of it the stash holds. */
  home: number;
}

export interface InventoryGroupRows {
  id: ItemGroup;
  rows: InventoryRow[];
}

/** Gear's line for the worn piece, and for the other identified pieces. */
export const WORN_ROW = 'worn';
export const SPARE_ROW = 'spare';

type Held = Pick<SimState, 'inventory' | 'banked' | 'stash' | 'armor' | 'equipped'>;

export function inventoryGroups(sim: Held): InventoryGroupRows[] {
  const risks = itemRisks(sim);
  return INVENTORY_GROUPS.map(({ id }) => {
    const rows: InventoryRow[] = Object.values(ITEMS)
      .filter((it) => it.group === id && risks[it.id] !== undefined)
      .map((it) => ({ itemId: it.id, count: risks[it.id]?.held ?? 0, atRisk: risks[it.id]?.atRisk ?? 0, home: count(sim.stash, it.id) }));
    if (id === 'gear') {
      const worn = sim.armor.some((a) => a.id === sim.equipped);
      const spares = sim.armor.length - (worn ? 1 : 0);
      if (worn) rows.push({ itemId: WORN_ROW, count: 1, atRisk: 0, home: 0 });
      if (spares > 0) rows.push({ itemId: SPARE_ROW, count: spares, atRisk: 0, home: 0 });
    }
    return { id, rows };
  });
}
