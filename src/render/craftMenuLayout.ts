import { CRAFT_MENU_LAYOUT, PAUSE_MENU, PICKER_LAYOUT } from '../data/hudLayout';
import { CRAFT_COLUMNS } from '../data/craftColumns';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_GROUPS } from '../data/recipes';

// Where the crafting menu's panel, headers and rows, and the pause menu's rows (020), sit
// on screen. No Phaser, so e2e tests can find a row to click.

export interface MenuLine {
  kind: 'header' | 'recipe';
  /** The ammo id for a header, the recipe id for a row. */
  id: string;
  /** Top-left on screen, px. */
  x: number;
  y: number;
}

/** The panel's top-left on screen: the panel and its title card above it, centred together (026: the taller menu fits). */
export function craftPanelAt(): { x: number; y: number } {
  const L = CRAFT_MENU_LAYOUT;
  const card = L.title.h + L.title.gap;
  return {
    x: Math.round((VIEW_WIDTH - L.width) / 2),
    y: Math.round((VIEW_HEIGHT - L.height - card) / 2) + card,
  };
}

/** Every header and recipe row in order, group by group, column by column (038.4). */
export function craftMenuLines(): MenuLine[] {
  const L = CRAFT_MENU_LAYOUT;
  const panel = craftPanelAt();
  const lines: MenuLine[] = [];
  for (const [c, ids] of CRAFT_COLUMNS.entries()) {
    const x = panel.x + L.rowsAt.x + c * (L.rowWidth + L.columnGap);
    let y = panel.y + L.rowsAt.y;
    for (const group of CRAFT_GROUPS.filter((g) => ids.includes(g.ammoId))) {
      lines.push({ kind: 'header', id: group.ammoId, x, y });
      y += L.headerHeight;
      for (const recipeId of group.recipes) {
        lines.push({ kind: 'recipe', id: recipeId, x, y });
        y += L.rowHeight + L.rowGap;
      }
    }
  }
  return lines;
}

/** The pause menu's rows (sound, volume, resume), centred on screen, px. */
export function pauseRows(): { x: number; y: number; w: number; h: number }[] {
  const L = PICKER_LAYOUT;
  const step = L.rowHeight + PAUSE_MENU.rowGap;
  const n = PAUSE_ROWS.length;
  const top = Math.round((VIEW_HEIGHT - n * step) / 2);
  const x = Math.round((VIEW_WIDTH - L.rowWidth) / 2);
  return PAUSE_ROWS.map((_, i) => ({ x, y: top + i * step, w: L.rowWidth, h: L.rowHeight }));
}

/** The pause menu's rows, top to bottom. */
export const PAUSE_ROWS = ['resume', 'settings', 'quit'] as const;
