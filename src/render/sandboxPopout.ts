import { VIEW_WIDTH } from '../data/config';
import { SANDBOX_PANEL } from '../data/sandbox';
import type { ScreenBox } from './bottomHud';
import { stripLayout } from './sandboxStrip';

// The sandbox's pop-outs (057), pure so they're unit tested: which panels are open and how far each has slid out, and
// where the tabs and panels sit at any point of the slide. Open, a panel is 056's tablet (stripLayout); closed, it's
// off its edge and only its tab shows, on the edge, at 056's top. The tab rides on the panel's outer edge.

const P = SANDBOX_PANEL;

export type PanelId = 'loadout' | 'spawn';
/** Left, then right. */
export const PANEL_IDS: readonly PanelId[] = ['loadout', 'spawn'];

/** Where one panel and its tab are, view px, at a point of the slide. */
export interface PopoutPlace {
  panel: ScreenBox;
  tab: ScreenBox;
}

/** Eased out: quick from the edge, settling at the end. */
const easeOut = (t: number): number => 1 - (1 - t) ** P.slideEase;

/**
 * The panel and its tab with the panel `t` of the way out (0 closed, off the edge; 1 open, 056's box), whole px. The
 * left panel's right edge starts at the screen's left edge; the right one's left edge at the screen's right edge.
 */
export function popoutPlace(id: PanelId, t: number): PopoutPlace {
  const L = stripLayout();
  const open = id === 'loadout' ? L.left : L.right;
  const travel = P.margin + open.w;
  const out = Math.round(easeOut(Math.min(1, Math.max(0, t))) * travel);
  const x = id === 'loadout' ? out - open.w : VIEW_WIDTH - out;
  const tabX = id === 'loadout' ? x + open.w : x - P.tabs.w;
  return { panel: { ...open, x }, tab: { x: tabX, y: open.y, w: P.tabs.w, h: P.tabs.h } };
}

/** 056.4, 057: the pickup feed's first line in the sandbox: `feed.gap` px right of the Loadout tab, level with its top. */
export function sandboxFeedAt(loadoutOut: number): { x: number; y: number } {
  const { tab } = popoutPlace('loadout', loadoutOut);
  return { x: tab.x + tab.w + P.feed.gap, y: tab.y };
}

/**
 * Which panels the player has open (057.1: neither at the start) and how far each has slid, 0–1. A toggle turns one
 * round mid-slide; the slide runs at one panel's width per `slideMs` either way (057.4).
 */
export class PopoutState {
  private readonly want: Record<PanelId, boolean> = { loadout: false, spawn: false };
  private readonly t: Record<PanelId, number> = { loadout: 0, spawn: 0 };

  /** The player's choice for the panel: open or closed (it may still be sliding there). */
  isOpen(id: PanelId): boolean {
    return this.want[id];
  }

  get anyOpen(): boolean {
    return PANEL_IDS.some((id) => this.want[id]);
  }

  /** How far out the panel is, 0 (closed) to 1 (open). */
  out(id: PanelId): number {
    return this.t[id];
  }

  /** All the way out: its rows can be clicked. */
  fullyOut(id: PanelId): boolean {
    return this.t[id] === 1;
  }

  /** Either is moving. */
  get sliding(): boolean {
    return PANEL_IDS.some((id) => this.t[id] !== (this.want[id] ? 1 : 0));
  }

  toggle(id: PanelId): void {
    this.want[id] = !this.want[id];
  }

  /** 057.3: both open, or both closed. */
  setBoth(open: boolean): void {
    for (const id of PANEL_IDS) this.want[id] = open;
  }

  /** Moves each panel toward its choice by `deltaMs`. */
  step(deltaMs: number): void {
    const by = Math.max(0, deltaMs) / P.slideMs;
    for (const id of PANEL_IDS) this.t[id] = this.want[id] ? Math.min(1, this.t[id] + by) : Math.max(0, this.t[id] - by);
  }
}
