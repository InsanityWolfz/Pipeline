import { CRAFT_MENU_LAYOUT, PAUSE_MENU, PICKER_LAYOUT } from '../data/hudLayout';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_TABS } from '../data/craftTabs';
import { tubeSlotBox } from './bottomHud';

// Where the crafting menu's panel, tabs and rows (047), and the pause menu's rows (020), sit
// on screen. No Phaser, so e2e tests can find a tab or a row to click.

/** A box on screen, px. */
export interface MenuBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The panel's top-left on screen: the panel and its title card above it, centred together (026), raised clear of the intake bar (047). */
export function craftPanelAt(): { x: number; y: number } {
  const L = CRAFT_MENU_LAYOUT;
  const card = L.title.h + L.title.gap;
  const centred = Math.round((VIEW_HEIGHT - L.height - card) / 2) + card;
  return {
    x: Math.round((VIEW_WIDTH - L.width) / 2),
    y: Math.min(centred, tubeSlotBox(1).y - L.title.gap - L.height),
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
  const t = CRAFT_TABS[tab];
  if (!t) return [];
  // 062: the tier rows in their own column beside the stone ones, from the top.
  return t.recipes.map((id, i) => {
    const tier = i >= t.tierFrom;
    const row = tier ? i - t.tierFrom : i;
    return { id, x: panel.x + L.rowsAt.x + (tier ? L.tierColumnX : 0), y: panel.y + L.rowsAt.y + row * (L.rowHeight + L.rowGap), w: L.rowWidth, h: L.rowHeight };
  });
}

/**
 * Where a crafting row's item names sit, px from the row's left, given each icon's x and its name's width. Each sits as
 * 026 put it: centred under its icon, or from its left edge when wider. 066: a name that would run into the next one
 * (`nameGap` px short of it) or past the row's end (`input.x` px short of it, the same margin as the row's start) moves
 * left just enough, then one that would run into the name before it moves right past it, so the storm tier's long names
 * ("Stormsteel arrowhead") stay inside the row. A row whose names fit is unchanged.
 */
export function rowNameXs(names: readonly { iconX: number; w: number }[]): number[] {
  const L = CRAFT_MENU_LAYOUT;
  const end = L.rowWidth - L.input.x;
  const xs = names.map((n) => n.iconX + Math.max(0, Math.round((L.iconSize - n.w) / 2)));
  for (let i = names.length - 1; i >= 0; i--) {
    const limit = i === names.length - 1 ? end : (xs[i + 1] ?? 0) - L.nameGap;
    const w = names[i]?.w ?? 0;
    if ((xs[i] ?? 0) + w > limit) xs[i] = limit - w;
  }
  for (let i = 0; i < names.length; i++) {
    const before = i === 0 ? L.input.x : (xs[i - 1] ?? 0) + (names[i - 1]?.w ?? 0) + L.nameGap;
    xs[i] = Math.max(xs[i] ?? 0, before);
  }
  // Inputs whose names alone are wider than the row would push the output's past its end: the output's name is the
  // row's point, so it stays inside, ending at the row's end (over the last input's name), but never left of its start.
  const last = names.length - 1;
  if (last >= 0) xs[last] = Math.max(L.input.x, Math.min(xs[last] ?? 0, end - (names[last]?.w ?? 0)));
  return xs;
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
