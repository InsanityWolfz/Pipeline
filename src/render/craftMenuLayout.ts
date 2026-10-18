import { CRAFT_MENU_LAYOUT } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_GROUPS } from '../data/recipes';

// Where the crafting menu's panel, headers and rows sit on screen. No Phaser, so
// e2e tests can find a row to click.

export interface MenuLine {
  kind: 'header' | 'recipe';
  /** The ammo id for a header, the recipe id for a row. */
  id: string;
  /** Top-left on screen, px. */
  x: number;
  y: number;
}

/** The panel's top-left on screen: centred. */
export function craftPanelAt(): { x: number; y: number } {
  return {
    x: Math.round((VIEW_WIDTH - CRAFT_MENU_LAYOUT.width) / 2),
    y: Math.round((VIEW_HEIGHT - CRAFT_MENU_LAYOUT.height) / 2),
  };
}

/** Every header and recipe row in order, group by group. */
export function craftMenuLines(): MenuLine[] {
  const L = CRAFT_MENU_LAYOUT;
  const panel = craftPanelAt();
  const x = panel.x + L.rowsAt.x;
  let y = panel.y + L.rowsAt.y;
  const lines: MenuLine[] = [];
  for (const group of CRAFT_GROUPS) {
    lines.push({ kind: 'header', id: group.ammoId, x, y });
    y += L.headerHeight;
    for (const recipeId of group.recipes) {
      lines.push({ kind: 'recipe', id: recipeId, x, y });
      y += L.rowHeight + L.rowGap;
    }
  }
  return lines;
}
