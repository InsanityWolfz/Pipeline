import { CRAFT_MENU_LAYOUT, PAUSE_MENU, PICKER_LAYOUT } from '../data/hudLayout';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_TABS } from '../data/craftTabs';

// Where the crafting menu's panel, tabs and rows (047), and the pause menu's rows (020), sit
// on screen. No Phaser, so e2e tests can find a tab or a row to click.

/** A box on screen, px. */
export interface MenuBox {
  x: number;
  y: number;
  w: number;
  h: number;
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

/** Each tab's box, top to bottom down the panel's left (047), with its family's ammo id. */
export function craftTabBoxes(): (MenuBox & { ammoId: string; label: string })[] {
  const L = CRAFT_MENU_LAYOUT;
  const panel = craftPanelAt();
  return CRAFT_TABS.map((t, i) => ({ ammoId: t.ammoId, label: t.label, x: panel.x + L.tabsAt.x, y: panel.y + L.tabsAt.y + i * (L.tab.h + L.tab.gap), w: L.tab.w, h: L.tab.h }));
}

/** A tab's rows in order, each its recipe id and box (047: a tab per family, its whole chain and tagged rounds). */
export function craftTabRows(tab: number): (MenuBox & { id: string })[] {
  const L = CRAFT_MENU_LAYOUT;
  const panel = craftPanelAt();
  return (CRAFT_TABS[tab]?.recipes ?? []).map((id, i) => ({ id, x: panel.x + L.rowsAt.x, y: panel.y + L.rowsAt.y + i * (L.rowHeight + L.rowGap), w: L.rowWidth, h: L.rowHeight }));
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
