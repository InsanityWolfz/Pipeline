// Layouts for the HUD pieces and the crafting menu added in 005. Px values
// tuned by eye; colours are palette ids.

import { CRAFT_GROUPS } from './recipes';

/** The harvest progress bar over a node: size, gap above the sprite, and palette ids. */
export const HARVEST_BAR = { w: 20, h: 3, gap: 2, border: 1, color: 'cyan', back: 'ink' } as const;

/** The item and ammo icons' size, px (16×16 vector frames, src/data/art/items.ts). */
export const ITEM_ICON_SIZE = 16;

/** Size of the hotbar cell (025), px: a tablet with a well, as the build bar's cells use too. */
const CELL = { w: 24, h: 28, step: 26, key: { x: 3, y: 3 }, icon: { x: 6, y: 3 }, count: { x: 4, y: 20 } } as const;
/** How much bigger the tube slot's icons and text are than the hotbar's (025). */
const ACTIVE_SCALE = 1.4;

/**
 * The bottom HUD (025): the hotbar row of three cells (keys 1, 2 and 3: key number,
 * icon, carried count) centred `margin` px above the bottom edge, and the tube slot
 * centred `gap` px above it. The tube slot shows what the next press fires: one unit
 * per round (a carried round, each round of a volley, or the fist), each the cell's size
 * times `activeScale`, its icon centred and its count or label centred under it, units
 * `gap` px apart. Px from each cell's or unit's top-left.
 */
export const HUD_LAYOUT = {
  margin: 6,
  gap: 4,
  activeScale: ACTIVE_SCALE,
  cell: CELL,
  tubeSlot: {
    /** The cell's width scaled, plus 4 px so the 1.4× "Melee" label (28 px) clears the ring with `labelPad` each side. */
    w: Math.round(CELL.w * ACTIVE_SCALE) + 4,
    h: Math.round(CELL.h * ACTIVE_SCALE),
    /** The icon's top, and the count's or label's top (the top of its capitals), scaled from the cell's. */
    iconY: Math.round(CELL.icon.y * ACTIVE_SCALE),
    countY: Math.round(CELL.count.y * ACTIVE_SCALE),
    /** Each round's well inside the frame, px in from the unit's edges; a label keeps `labelPad` px clear of the well's ring each side. */
    wellInset: 2,
    labelPad: 2,
    melee: 'Melee',
  },
} as const;

/** The tube slot's width for `units` rounds (025): units side by side, `gap` px apart. */
export function tubeSlotWidth(units: number): number {
  const n = Math.max(1, units);
  return n * HUD_LAYOUT.tubeSlot.w + (n - 1) * HUD_LAYOUT.gap;
}

/** Every menu's rows are this wide (the picker, pause and site menus, and the crafting menu), so the menus match. */
const MENU_ROW_WIDTH = 184;

/** The crafting menu's rows (026): as wide as the other menus' rows, taller, for a name under each icon. */
const CRAFT_ROW = { w: MENU_ROW_WIDTH, h: 28, gap: 1 } as const;
const CRAFT_HEADER = 16;
const CRAFT_ROWS_AT = { x: 6, y: 6 } as const;
/** Every header and recipe row the menu lists: one header per ammo group, a row per recipe. */
const CRAFT_HEADERS = CRAFT_GROUPS.length;
const CRAFT_RECIPES = CRAFT_GROUPS.reduce((n, g) => n + g.recipes.length, 0);

/**
 * The crafting menu, centred on screen with its title card. Rows are listed group by
 * group: a header with the ammo's icon and name, then one row per recipe. Each input
 * and the output has its item's name in small text under its icon (026), centred under
 * it, or starting at its left edge when wider. Px from the panel's top-left, then from
 * each row's top-left.
 */
