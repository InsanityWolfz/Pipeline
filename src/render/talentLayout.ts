import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { TALENT_PANEL } from '../data/talentAssets';
import { TALENT_LIST, type TalentDef } from '../data/talents';
import type { ScreenRect } from './foundryLayout';

// Where the tree panel (037, T) sits on screen, view px: its title card, the tablet,
// each node's centre and radius, the info strip and the reset button. No Phaser, so
// e2e tests and the panel share it.

export interface TalentNodeSpot {
  id: string;
  x: number;
  y: number;
  /** Its drawn radius (half its sprite's size). */
  r: number;
}

export interface TalentPanelLayout {
  title: ScreenRect;
  panel: ScreenRect;
  header: { x: number; y: number };
  /** The constellation's centre: the start's position. */
  centre: { x: number; y: number };
  nodes: TalentNodeSpot[];
  info: { x: number; y: number; w: number };
  reset: ScreenRect;
  /** The hint's top-left, bottom left beside the reset button. */
  hint: { x: number; y: number };
}

/** A node's drawn diameter by its kind. */
export const nodeSize = (t: Pick<TalentDef, 'kind'>): number => TALENT_PANEL.size[t.kind];

/** The panel centred on screen under its title card, the constellation centred across it. */
export function talentPanelLayout(): TalentPanelLayout {
  const P = TALENT_PANEL;
  const top = Math.round((VIEW_HEIGHT - (P.title.h + P.title.gap + P.h)) / 2);
  const x = Math.round((VIEW_WIDTH - P.w) / 2);
  const y = top + P.title.h + P.title.gap;
  const centre = { x: x + P.w / 2, y: y + P.constellationY };
  return {
    title: { x: Math.round((VIEW_WIDTH - P.title.w) / 2), y: top, w: P.title.w, h: P.title.h },
    panel: { x, y, w: P.w, h: P.h },
    header: { x: x + P.pad, y: y + P.header.y },
    centre,
    nodes: TALENT_LIST.map((t) => ({ id: t.id, x: centre.x + t.pos.x, y: centre.y + t.pos.y, r: nodeSize(t) / 2 })),
    info: { x: x + P.pad, y: y + P.info.y, w: P.w - 2 * P.pad },
    reset: { x: x + P.w - P.pad - P.reset.w, y: y + P.h - P.pad - P.reset.h, w: P.reset.w, h: P.reset.h },
    hint: { x: x + P.pad, y: y + P.h - P.pad - P.reset.h + P.reset.textY },
  };
}

/** The node under a view point (within its radius plus the hit pad), or null. */
export function talentAt(layout: TalentPanelLayout, x: number, y: number): string | null {
  const hit = layout.nodes.find((n) => Math.hypot(x - n.x, y - n.y) <= n.r + TALENT_PANEL.hitPad);
  return hit?.id ?? null;
}

/** True if a view point is on a rect. */
export const onRect = (r: ScreenRect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
