import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_MENU_LAYOUT, STAGE_PANEL } from '../data/hudLayout';
import { STAGE_ROWS } from '../data/stages';

// Where the bench's Stages panel (029) sits on screen, beside the bench's gear panel
// (036), and where its header and rows are. No Phaser, so e2e tests can find a row to click.

export interface StagePanelLayout {
  /** The tablet behind it. */
  panel: { x: number; y: number; w: number; h: number };
  /** The header's top-left. */
  header: { x: number; y: number };
  /** One row per bench row shown (039.12: a stage on one family), in STAGE_ROWS order; `stageId` is the row's id. */
  rows: { stageId: string; x: number; y: number; w: number; h: number }[];
  /** The line under the rows where the hovered row's generated text shows (039), the top of its capitals. */
  line: { x: number; y: number };
  /** Where the bench's own panel starts, px from the screen's left: the pair is centred together. */
  benchX: number;
}

/** The pair's left edge, with a bench panel `benchWidth` px wide beside the Stages panel (0: the Stages panel alone). */
function pairLeft(benchWidth: number, w: number): number {
  const total = benchWidth > 0 ? benchWidth + STAGE_PANEL.gap + w : w;
  return Math.round((VIEW_WIDTH - total) / 2);
}

/** The Stages panel's width, px. */
export const STAGE_PANEL_WIDTH = CRAFT_MENU_LAYOUT.rowWidth + 2 * STAGE_PANEL.pad;

/** The panel's layout, right of a bench panel `benchWidth` px wide, the two centred together (0: the panel is centred alone), with these rows (every bench row by default). */
export function stagePanelLayout(benchWidth: number, ids: readonly string[] = STAGE_ROWS.map((r) => r.id)): StagePanelLayout {
  const L = CRAFT_MENU_LAYOUT;
  const P = STAGE_PANEL;
  const w = STAGE_PANEL_WIDTH;
  const h = 2 * P.pad + P.headerHeight + ids.length * L.rowHeight + Math.max(0, ids.length - 1) * L.rowGap + P.lineGap + P.lineHeight;
  const left = pairLeft(benchWidth, w);
  const x = benchWidth > 0 ? left + benchWidth + P.gap : left;
  const y = Math.round((VIEW_HEIGHT - h) / 2);
  const top = y + P.pad + P.headerHeight;
  return {
    panel: { x, y, w, h },
    header: { x: x + P.pad, y: y + P.pad },
    rows: ids.map((stageId, i) => ({ stageId, x: x + P.pad, y: top + i * (L.rowHeight + L.rowGap), w: L.rowWidth, h: L.rowHeight })),
    line: { x: x + P.pad, y: y + h - P.pad - P.lineHeight },
    benchX: left,
  };
}