export const CRAFT_MENU_LAYOUT = {
  width: CRAFT_ROW.w + 2 * CRAFT_ROWS_AT.x,
  height: CRAFT_ROWS_AT.y * 2 + CRAFT_HEADERS * CRAFT_HEADER + CRAFT_RECIPES * CRAFT_ROW.h + (CRAFT_RECIPES - 1) * CRAFT_ROW.gap,
  /** First row's top-left inside the panel. */
  rowsAt: CRAFT_ROWS_AT,
  rowWidth: CRAFT_ROW.w,
  rowHeight: CRAFT_ROW.h,
  rowGap: CRAFT_ROW.gap,
  /** Item icons are this tall, `iconY` px down the row; each name's capitals start `labelY` px down. */
  iconSize: ITEM_ICON_SIZE,
  iconY: 2,
  labelY: 20,
  headerHeight: CRAFT_HEADER,
  /** Up to three inputs, `step` px apart (room for the longest name): icon, then "have/need" beside it. */
  input: { x: 2, step: 40, textX: 17, textY: 7 },
  arrow: { x: 122, y: 8 },
  output: { x: 134, textX: 18, madeY: 3, ownedY: 11 },
  /** The ammo's icon, and its name beside it (026). */
  headerIcon: { x: 2, y: 0 },
  headerName: { x: 22, y: 5 },
  /** Alpha of the icons on a row the player can't afford; its names and counts stay readable at `greyTextAlpha`. */
  greyAlpha: 0.35,
  greyTextAlpha: 0.8,
  /** An input the player is short of: its name and count in this colour (palette id). */
  missing: 'rust-light',
  /** The title card over the panel (020): a tablet `w` x `h` px, `gap` px above the panel, the title `titleY` px down it. */
  title: { text: 'Crafting', w: 128, h: 22, gap: 4, titleY: 4 },
} as const;

/**
 * The build bar, along the bottom of the screen in the hotbar row's place (025: the row
 * hides while building): one cell per unlocked piece in build bar order, its icon inside
 * (a machine shows what it makes). Cells use the hotbar's cell sprites. The pieces sit
 * in groups (026), `groupGap` px apart with a thin divider centred in each gap (a group
 * with no unlocked piece isn't shown), and each group's label centred over it in a row `label.h`
 * px tall, `label.gap` px above the cells. Px on screen, then from each cell's top-left.
 */
export const BUILD_BAR_LAYOUT = {
  /** Distance from the screen's bottom edge to the cells' bottom. */
  bottom: HUD_LAYOUT.margin,
  cellStep: CELL.step,
  cellWidth: CELL.w,
  cellHeight: CELL.h,
  icon: { x: 4, y: 6 },
  groupGap: 12,
  /** The divider: a line this colour (palette id) and alpha, from the label row's top to `inset` px above the cells' bottom. */
  divider: { color: 'brass', alpha: 0.7, width: 1, inset: 2 },
  label: { h: 9, gap: 2 },
} as const;

/** How far the build-bar pulse's ring reaches round its cell, px; its sprite is a px wider still, so the ring's edge isn't clipped. */
const PULSE_OUT = 3;
const PULSE_INSET = PULSE_OUT + 1;

/**
 * The pulse over a build-bar cell the current objective names (027): a ring reaching `out` px round the cell, drawn in
 * a `w` x `h` sprite with the cell's top-left at (`inset`, `inset`); its alpha swings between `min` and `max` once per `periodMs`.
 */
export const BUILD_PULSE = {
  out: PULSE_OUT,
  inset: PULSE_INSET,
  w: BUILD_BAR_LAYOUT.cellWidth + 2 * PULSE_INSET,
  h: BUILD_BAR_LAYOUT.cellHeight + 2 * PULSE_INSET,
  periodMs: 1100,
  min: 0.2,
  max: 1,
} as const;

/** The ghost of the piece to place: palette tints for where it can and can't go, and its alpha. */
export const GHOST = { okTint: 'cyan', badTint: 'rust', alpha: 0.6 } as const;

/**
 * The hopper menu: a column of craft rows, centred on screen. A take-out row shows
 * the hopper's icon, then the item and the hopper's count; a put-in row shows the
 * item and how many are held. Px on screen, then per row.
 */
export const PICKER_LAYOUT = {
  /** The tablet behind the rows (020): padding round them. */
  pad: 4,
  rowWidth: MENU_ROW_WIDTH,
  rowHeight: 20,
  rowGap: 1,
  icon: { x: 4, y: 2 },
  count: { x: 24, y: 8 },
  /** How far a take-out row's item icon and count shift right, past the hopper icon. */
  takeShift: 20,
  /** The one-line hint under the rows (022): how many a click moves, and its gap below the last row. */
  hint: { text: 'Click 1 · Shift half · Ctrl all', gap: 4 },
} as const;

/** The hover readout over a machine: a dark box of icon + count lines. Px from its top-left. */
export const READOUT_LAYOUT = {
  pad: 3,
  lineHeight: 17,
  width: 44,
  count: { x: 19, y: 6 },
  /** Gap above the machine's sprite. */
  gap: 4,
} as const;

