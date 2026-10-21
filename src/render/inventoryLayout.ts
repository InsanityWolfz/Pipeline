import { VIEW_WIDTH } from '../data/config';
import { FOOTER_LINES, gridSize, INVENTORY_GRID, inventoryPanelSize, type GridMode } from '../data/hudPanels';
import { tubeSlotBox, type ScreenBox } from './bottomHud';

export type { GridMode } from '../data/hudPanels';

// Where the grid inventory's pieces sit (047), pure so tests can check them and e2e can find a slot to click: the
// tablet centred across the screen with its bottom just above the intake bar (the carried bar stays in view under it,
// to drop stacks on), its title card over it; a hopper's or crate's own row on top, or the stash's own scrolling grid
// (052); the Sort button; the grid's shown cells, row by row; the scroll bar; and the footer lines.

export interface GridLayout {
  panel: ScreenBox;
  title: ScreenBox;
  /** A hopper's or crate's own slots (047): its name's top-left, and one row of cells; null otherwise. */
  container: { name: { x: number; y: number }; cells: ScreenBox[] } | null;
  /** 052: the stash's own grid: its name's top-left, its shown cells row by row, and its scroll bar; null otherwise. */
  stash: { cells: ScreenBox[]; scroll: ScreenBox } | null;
  /** The inventory's name at the toolbar's left (052: on the stash's screen, under the stash's grid), or null. */
  invName: { x: number; y: number } | null;
  sort: ScreenBox;
  /** The shown cells, `cols` x the mode's rows, row by row. */
  cells: ScreenBox[];
  /** The scroll bar's track, right of the grid. */
  scroll: ScreenBox;
  /** Each footer line's left and the top of its capitals (none on the stash's screen). */
  footer: { x: number; y: number }[];
}

/** The layout for a mode: the plain inventory, a hopper's or crate's screen (047), or the stash's (052). */
export function inventoryLayout(m: GridMode = 'bag'): GridLayout {
  const G = INVENTORY_GRID;
  const S = G.stash;
  const { w, h } = inventoryPanelSize(m);
  const bottom = tubeSlotBox(1).y - G.aboveHud;
  const panel = { x: Math.round((VIEW_WIDTH - w) / 2), y: bottom - h, w, h };
  const title = { x: Math.round(panel.x + (w - G.title.w) / 2), y: panel.y - G.title.gap - G.title.h, w: G.title.w, h: G.title.h };
  const left = panel.x + G.pad;
  let y = panel.y + G.pad;
  const row = (top: number, n: number): ScreenBox[] => Array.from({ length: n }, (_, i) => ({ x: left + i * G.cell.stepX, y: top, w: G.cell.w, h: G.cell.h }));
  const rows = (top: number, n: number): ScreenBox[] => Array.from({ length: n }, (_, r) => row(top + r * G.cell.stepY, G.cols)).flat();
  const grid = gridSize(m === 'stash' ? S.invRows : G.rows);
  let box: GridLayout['container'] = null;
  let stash: GridLayout['stash'] = null;
  if (m === 'container') {
    box = { name: { x: left, y: y + G.container.nameY }, cells: row(y + G.container.headerH, G.container.cols) };
    y += G.container.headerH + G.cell.h + G.container.gap;
  } else if (m === 'stash') {
    const h = gridSize(S.rows).h;
    stash = { cells: rows(y, S.rows), scroll: { x: left + grid.w + G.scroll.gap, y, w: G.scroll.w, h } };
    y += h + S.gap;
  }
  const sort = { x: left + grid.w - G.sort.w, y, w: G.sort.w, h: G.sort.h };
  const invName = m === 'stash' ? { x: left, y: y + G.sort.textY } : null;
  y += G.toolbar.h + G.toolbar.gap;
  const cells = rows(y, m === 'stash' ? S.invRows : G.rows);
  const scroll = { x: left + grid.w + G.scroll.gap, y, w: G.scroll.w, h: grid.h };
  const footTop = y + grid.h + G.footer.gap;
  const footer = m === 'stash' ? [] : Array.from({ length: FOOTER_LINES }, (_, i) => ({ x: left, y: footTop + i * G.footer.lineHeight }));
  return { panel, title, container: box, stash, invName, sort, cells, scroll, footer };
}

/** The index of the shown cell under a point, or -1. */
export function cellAt(cells: readonly ScreenBox[], x: number, y: number): number {
  return cells.findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
}
