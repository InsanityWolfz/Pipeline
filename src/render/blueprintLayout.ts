import { TOOLS_LAYOUT } from '../data/blueprintAssets';
import { VIEW_WIDTH } from '../data/config';
import { BUILD_BAR_LAYOUT } from '../data/hudLayout';
import { buildBarLabelTop } from './bottomHud';
import type { ScreenRect } from './foundryLayout';
import { itemDef } from '../data/items';
import { LOGISTICS_ICONS } from '../data/foundryAssets';
import type { Blueprint } from '../sim/blueprints';
import { BLUEPRINT_TEXT } from '../data/blueprints';
import { footprint, type Tile } from '../sim/pieces';
import type { StampPiece } from '../sim/stamp';

// Where 063's HUD pieces sit, view px. No Phaser, so e2e tests can find them to click.

/** The build bar's Tools group's two buttons. */
export type ToolId = 'area' | 'list';
export const TOOL_IDS: readonly ToolId[] = ['area', 'list'];

/**
 * The Tools group's cells (063), the Area tool then Blueprints, in the bar's cell size and step: right-aligned near the
 * view's right edge, raised over the bar's label row so the bar (610 px with every piece) never has to widen.
 */
export function toolCells(): (ScreenRect & { tool: ToolId })[] {
  const L = BUILD_BAR_LAYOUT;
  const width = TOOL_IDS.length * L.cellStep - (L.cellStep - L.cellWidth);
  const x = VIEW_WIDTH - TOOLS_LAYOUT.right - width;
  const y = buildBarLabelTop() - TOOLS_LAYOUT.lift - L.cellHeight;
  return TOOL_IDS.map((tool, i) => ({ tool, x: x + i * L.cellStep, y, w: L.cellWidth, h: L.cellHeight }));
}

/** The Tools label's row over the cells, as the bar's group labels sit over theirs. */
export function toolsLabelBox(): ScreenRect {
  const L = BUILD_BAR_LAYOUT;
  const cells = toolCells();
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !last) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: first.x, y: first.y - L.label.gap - L.label.h, w: last.x + last.w - first.x, h: L.label.h };
}

/** The whole Tools group with its label, so a click there is the group's, not the world's. */
export function toolsBox(): ScreenRect {
  const label = toolsLabelBox();
  const first = toolCells()[0];
  return { x: label.x, y: label.y, w: label.w, h: (first ? first.y + first.h : label.y) - label.y };
}

/** A blueprint's icon: its named item's, or the conduit's emblem for Logistics. */
export function blueprintIcon(bp: Pick<Blueprint, 'itemId'>): string {
  return bp.itemId ? itemDef(bp.itemId).icon : (LOGISTICS_ICONS.conduit ?? '');
}

/** The blueprint ghost's hover (063): "Not unlocked" while the cursor is over a piece the player hasn't unlocked, else null. */
export function ghostHover(pieces: readonly StampPiece[], cursor: Tile | null): string | null {
  if (!cursor) return null;
  const over = (p: StampPiece): boolean => footprint(p.pieceId, p.tx, p.ty, p.facing).some((t) => t.tx === cursor.tx && t.ty === cursor.ty);
  return pieces.some((p) => p.fail === 'locked' && over(p)) ? BLUEPRINT_TEXT.notUnlocked : null;
}
