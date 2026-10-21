// The HUD pass (031): the bottom-left HP bar, the inventory panel and the pickup
// feed. Px tuned by eye; colours are palette ids. Beside hudLayout.ts, which holds
// the 025 bottom row these must stay clear of.

import { CRATE_SLOTS } from './foundry';
import { HUD_LAYOUT } from './hudLayout';
import { type ItemGroup } from './items';

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
  // 045: red (Shaun's note 2), a palette red; the low colour and the low-HP edges stay as 031 set them.
  fillColor: 'danger',
  lowColor: 'hit-red',
  chunkColor: 'snow',
  shield: { gap: 4, w: 14, h: 16, valueGap: 2, valueW: 12, valueY: 6 },
  /** Nothing worn: the shield and its "0" at this alpha. */
  dimAlpha: 0.4,
  /**
   * The XP row (037), `gap` px under the frame and `h` tall: a thin `bar` under the fill (its `back` well, the XP in
   * `fill`, a `tick` of `tickColor` at its end on a gain), and "Lv 7" under the shield (capitals' top `textY` down the
   * row), with the unspent-points pip (`pipHalf` px to its centre) `pipGap` px after it. Px from the row's top-left.
   */
  xp: { gap: 2, h: 6, bar: { x: 4, y: 1, w: 144, h: 3 }, back: 'ink', backAlpha: 0.7, fill: 'cyan', tickColor: 'snow', textY: 0, pipGap: 2, pipY: 3, pipHalf: 3 },
} as const;

/** The whole HP block's width: the frame, then the shield and its value. */
export const HEALTH_BLOCK_WIDTH = (() => {
  const L = HUD_HEALTH_LAYOUT;
  return L.frame.w + L.shield.gap + L.shield.w + L.shield.valueGap + L.shield.valueW;
})();

/** The whole HP block's height: the frame, then the XP row under it (037). */
export const HEALTH_BLOCK_HEIGHT = HUD_HEALTH_LAYOUT.frame.h + HUD_HEALTH_LAYOUT.xp.gap + HUD_HEALTH_LAYOUT.xp.h;

/** The XP row's "Lv 7". */
export const levelText = (level: number): string => `Lv ${level}`;

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
 * The grid inventory (047, note 12; I or Tab, and under a hopper's or crate's screen): a tablet under a title card,
 * `cols` x `rows` slots shown (047.2: 8×5), the grid scrolling by whole rows past that with a thin bar at its right.
 * Each slot is the HUD's cell (`cell` x, `rowStep` y apart) holding one stack: its icon, its count, and while any of it
 * is at risk (031) the warning mark beside the count and the count in the risk colour. A Sort button above the grid's
 * right end; footer lines under it explain the marking and count the identified gear (a death never takes it).
 * A hopper's or crate's screen puts its own slots on top (`container`: a header, then one row), the grid underneath.
 * The menu never prints the click controls (Shaun: "don't show those controls on the menu it looks bad").
 * Px from each part's top-left; text at the top of its capitals.
 */
export const INVENTORY_GRID = {
  title: { text: 'Inventory', w: 128, h: 22, gap: 4, titleY: 4 },
  cols: 8,
  rows: 5,
  cell: { w: 24, h: 28, stepX: 26, stepY: 30, icon: { x: 4, y: 3 }, count: { x: 2, y: 20 }, warn: { x: 16, y: 19, w: 8, h: 8 } },
  pad: 6,
  /** The row above the grid holding the Sort button at its right: `h` tall, `gap` above the grid. */
  toolbar: { h: 13, gap: 2 },
  sort: { text: 'Sort', w: 30, h: 13, textY: 3 },
  /** The scroll bar: `w` wide, `gap` px right of the grid; its thumb in `thumb` (at least `minThumb` px long), the track in `track` (palette ids). */
  scroll: { w: 3, gap: 4, track: 'ink', thumb: 'brass', trackAlpha: 0.5, minThumb: 4 },
  /** A hopper's or crate's own slots: a header `headerH` tall (its name), one row of `cols` cells (a crate's slots, 050), `gap` above the grid's toolbar. */
  container: { headerH: 10, nameY: 1, cols: CRATE_SLOTS, gap: 4 },
  /**
   * 052: the stash's screen. Its title card reads `title` (the stash's only label); the stash's own grid sits on top,
   * `rows` of the grid's columns scrolling by rows with no limit, `gap` above the inventory's toolbar (which names it
   * `invName`). The inventory shows `invRows` and no footer, so both fit over the HUD.
   */
  stash: { title: 'Stash', invName: 'Inventory', rows: 3, invRows: 4, gap: 4 },
  footer: {
    gap: 3,
    lineHeight: 9,
    /** The at-risk rule, in two lines so it fits the panel. */
    text: ['Marked: lost if you die before reaching', 'the foundry or a claimed pylon.'],
  },
  /** Gap kept between the panel and the intake bar over the bottom HUD, px. */
  aboveHud: 4,
  colors: { safe: 'cyan', risk: 'rust-light', dim: 'rock-pale' },
  /** Dim text (the footer) at this alpha. */
  dimAlpha: 0.7,
  text: { worn: 'worn', armor: 'armor', sep: ' · ' },
} as const;

/** "N spare pieces (kept)": the identified pieces not worn, which a death never takes. */
export const sparesText = (n: number): string => `${n} spare piece${n === 1 ? '' : 's'} (kept)`;

/** The schematics' shared slot (033): "Schematics" while it holds several known kinds or known and unknown together. */
export const SCHEMATICS_LABEL = 'Schematics';

/** The grid's size, px: its columns and `rows` rows of cells (the inventory's 5 unless told). */
export function gridSize(rows: number = INVENTORY_GRID.rows): { w: number; h: number } {
  const G = INVENTORY_GRID;
  return { w: (G.cols - 1) * G.cell.stepX + G.cell.w, h: (rows - 1) * G.cell.stepY + G.cell.h };
}

/** What the grid panel shows (047, 052): the plain inventory, a hopper's or crate's screen, or the stash's. */
export type GridMode = 'bag' | 'container' | 'stash';

/** The footer's lines (047): the at-risk rule's lines, then the gear line. */
export const FOOTER_LINES = INVENTORY_GRID.footer.text.length + 1;

/** The panel's size (047): a container's row on top, the stash's grid on top (052, and a shorter inventory with no footer), or neither. */
export function inventoryPanelSize(mode: GridMode = 'bag'): { w: number; h: number } {
  const G = INVENTORY_GRID;
  const S = G.stash;
  const stash = mode === 'stash';
  const grid = gridSize(stash ? S.invRows : G.rows);
  const top = mode === 'container' ? G.container.headerH + G.cell.h + G.container.gap : stash ? gridSize(S.rows).h + S.gap : 0;
  const footer = stash ? 0 : G.footer.gap + FOOTER_LINES * G.footer.lineHeight;
  return { w: 2 * G.pad + grid.w + G.scroll.gap + G.scroll.w, h: 2 * G.pad + top + G.toolbar.h + G.toolbar.gap + grid.h + footer };
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
