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
