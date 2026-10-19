// The HUD pass (031): the bottom-left HP bar, the inventory panel and the pickup
// feed. Px tuned by eye; colours are palette ids. Beside hudLayout.ts, which holds
// the 025 bottom row these must stay clear of.

import { VIEW_HEIGHT } from './config';
import { HUD_LAYOUT } from './hudLayout';
import { ITEMS, type ItemGroup } from './items';

/**
 * The HP bar (031): bottom-left, `HUD_LAYOUT.margin` px in from the left and bottom edges (raised over the build bar's
 * labels when the bar would reach it). A carved `frame` round the `fill` well, "72 / 100" in the count font centred on
 * it (capitals' top `textY` px down the frame); right of the frame, `shield.gap` px on, the shield icon and the worn
 * armor value (room kept for `valueW` px of it), replacing 010's armor icon. Px from the frame's top-left.
 */
export const HUD_HEALTH_LAYOUT = {
  frame: { w: 152, h: 20 },
  fill: { x: 4, y: 4, w: 144, h: 12 },
  textY: 7,
  fillColor: 'leaf',
  lowColor: 'hit-red',
  chunkColor: 'snow',
  shield: { gap: 4, w: 14, h: 16, valueGap: 2, valueW: 12, valueY: 6 },
  /** Nothing worn: the shield and its "0" at this alpha. */
  dimAlpha: 0.4,
} as const;

/** The whole HP block's width: the frame, then the shield and its value. */
export const HEALTH_BLOCK_WIDTH = (() => {
  const L = HUD_HEALTH_LAYOUT;
  return L.frame.w + L.shield.gap + L.shield.w + L.shield.valueGap + L.shield.valueW;
})();

/**
 * The HP bar's motion (031): below `lowFraction` of max health it turns red and pulses once per `pulseMs` (up to
 * `pulseScale` bigger, its fill washed `pulseBrighten` toward white) with red screen edges (`edge`: palette id, peak
 * alpha, and where they start as a fraction of the way to the corners). A drop leaves the lost part white for
 * `chunkHoldMs`, then drains it over `chunkDrainMs`. While healing the fill closes on the new value with time constant
 * `riseMs` instead of jumping, and a cyan `glow` (palette id, sprite padding px, rings) fades in and out over `fadeMs`.
 */
export const HP_BAR = {
  lowFraction: 0.25,
  pulseMs: 900,
  /** The pulse grows the frame up and right from its bottom-left corner, so it never crosses the margin or reaches the shield. */
  pulseScale: 0.025,
  pulseBrighten: 0.35,
  /** `floor`: the edges' alpha at the pulse's low, as a fraction of `alpha`. */
  edge: { color: 'hit-red', alpha: 0.6, inner: 0.4, floor: 0.6 },
  chunkHoldMs: 400,
  chunkDrainMs: 300,
  riseMs: 220,
  /** The rising fill snaps onto the new value once within this many HP. */
  riseSnap: 0.05,
  /** The glow's rings sit `out` px outside the frame and its blur reaches no further than `reach` px past it (inside the margin). */
  glow: { color: 'cyan', pad: 8, fadeMs: 200, rings: [{ out: 1, width: 2, alpha: 0.5, blur: 4 }, { out: 0.5, width: 1.2, alpha: 0.95, blur: 3 }], reach: 6 },
} as const;

/** The inventory panel's groups (031), in the order they always appear, each with its header. */
export const INVENTORY_GROUPS: readonly { id: ItemGroup; label: string }[] = [
  { id: 'raw', label: 'Raw' },
  { id: 'parts', label: 'Parts' },
  { id: 'ammo', label: 'Ammo' },
  { id: 'gear', label: 'Gear' },
  { id: 'cores', label: 'Cores' },
];

/**
 * The inventory panel (031, I or Tab): a tablet centred on screen under a title card, its groups in columns
 * `columnWidth` wide and `columnGap` apart, `pad` px in. Each group is a header `headerHeight` tall, then a row
 * `rowHeight` tall per carried item: its icon, name, carried count, the risk mark (all safe: "safe"; some at risk:
 * "N safe ·", the warning mark, "N at risk") and "home N" ending at the column's right edge. Px from each row's
 * top-left (text at the top of its capitals). Each group keeps room for every item it could list, so the panel is one
 * size and never jumps; Gear keeps `gearLines` more for the worn piece and the spares. A footer under the columns
 * explains the rule.
 */
