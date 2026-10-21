import { VIEW_WIDTH } from '../data/config';
import { MENU_ROW_H, MENU_ROW_W } from '../data/flowLayout';
import { SANDBOX, SANDBOX_ARENAS, SANDBOX_KEY_LIST, SANDBOX_PANEL, SANDBOX_TEXT } from '../data/sandbox';
import { ACTION_LABELS, type BindAction } from '../data/settings';
import type { ScreenBox } from './bottomHud';
import { keyLabel } from './keyHint';

// Where the sandbox's controls sit (056), pure so they're unit tested: the strip down the left edge (the loadout's
// rows, then the key list) and the spawn column on the right; and the key list's lines from the player's bindings.

const P = SANDBOX_PANEL;

/** One drawn line of the key list: the action's name and its keys. */
export interface KeyListLine {
  label: string;
  keys: string;
}

/** The strip's two tablets and where its key list starts, view px. */
export interface StripLayout {
  /** The left strip: the loadout's title and rows, then the key list. */
  left: ScreenBox;
  /** The spawn column. */
  right: ScreenBox;
  /** The divider's y between the loadout's rows and the key list, and the first key line's top. */
  ruleY: number;
  keysY: number;
}

/** The loadout's rows: each entrance, god mode, each boss reset (sandboxColumns' order). */
export const LOADOUT_ROWS = SANDBOX.loadout.length + 1 + SANDBOX_ARENAS.length;
/** The spawn column's rows: enemy, ring, champion, count, Spawn, Clear. */
export const SPAWN_ROWS = 6;

/** `n` rows' height with their gaps (no sub lines in the sandbox's rows). */
const rowsHeight = (n: number): number => n * MENU_ROW_H + Math.max(0, n - 1) * P.rows.gap;

/** The strip and the spawn column, both their full height. */
export function stripLayout(): StripLayout {
  const w = MENU_ROW_W + 2 * P.pad;
  const rowsBottom = P.leftY + P.pad + P.titleH + rowsHeight(LOADOUT_ROWS);
  const keysY = rowsBottom + P.keys.gap;
  const leftH = keysY + SANDBOX_KEY_LIST.length * P.keys.step + P.pad - P.leftY;
  return {
    left: { x: P.margin, y: P.leftY, w, h: leftH },
    right: { x: VIEW_WIDTH - P.margin - w, y: P.rightY, w, h: P.pad + P.titleH + rowsHeight(SPAWN_ROWS) + P.pad },
    ruleY: rowsBottom + Math.floor(P.keys.gap / 2),
    keysY,
  };
}

/** An action's key as shown ("Space", "1", "Right click"), or nothing when it has none. */
const shown = (bindings: Readonly<Record<BindAction, string>>, a: BindAction): string => (bindings[a] ? keyLabel(bindings[a]) : '');

/** The key list's lines (056.2) from the player's bindings (042), so a rebind shows at once. */
export function keyListLines(bindings: Readonly<Record<BindAction, string>>): KeyListLine[] {
  return SANDBOX_KEY_LIST.map((line) => {
    if ('fixed' in line) return { label: line.label, keys: line.fixed };
    const keys = line.actions.map((a) => shown(bindings, a)).filter((k) => k !== '');
    const first = line.actions[0];
    const label = line.label ?? (first ? ACTION_LABELS[first] : '');
    return { label, keys: keys.length > 0 ? keys.join(' ') : SANDBOX_TEXT.unbound };
  });
}

/** 056.4: the pickup feed's first line in the sandbox: `feed.gap` px right of the strip, level with its top. */
export function sandboxFeedAt(): { x: number; y: number } {
  const { left } = stripLayout();
  return { x: left.x + left.w + P.feed.gap, y: left.y };
}
