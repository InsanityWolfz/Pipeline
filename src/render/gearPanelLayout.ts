import { VIEW_WIDTH } from '../data/config';
import { GEAR_SLOTS, type GearSlot } from '../data/gear';
import { GEAR_PANEL } from '../data/gearAssets';

// Where the bench's gear panel (036) and its parts sit on screen: centred. The open tab's rows are paged by
// height (a relic's row is taller). No Phaser, so tests can find what to click.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GearPanelLayout {
  panel: Box;
  title: { x: number; y: number };
  identify: Box;
  cells: { slot: GearSlot; box: Box }[];
  tabs: { slot: GearSlot; box: Box }[];
  /** The rows on the shown page, by piece id. */
  rows: { id: number; box: Box }[];
  /** The shown page and how many there are; the pager shows only with more than one. */
  page: { index: number; count: number };
  pager: Box;
  /** Where the "No helm pieces" line goes in an empty tab. */
  empty: { x: number; y: number };
  totals: { x: number; y: number }[];
}

/** A row to lay out: its piece and whether it's a relic (one line taller). */
export interface RowSpec {
  id: number;
  relic: boolean;
}

const rowHeight = (r: RowSpec): number => (r.relic ? GEAR_PANEL.list.relicH : GEAR_PANEL.list.rowH);

/** The rows split into pages that each fit the list's height, in order. */
export function gearPages(rows: readonly RowSpec[]): RowSpec[][] {
  const L = GEAR_PANEL.list;
  const pages: RowSpec[][] = [];
  let page: RowSpec[] = [];
  let used = 0;
  for (const r of rows) {
    if (page.length > 0 && used + L.gap + rowHeight(r) > L.h) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += (page.length > 0 ? L.gap : 0) + rowHeight(r);
    page.push(r);
  }
  if (page.length > 0 || pages.length === 0) pages.push(page);
  return pages;
}

/** `count` boxes in a row across the inside of the panel, `gap` px apart. */
function across(x: number, y: number, h: number, gap: number, count: number): Box[] {
  const inner = GEAR_PANEL.w - 2 * GEAR_PANEL.pad;
  const w = Math.floor((inner - (count - 1) * gap) / count);
  return Array.from({ length: count }, (_, i) => ({ x: x + GEAR_PANEL.pad + i * (w + gap), y, w, h }));
}

/** The panel's layout, centred: the open tab's `rows`, showing page `page` (wrapped into range). */
export function gearPanelLayout(rows: readonly RowSpec[], page: number): GearPanelLayout {
  const P = GEAR_PANEL;
  const x = Math.round((VIEW_WIDTH - P.w) / 2);
  const y = P.y;
  const inner = P.w - 2 * P.pad;
  const pages = gearPages(rows);
  const index = ((page % pages.length) + pages.length) % pages.length;
  const listTop = y + P.list.y;
  let at = listTop;
  const shown = (pages[index] ?? []).map((r) => {
    const box = { x: x + P.pad, y: at, w: inner, h: rowHeight(r) };
    at += box.h + P.list.gap;
    return { id: r.id, box };
  });
  return {
    panel: { x, y, w: P.w, h: P.h },
    title: { x: x + P.pad, y: y + P.title.y },
    identify: { x: x + P.w - P.pad - P.identify.w, y: y + P.identify.y, w: P.identify.w, h: P.identify.h },
    cells: across(x, y + P.cells.y, P.cells.h, P.cells.gap, GEAR_SLOTS.length).map((box, i) => ({ slot: GEAR_SLOTS[i] ?? 'helm', box })),
    tabs: across(x, y + P.tabs.y, P.tabs.h, P.tabs.gap, GEAR_SLOTS.length).map((box, i) => ({ slot: GEAR_SLOTS[i] ?? 'helm', box })),
    rows: shown,
    page: { index, count: pages.length },
    pager: { x: x + P.pad, y: y + P.pager.y, w: inner, h: P.pager.h },
    empty: { x: x + P.pad + P.list.text.x, y: listTop + P.list.text.line1 },
    totals: [0, 1].map((i) => ({ x: x + P.pad, y: y + P.totals.y + i * P.totals.step })),
  };
}

/** True if a point is inside a box. */
export const inBox = (b: Box, px: number, py: number): boolean => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
