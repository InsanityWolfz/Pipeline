import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { BUILD_BAR_LAYOUT, PICKER_LAYOUT } from '../data/hudLayout';
import { LOGISTICS_ICONS } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { pieceDef } from '../data/pieces';
import { recipeDef } from '../data/recipes';

// Where the build bar's cells and the hopper picker's rows sit on screen. No
// Phaser, so e2e tests can find them to click.

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inRect = (r: ScreenRect, x: number, y: number): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** One cell per piece in `pieces`, centred along the bottom of the screen. */
export function buildBarCells(pieces: readonly string[]): (ScreenRect & { pieceId: string })[] {
  const L = BUILD_BAR_LAYOUT;
  const width = pieces.length * L.cellStep - (L.cellStep - L.cellWidth);
  const left = Math.round((VIEW_WIDTH - width) / 2);
  const y = VIEW_HEIGHT - L.bottom - L.cellHeight;
  return pieces.map((pieceId, i) => ({ pieceId, x: left + i * L.cellStep, y, w: L.cellWidth, h: L.cellHeight }));
}

/** One row per item in `items`, a centred column. */
export function pickerRows(items: readonly string[]): (ScreenRect & { itemId: string })[] {
  const L = PICKER_LAYOUT;
  const step = L.rowHeight + L.rowGap;
  const top = Math.round((VIEW_HEIGHT - items.length * step) / 2);
  const x = Math.round((VIEW_WIDTH - L.rowWidth) / 2);
  return items.map((itemId, i) => ({ itemId, x, y: top + i * step, w: L.rowWidth, h: L.rowHeight }));
}

/** The items the player holds, in ITEMS order: what the hopper picker lists. */
export function heldItems(inventory: Readonly<Record<string, number>>): string[] {
  return Object.keys(ITEMS).filter((id) => (inventory[id] ?? 0) > 0);
}

/** A piece's icon: what a machine makes, or a logistics piece's own icon. */
export function pieceIcon(pieceId: string): string {
  const def = pieceDef(pieceId);
  if (def.kind === 'machine') return itemDef(recipeDef(def.recipeId).output.itemId).icon;
  const icon = LOGISTICS_ICONS[pieceId];
  if (!icon) throw new Error(`No icon for piece '${pieceId}'`);
  return icon;
}