export const INVENTORY_PANEL = {
  title: { text: 'Inventory', w: 128, h: 22, gap: 4, titleY: 4 },
  pad: 8,
  columnWidth: 236,
  columnGap: 14,
  headerHeight: 12,
  headerY: 2,
  rowHeight: 16,
  groupGap: 6,
  gearLines: 2,
  row: { name: { x: 19, y: 5 }, count: { x: 102, y: 5 }, mark: { x: 118, y: 5 }, warn: { y: 4, gap: 2 }, home: { y: 5 } },
  nothing: { text: 'Nothing', x: 2, y: 3 },
  text: { safe: 'safe', atRisk: 'at risk', sep: ' · ', home: 'home', worn: 'worn', armor: 'armor' },
  footer: { text: 'At risk: lost if you die before reaching the foundry or a claimed pylon.', gap: 6, lineHeight: 9 },
  colors: { safe: 'cyan', risk: 'rust-light', dim: 'rock-pale' },
  /** Dim text ("Nothing", "home N", the footer) at this alpha. */
  dimAlpha: 0.7,
} as const;

/** "N spare pieces (kept)": the identified pieces not worn, which a death never takes. */
export const sparesText = (n: number): string => `${n} spare piece${n === 1 ? '' : 's'} (kept)`;

/**
 * How many rows a group keeps room for: one per item of the group, the schematics sharing one (033: unknown ones
 * must not tell apart), and Gear's worn and spare lines.
 */
export function reservedRows(group: ItemGroup): number {
  const items = Object.values(ITEMS).filter((it) => it.group === group);
  const schematics = items.filter((it) => it.kind === 'schematic').length;
  return items.length - schematics + Math.min(1, schematics) + (group === 'gear' ? INVENTORY_PANEL.gearLines : 0);
}

/** The schematics' shared row (033): "Schematics" while it holds several known kinds or known and unknown together. */
export const SCHEMATICS_LABEL = 'Schematics';

/** A group's height on the panel: its header and every row it keeps room for. */
export const groupHeight = (g: ItemGroup): number => INVENTORY_PANEL.headerHeight + reservedRows(g) * INVENTORY_PANEL.rowHeight;
const columnHeight = (groups: readonly ItemGroup[]): number =>
  groups.reduce((h, g) => h + groupHeight(g), 0) + Math.max(0, groups.length - 1) * INVENTORY_PANEL.groupGap;

/** The tallest a column can be: the view less the margins, the title card, the panel's padding and the footer. */
const MAX_COLUMN =
  VIEW_HEIGHT - 2 * HUD_LAYOUT.margin - INVENTORY_PANEL.title.h - INVENTORY_PANEL.title.gap - 2 * INVENTORY_PANEL.pad - INVENTORY_PANEL.footer.gap - INVENTORY_PANEL.footer.lineHeight;

/** Every way to cut `groups`, in order, into `k` columns, each whole. */
function splits(groups: readonly ItemGroup[], k: number): ItemGroup[][][] {
  if (k === 1) return groups.length > 0 ? [[[...groups]]] : [];
  const out: ItemGroup[][][] = [];
  for (let i = 1; i < groups.length; i++) for (const rest of splits(groups.slice(i), k - 1)) out.push([[...groups.slice(0, i)], ...rest]);
  return out;
}

/**
 * The groups by column: one column if it fits, else the fewest columns that do, groups whole and in order, cut where
 * the tallest column is shortest.
 */
export function inventoryColumns(): ItemGroup[][] {
  const groups = INVENTORY_GROUPS.map((g) => g.id);
  for (let k = 1; k <= groups.length; k++) {
    const best = splits(groups, k).sort((a, b) => Math.max(...a.map(columnHeight)) - Math.max(...b.map(columnHeight)))[0];
    if (best && Math.max(...best.map(columnHeight)) <= MAX_COLUMN) return best;
  }
  return groups.map((g) => [g]);
}

/** The height of the tallest column, px. */
export const inventoryColumnsHeight = (): number => Math.max(...inventoryColumns().map(columnHeight));

/** The panel's size (its tablet sprite is drawn at this size). */
export function inventoryPanelSize(): { w: number; h: number } {
  const P = INVENTORY_PANEL;
  const n = inventoryColumns().length;
  return { w: 2 * P.pad + n * P.columnWidth + (n - 1) * P.columnGap, h: 2 * P.pad + inventoryColumnsHeight() + P.footer.gap + P.footer.lineHeight };
}

/**
 * The pickup feed (031): top-left where the materials column was, clear of the minimap and objective line (top-right).
 * A line per item picked up, newest on top, `lineStep` apart: its icon and "+N Name" (capitals' top at `text`) on a
 * faint tablet `pad` px round them sideways, `width` px at most. A line holds `holdMs` after its last repeat, then fades over
 * `fadeMs`; at most `maxLines` show.
 */
export const PICKUP_FEED = {
  x: HUD_LAYOUT.margin,
  y: HUD_LAYOUT.margin,
  lineStep: 18,
  width: 140,
  icon: { x: 0, y: 0 },
  text: { x: 19, y: 5 },
  pad: 2,
  /** Each line's tablet: from `back.y` px below the line's top, `back.h` px tall (an icon's height). */
  back: { y: -1, h: 16 },
  alpha: 0.75,
  holdMs: 2500,
  fadeMs: 400,
  maxLines: 5,
} as const;
