import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_MENU_LAYOUT, PICKER_LAYOUT } from '../data/hudLayout';
import { STAGES } from '../data/stages';

// Where the bench's Stages panel (029) sits on screen, beside the bench's own rows,
// and where its header and rows are. No Phaser, so e2e tests can find a row to click.

/** The panel: the crafting menu's rows (026) on a tablet, a header over them, `gap` px right of the bench's rows. */
export const STAGE_PANEL = { pad: 6, headerHeight: 16, gap: 12, title: 'Stages' } as const;

export interface StagePanelLayout {
  /** The tablet behind it. */
  panel: { x: number; y: number; w: number; h: number };
  /** The header's top-left. */
  header: { x: number; y: number };
  /** One row per stage, in stage order. */
  rows: { stageId: string; x: number; y: number; w: number; h: number }[];
  /** How far the bench's own rows move left so the two sit side by side, px. */
  benchShift: number;
}

/** The panel's layout, with `benchRows` rows of the bench's own beside it (none: the panel is centred). */
export function stagePanelLayout(benchRows: number): StagePanelLayout {
  const L = CRAFT_MENU_LAYOUT;
  const P = STAGE_PANEL;
  const ids = Object.keys(STAGES);
  const w = L.rowWidth + 2 * P.pad;
  const h = 2 * P.pad + P.headerHeight + ids.length * L.rowHeight + (ids.length - 1) * L.rowGap;
  const benchWidth = PICKER_LAYOUT.rowWidth + 2 * PICKER_LAYOUT.pad;
  const total = benchRows > 0 ? benchWidth + P.gap + w : w;
  const left = Math.round((VIEW_WIDTH - total) / 2);
  const x = benchRows > 0 ? left + benchWidth + P.gap : left;
  const y = Math.round((VIEW_HEIGHT - h) / 2);
  // The bench's rows are centred on screen by themselves (menuRows); move them to the left of the panel.
  const benchShift = benchRows > 0 ? left + PICKER_LAYOUT.pad - Math.round((VIEW_WIDTH - PICKER_LAYOUT.rowWidth) / 2) : 0;
  const top = y + P.pad + P.headerHeight;
  return {
    panel: { x, y, w, h },
    header: { x: x + P.pad, y: y + P.pad },
    rows: ids.map((stageId, i) => ({ stageId, x: x + P.pad, y: top + i * (L.rowHeight + L.rowGap), w: L.rowWidth, h: L.rowHeight })),
    benchShift,
  };
}
