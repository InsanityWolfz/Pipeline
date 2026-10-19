import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { CRAFT_MENU_LAYOUT, PICKER_LAYOUT } from '../data/hudLayout';
import { RESEARCH_GROUPS, RESEARCH_NODES } from '../data/research';
import { RESEARCH_LIST, RESTORE_PANEL } from '../data/researchAssets';
import type { ScreenRect } from './foundryLayout';

// Where the restore panel and the research list (033) sit on screen, view px. No
// Phaser, so e2e tests can find the Restore row to click.

export interface RestorePanelLayout {
  panel: ScreenRect;
  name: { x: number; y: number };
  effect: { x: number; y: number };
  /** The cost row (the craft menu's recipe row). */
  cost: ScreenRect;
  /** The Restore row (the picker's row). */
  restore: ScreenRect;
}

/** The restore panel, centred on screen. */
export function restorePanelLayout(): RestorePanelLayout {
  const P = RESTORE_PANEL;
  const w = CRAFT_MENU_LAYOUT.rowWidth + 2 * P.pad;
  const h = 2 * P.pad + P.costY + P.costRow.h + P.gap + PICKER_LAYOUT.rowHeight;
  const x = Math.round((VIEW_WIDTH - w) / 2);
  const y = Math.round((VIEW_HEIGHT - h) / 2);
  const inner = { x: x + P.pad, y: y + P.pad };
  const costY = inner.y + P.costY;
  return {
    panel: { x, y, w, h },
    name: { x: inner.x, y: inner.y + P.name.y },
    effect: { x: inner.x, y: inner.y + P.effect.y },
    cost: { x: inner.x, y: costY, w: CRAFT_MENU_LAYOUT.rowWidth, h: P.costRow.h },
    restore: { x: inner.x + Math.round((CRAFT_MENU_LAYOUT.rowWidth - PICKER_LAYOUT.rowWidth) / 2), y: costY + P.costRow.h + P.gap, w: PICKER_LAYOUT.rowWidth, h: PICKER_LAYOUT.rowHeight },
  };
}

export interface ResearchListLayout {
  title: ScreenRect;
  panel: ScreenRect;
  /** Each group's header top-left and its rows' tops, in RESEARCH_GROUPS order. */
  groups: { id: string; x: number; y: number; rows: number[] }[];
  footer: { x: number; y: number };
}

/** The research list, centred on screen under its title card: one column of groups. */
export function researchListLayout(): ResearchListLayout {
  const L = RESEARCH_LIST;
  const counts = RESEARCH_GROUPS.map((g) => RESEARCH_NODES.filter((n) => g.anchors.includes(n.anchor.kind)).length);
  const body = counts.reduce((h, n) => h + L.headerHeight + n * L.rowHeight, 0) + (counts.length - 1) * L.groupGap;
  const h = 2 * L.pad + body + L.footer.gap + L.footer.lineHeight;
  const x = Math.round((VIEW_WIDTH - L.width) / 2);
  const y = Math.round((VIEW_HEIGHT - h + L.title.h + L.title.gap) / 2);
  let at = y + L.pad;
  const groups = RESEARCH_GROUPS.map((g, i) => {
    const top = at;
    const n = counts[i] ?? 0;
    at += L.headerHeight + n * L.rowHeight + L.groupGap;
    return { id: g.id, x: x + L.pad, y: top, rows: Array.from({ length: n }, (_, k) => top + L.headerHeight + k * L.rowHeight) };
  });
  return {
    title: { x: Math.round((VIEW_WIDTH - L.title.w) / 2), y: y - L.title.gap - L.title.h, w: L.title.w, h: L.title.h },
    panel: { x, y, w: L.width, h },
    groups,
    footer: { x: x + L.pad, y: y + h - L.pad - L.footer.lineHeight },
  };
}
