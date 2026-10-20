import { VIEW_WIDTH } from '../data/config';
import { BUILD_STRIP } from '../data/hudLayout';
import type { BindAction } from '../data/settings';
import { buildStripTop, type ScreenBox } from './bottomHud';
import { keyLabel } from './keyHint';

// The build controls strip (045, note 9), pure: its entries with the player's bound keys (042), and where each part
// sits, centred along the strip's row above the build bar's labels.

export interface StripEntry {
  key: string;
  does: string;
}

/** The strip's entries: each input as shown (a bound key, or a mouse input) and what it does. */
export function buildStripEntries(bindings: Readonly<Record<BindAction, string>>): StripEntry[] {
  return BUILD_STRIP.entries.map((e) => ({ key: 'action' in e.input ? keyLabel(bindings[e.input.action]) : e.input.mouse, does: e.does }));
}

/** Each entry's key and words, x and y the top of their capitals; and the back behind them all. */
export interface StripLayout {
  parts: { key: { x: number; y: number }; does: { x: number; y: number } }[];
  back: ScreenBox;
}

/** Lays the entries out from their measured widths, centred on the view. */
export function buildStripLayout(widths: readonly { key: number; does: number }[]): StripLayout {
  const S = BUILD_STRIP;
  const total = widths.reduce((w, e) => w + e.key + S.keyGap + e.does, 0) + Math.max(0, widths.length - 1) * S.entryGap;
  const top = buildStripTop();
  const y = top + S.textY;
  let x = Math.round((VIEW_WIDTH - total) / 2);
  const back = { x: x - S.pad, y: top, w: total + 2 * S.pad, h: S.h };
  const parts = widths.map((e) => {
    const key = { x, y };
    const does = { x: x + e.key + S.keyGap, y };
    x = does.x + e.does + S.entryGap;
    return { key, does };
  });
  return { parts, back };
}
