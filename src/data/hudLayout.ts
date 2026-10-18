// Layouts for the HUD pieces and the crafting menu added in 005. Px values
// tuned by eye; colours are palette ids.

/** The harvest progress bar over a node: size, gap above the sprite, and palette ids. */
export const HARVEST_BAR = { w: 20, h: 3, gap: 2, border: 1, color: 'ley-cyan', back: 'outline' } as const;

/**
 * The ammo strip right of the hotbar slot: one cell per ammo in key order,
 * px from each cell's top-left. Highlight drawn over the selected cell.
 */
export const AMMO_STRIP_LAYOUT = {
  gap: 4,
  cellStep: 26,
  key: { x: 3, y: 3 },
  icon: { x: 6, y: 3 },
  count: { x: 4, y: 20 },
} as const;

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
  iconSize: 16,
  rowGap: 1,
  headerHeight: 16,
  /** Up to three inputs: icon, then "have/need" beside it. */
  input: { x: 2, step: 34, textX: 17, textY: 8 },
  arrow: { x: 108, y: 8 },
  output: { x: 120, textX: 18, madeY: 4, ownedY: 11 },
  headerIcon: { x: 2, y: 0 },
  /** Alpha of a row the player can't afford. */
  greyAlpha: 0.35,
} as const;

/**
 * The build bar, along the bottom of the screen above the ammo strip: one cell per
 * unlocked piece in build bar order, its icon inside (a machine shows what it makes). Cells use the ammo strip's
 * cell sprites. Px on screen, then from each cell's top-left.
 */
export const BUILD_BAR_LAYOUT = {
  /** Distance from the screen's bottom edge to the cells' bottom. */
  bottom: 34,
  cellStep: 26,
  cellWidth: 24,
  cellHeight: 28,
  icon: { x: 4, y: 6 },
} as const;

/** The ghost of the piece to place: palette tints for where it can and can't go, and its alpha. */
export const GHOST = { okTint: 'ley-cyan', badTint: 'ember', alpha: 0.6 } as const;

/**
 * The hopper menu: a column of craft rows, centred on screen. A take-out row shows
 * the hopper's icon, then the item and the hopper's count; a put-in row shows the
 * item and how many are held. Px on screen, then per row.
 */
export const PICKER_LAYOUT = {
  /** The panel behind the rows: padding round them and palette ids. */
  pad: 4,
  back: 'outline',
  border: 'ley-deep',
  rowWidth: 184,
  rowHeight: 20,
  rowGap: 1,
  icon: { x: 4, y: 2 },
  count: { x: 24, y: 8 },
  /** How far a take-out row's item icon and count shift right, past the hopper icon. */
  takeShift: 20,
} as const;

/** The hover readout over a machine: a dark box of icon + count lines. Px from its top-left. */
export const READOUT_LAYOUT = {
  pad: 3,
  lineHeight: 17,
  width: 44,
  count: { x: 19, y: 6 },
  /** Gap above the machine's sprite. */
  gap: 4,
  back: 'outline',
  border: 'ley-deep',
} as const;

/** Pylon and stash menus (009): rows per column before wrapping, and the gap between columns, px. */
export const MENU_MAX_ROWS = 10;
export const MENU_COLUMN_GAP = 8;

/** The worn armor's icon and value, right of the health bar (010). Px on screen. */
export const HUD_ARMOR_LAYOUT = { x: 62, y: 2, count: { x: 18, y: 6 } } as const;

/** Palette tints on the player's body for the worn armor's weight (010). */
export const ARMOR_TINTS = { light: 'moss-light', heavy: 'slate-light' } as const;

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
  tile: { rise: 40 },
  gap: 4,
  /** The name's backing: padding px, the font's glyph height px, its palette colour and alpha. */
  pad: 2,
  glyphH: 5,
  back: 'outline',
  alpha: 0.85,
} as const;

/** World names for things that aren't pieces, enemies, nodes or items (015). */
export const WORLD_NAMES = {
  pylon: 'Ley pylon',
  tubeStone: 'Tube stone',
  dormantTube: 'Dormant tube',
  crystal: 'Ley crystal',
} as const;

/** The build bar's hover panel (015): wrap width in glyphs, padding and line height, px, and its gap above the bar. */
export const BUILD_TIP = { wrap: 34, maxLines: 4, pad: 4, lineHeight: 8, gap: 4, back: 'outline', alpha: 0.9, edge: 'slate-light' } as const;