/** The bench's Stages panel (029): the crafting menu's rows (026) on a tablet, a header over them, `gap` px right of the bench's rows. */
export const STAGE_PANEL = { pad: 6, headerHeight: 16, gap: 12, title: 'Stages' } as const;

/** Pylon and stash menus (009): rows per column before wrapping, and the gap between columns, px. */
export const MENU_MAX_ROWS = 10;
export const MENU_COLUMN_GAP = 8;

/** Palette tints on the player's body for the worn armor's weight (010). */
export const ARMOR_TINTS = { light: 'leaf-light', heavy: 'rock' } as const;

/**
 * World names on mouse-over (015). Things without a tile (enemies, nodes, ground
 * items) count as under the cursor inside a box this wide and tall above their
 * ground point (px, by kind). The name sits `rise` px above the ground point, or
 * `gap` px above a foundry piece's top.
 */
export const HOVER_NAME = {
  enemy: { w: 24, h: 34, rise: 40 },
  node: { w: 24, h: 34, rise: 40 },
  item: { w: 12, h: 12, rise: 14 },
  /** A hover still hits this fraction of a box's height below its ground point. */
  below: 0.25,
  tile: { rise: 40 },
  /** A ley line (018) hovers within this many px of its seam, and names itself this far above the cursor. */
  leyLine: 8,
  leyLineRise: 14,
  /** The description line (018) sits this far under the name, px. */
  descriptionGap: 2,
  gap: 4,
  /** The name's tablet (020): padding px, and its alpha. */
  pad: 2,
  alpha: 0.85,
} as const;

/** World names for things that aren't pieces, enemies, nodes or items (015). */
export const WORLD_NAMES = {
  pylon: 'Ley pylon',
  tubeStone: 'Tube stone',
  dormantTube: 'Dormant tube',
  crystal: 'Ley crystal',
  leyLine: 'Ley line',
  intake: 'Foundry intake',
} as const;

/** The build bar's hover tablet (015): wrap width in characters, padding and line height, px, and its gap above the bar. */
export const BUILD_TIP = { wrap: 34, maxLines: 2, pad: 4, lineHeight: 10, gap: 4 } as const;

/**
 * The minimap (017): the overworld's terrain at `scale` view px per tile in the
 * top-right corner, a stone frame, and markers. Colours are palette ids; no
 * enemies are shown.
 */
export const MINIMAP = {
  scale: 1.5,
  margin: 6,
  /** The stone tablet framing it (020), px beyond the map. */
  frame: { width: 2 },
  terrain: {
    '.': 'grass-bright',
    ',': 'dirt',
    ':': 'water-light',
    '~': 'water',
    T: 'leaf-dark',
    R: 'rock',
    B: 'rock-light',
    '#': 'rock-dark',
    D: 'gold-trim',
  } as Readonly<Record<string, string>>,
  markers: {
    player: { color: 'snow', r: 2 },
    entrance: { color: 'gold-trim', r: 2 },
    shrine: { color: 'wisp-light', r: 2 },
    claimed: { color: 'cyan', r: 3 },
  },
  /** Discovered landmarks' icons (032), by marker: shown at this scale of their sprite (landmarkAssets' MAP_ICONS). */
  landmarkScale: 0.8,
} as const;

/**
 * Panels that change size (020), drawn live in the look of the HUD's vector tablets (src/data/art/hud.ts):
 * carved stone with an ink edge, a lit top bevel, a dark base line and brass corner brackets `corner` px long.
 * Palette ids and alphas.
 */
export const TABLET = {
  fill: 'carve-dark',
  fillAlpha: 0.94,
  edge: 'ink',
  bevel: 'carve-light',
  base: 'mortar',
  brass: 'brass',
  corner: 4,
} as const;

/** Menu rows (020): a pressed row flashes brass for this long, ms. */
export const MENU_FEEDBACK = { pressMs: 160 } as const;

/**
 * The pause menu (020, Esc): a dim over the world, a title card, and rows for sound on/off, the master volume
 * (its − and + by the row's right end, px from the row's left) and resume. Rows use the menu row frames.
 */
export const PAUSE_MENU = {
  title: 'Paused',
  note: 'Esc to resume',
  card: { w: 128, h: 30, gap: 6, titleY: 4, noteY: 19 },
  dim: { color: 'ink', alpha: 0.5 },
  rowGap: 4,
  label: { x: 10, y: 6 },
  value: { x: 150, y: 6 },
  volume: { down: 128, up: 170, hit: 12 },
  rows: { sound: 'Sound', volume: 'Volume', resume: 'Resume' },
} as const;
