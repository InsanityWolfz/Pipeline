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

/** The hopper picker: a column of held items in craft rows, centred on screen. Px on screen, then per row. */
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
