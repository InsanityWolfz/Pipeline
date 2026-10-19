import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { groupHeight, INVENTORY_GROUPS, INVENTORY_PANEL, inventoryColumns, inventoryColumnsHeight, inventoryPanelSize } from '../data/hudPanels';
import type { ItemGroup } from '../data/items';
import type { ScreenBox } from './bottomHud';

// Where the inventory panel's pieces sit (031), pure: the tablet centred on screen
// under its title card, each group's header and rows in its column, and the footer.

export interface InventoryLayout {
  panel: ScreenBox;
  title: ScreenBox;
  /** Each group's header (x, y its top-left) and where its rows start, view px. */
  groups: { id: ItemGroup; label: string; x: number; y: number; rowsY: number }[];
  /** The footer line's left and the top of its capitals. */
  footer: { x: number; y: number };
}

export function inventoryLayout(): InventoryLayout {
  const P = INVENTORY_PANEL;
  const { w, h } = inventoryPanelSize();
  const top = Math.round((VIEW_HEIGHT - (P.title.h + P.title.gap + h)) / 2);
  const panel = { x: Math.round((VIEW_WIDTH - w) / 2), y: top + P.title.h + P.title.gap, w, h };
  const title = { x: Math.round(panel.x + (w - P.title.w) / 2), y: top, w: P.title.w, h: P.title.h };
  const label = (id: ItemGroup) => INVENTORY_GROUPS.find((g) => g.id === id)?.label ?? id;
  const groups = inventoryColumns().flatMap((column, i) => {
    const x = panel.x + P.pad + i * (P.columnWidth + P.columnGap);
    let y = panel.y + P.pad;
    return column.map((id) => {
      const at = { id, label: label(id), x, y, rowsY: y + P.headerHeight };
      y += groupHeight(id) + P.groupGap;
      return at;
    });
  });
  return { panel, title, groups, footer: { x: panel.x + P.pad, y: panel.y + P.pad + inventoryColumnsHeight() + P.footer.gap } };
}
