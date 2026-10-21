import { VIEW_WIDTH } from '../data/config';
import { GEAR_SLOTS, type GearSlot } from '../data/gear';
import { GEAR_PANEL } from '../data/gearAssets';

// Where the bench's gear panel (036) and its parts sit on screen: centred. The open tab's rows scroll by row (050,
// A.13: no pages), as many as fit the list's height from the scrolled-to one (a relic's row is taller), a thin bar at
// the list's right showing where. No Phaser, so tests can find what to click.

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
  /** The rows shown, by piece id. */
  rows: { id: number; box: Box }[];
  /** 050: the first row shown and the furthest it scrolls (0 when every row fits). */
  scroll: { first: number; last: number };
  /** The scroll bar's track at the list's right, and its thumb (the track's height when every row fits). */
  track: Box;
  thumb: Box;
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

/** Whether these rows fit the list's height, one under another. */
const fits = (rows: readonly RowSpec[]): boolean => rows.reduce((h, r, i) => h + rowHeight(r) + (i > 0 ? GEAR_PANEL.list.gap : 0), 0) <= GEAR_PANEL.list.h;

/** The furthest the list scrolls (050): the first row from which every row to the end fits; 0 when all fit. */
export function lastScroll(rows: readonly RowSpec[]): number {
  let first = rows.length;
  while (first > 0 && fits(rows.slice(first - 1))) first -= 1;
  return Math.min(first, Math.max(0, rows.length - 1));
}

/** `count` boxes in a row across the inside of the panel, `gap` px apart. */
function across(x: number, y: number, h: number, gap: number, count: number): Box[] {
  const inner = GEAR_PANEL.w - 2 * GEAR_PANEL.pad;
  const w = Math.floor((inner - (count - 1) * gap) / count);
  return Array.from({ length: count }, (_, i) => ({ x: x + GEAR_PANEL.pad + i * (w + gap), y, w, h }));
}

/** The panel's layout, centred: the open tab's `rows`, scrolled to row `scroll` (kept in range). */
export function gearPanelLayout(rows: readonly RowSpec[], scroll: number): GearPanelLayout {
  const P = GEAR_PANEL;
  const S = P.list.scrollbar;
  const x = Math.round((VIEW_WIDTH - P.w) / 2);
  const y = P.y;
  const inner = P.w - 2 * P.pad;
  const last = lastScroll(rows);
  const first = Math.min(Math.max(0, Math.round(scroll)), last);
  const listTop = y + P.list.y;
  const rowW = inner - S.w - S.gap;
  let at = listTop;
  const shown: { id: number; box: Box }[] = [];
  for (const r of rows.slice(first)) {
    if (!fits([...rows.slice(first, first + shown.length), r])) break;
    shown.push({ id: r.id, box: { x: x + P.pad, y: at, w: rowW, h: rowHeight(r) } });
    at += rowHeight(r) + P.list.gap;
  }
  // The thumb's share of the track is the share of rows shown; it slides with the first row shown.
  const track = { x: x + P.pad + inner - S.w, y: listTop, w: S.w, h: P.list.h };
  const thumbH = rows.length === 0 ? track.h : Math.max(S.minThumb, (track.h * shown.length) / rows.length);
  const thumb = { ...track, y: track.y + (last === 0 ? 0 : ((track.h - thumbH) * first) / last), h: last === 0 ? track.h : thumbH };
  return {
    panel: { x, y, w: P.w, h: P.h },
    title: { x: x + P.pad, y: y + P.title.y },
    identify: { x: x + P.w - P.pad - P.identify.w, y: y + P.identify.y, w: P.identify.w, h: P.identify.h },
    cells: across(x, y + P.cells.y, P.cells.h, P.cells.gap, GEAR_SLOTS.length).map((box, i) => ({ slot: GEAR_SLOTS[i] ?? 'helm', box })),
    tabs: across(x, y + P.tabs.y, P.tabs.h, P.tabs.gap, GEAR_SLOTS.length).map((box, i) => ({ slot: GEAR_SLOTS[i] ?? 'helm', box })),
    rows: shown,
    scroll: { first, last },
    track,
    thumb,
    empty: { x: x + P.pad + P.list.text.x, y: listTop + P.list.text.line1 },
    totals: [0, 1].map((i) => ({ x: x + P.pad, y: y + P.totals.y + i * P.totals.step })),
  };
}

/** True if a point is inside a box. */
export const inBox = (b: Box, px: number, py: number): boolean => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
