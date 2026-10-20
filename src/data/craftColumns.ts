import { CRAFT_GROUPS } from './recipes';

// The crafting menu's columns (038.4): 026's menu has no scroll, and 038's Landmines group
// makes one column too tall for the view, so the groups sit in two columns side by side,
// as each group's `column` says: Arrows and Bombs, then Ley and Landmines.

export interface CraftColumnSizes {
  headerHeight: number;
  rowHeight: number;
  rowGap: number;
}

/** The groups' ammo ids by column, left to right, each in CRAFT_GROUPS order. */
export const CRAFT_COLUMNS: readonly (readonly string[])[] = (() => {
  const n = Math.max(...CRAFT_GROUPS.map((g) => g.column)) + 1;
  return Array.from({ length: n }, (_, c) => CRAFT_GROUPS.filter((g) => g.column === c).map((g) => g.ammoId));
})();

/** A column's height: each group's header and its rows, a gap after every row but the column's last. */
export function craftColumnHeight(ids: readonly string[], L: CraftColumnSizes): number {
  const groups = CRAFT_GROUPS.filter((g) => ids.includes(g.ammoId));
  const rows = groups.reduce((n, g) => n + g.recipes.length, 0);
  return groups.length * L.headerHeight + rows * L.rowHeight + Math.max(0, rows - 1) * L.rowGap;
}
