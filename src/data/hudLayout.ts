// Layouts for the HUD pieces and the crafting menu added in 005. Px values
// tuned by eye; colours are palette ids.

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

/**
 * The crafting menu, centred on screen. Rows are listed group by group: a header
 * with the ammo's icon, then one row per recipe. Px from the panel's top-left,
 * then from each row's top-left.
 */
export const CRAFT_MENU_LAYOUT = {
  width: 196,
  height: 252,
  /** First row's top-left inside the panel. */
  rowsAt: { x: 6, y: 8 },
  rowHeight: 20,
  /** Item icons are this tall; they sit centred in a row. */
  iconSize: ITEM_ICON_SIZE,
  rowGap: 1,
  headerHeight: 16,
  /** Up to three inputs: icon, then "have/need" beside it. */
  input: { x: 2, step: 34, textX: 17, textY: 8 },
  arrow: { x: 108, y: 8 },
  output: { x: 120, textX: 18, madeY: 4, ownedY: 11 },
  headerIcon: { x: 2, y: 0 },
  /** Alpha of a row the player can't afford. */
  greyAlpha: 0.35,
  /** The title card over the panel (020): a tablet `w` x `h` px, `gap` px above the panel, the title `titleY` px down it. */
  title: { text: 'Crafting', w: 128, h: 22, gap: 4, titleY: 4 },
} as const;

/**
 * The build bar, along the bottom of the screen in the hotbar row's place (025: the row
 * hides while building): one cell per unlocked piece in build bar order, its icon inside
 * (a machine shows what it makes). Cells use the hotbar's cell sprites. Px on screen,
 * then from each cell's top-left.
 */
export const BUILD_BAR_LAYOUT = {
  /** Distance from the screen's bottom edge to the cells' bottom. */
  bottom: HUD_LAYOUT.margin,
  cellStep: CELL.step,
  cellWidth: CELL.w,
  cellHeight: CELL.h,
  icon: { x: 4, y: 6 },
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
  rowWidth: 184,
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

/** Pylon and stash menus (009): rows per column before wrapping, and the gap between columns, px. */
export const MENU_MAX_ROWS = 10;
export const MENU_COLUMN_GAP = 8;

/** The worn armor's icon and value, right of the health bar (010). Px on screen. */
export const HUD_ARMOR_LAYOUT = { x: 62, y: 2, count: { x: 18, y: 6 } } as const;

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
