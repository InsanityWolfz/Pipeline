import { VIEW_WIDTH } from '../data/config';
import { gridSize, INVENTORY_GRID, inventoryPanelSize } from '../data/hudPanels';
import { tubeSlotBox, type ScreenBox } from './bottomHud';

// Where the grid inventory's pieces sit (047), pure so tests can check them and e2e can find a slot to click: the
// tablet centred across the screen with its bottom just above the intake bar (the carried bar stays in view under it,
// to drop stacks on), its title card over it; a hopper's or crate's own row on top; the Sort button; the grid's
// shown cells, row by row; the scroll bar; and the footer lines.

export interface GridLayout {
  panel: ScreenBox;
  title: ScreenBox;
  /** A hopper's or crate's own slots (047): its name's top-left, and one row of cells; null for the plain inventory. */
  container: { name: { x: number; y: number }; cells: ScreenBox[] } | null;
  sort: ScreenBox;
  /** The shown cells, `cols` x `rows`, row by row. */
  cells: ScreenBox[];
  /** The scroll bar's track, right of the grid. */
  scroll: ScreenBox;
  /** Each footer line's left and the top of its capitals. */
  footer: { x: number; y: number }[];
}

/** The layout with a container's slots on top (a hopper's or crate's screen) or not. */
export function inventoryLayout(container = false): GridLayout {
  const G = INVENTORY_GRID;
  const { w, h } = inventoryPanelSize(container);
  const bottom = tubeSlotBox(1).y - G.aboveHud;
  const panel = { x: Math.round((VIEW_WIDTH - w) / 2), y: bottom - h, w, h };
  const title = { x: Math.round(panel.x + (w - G.title.w) / 2), y: panel.y - G.title.gap - G.title.h, w: G.title.w, h: G.title.h };
  const left = panel.x + G.pad;
  let y = panel.y + G.pad;
  const row = (top: number, n: number): ScreenBox[] => Array.from({ length: n }, (_, i) => ({ x: left + i * G.cell.stepX, y: top, w: G.cell.w, h: G.cell.h }));
  let box: GridLayout['container'] = null;
  if (container) {
    box = { name: { x: left, y: y + G.container.nameY }, cells: row(y + G.container.headerH, G.container.cols) };
    y += G.container.headerH + G.cell.h + G.container.gap;
  }
  const grid = gridSize();
  const sort = { x: left + grid.w - G.sort.w, y, w: G.sort.w, h: G.sort.h };
  y += G.toolbar.h + G.toolbar.gap;
  const cells = Array.from({ length: G.rows }, (_, r) => row(y + r * G.cell.stepY, G.cols)).flat();
  const scroll = { x: left + grid.w + G.scroll.gap, y, w: G.scroll.w, h: grid.h };
  const footTop = y + grid.h + G.footer.gap;
  const footer = [0, 1, 2].map((i) => ({ x: left, y: footTop + i * G.footer.lineHeight }));
  return { panel, title, container: box, sort, cells, scroll, footer };
}

/** The index of the shown cell under a point, or -1. */
export function cellAt(cells: readonly ScreenBox[], x: number, y: number): number {
  return cells.findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
}
