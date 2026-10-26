// Asset keys and look numbers for 063's art: the build bar's Tools group (the Area tool and the Blueprints list), the
// area box over the foundry, the blueprint list and the blueprint ghost. Render draws by these keys; the shapes are in
// src/data/art/blueprints.ts. Sizes view px for the HUD and world px in the foundry; alphas 0..1.

export const BLUEPRINT_SPRITES = {
  /** The Tools group's emblems: a dashed cyan box with a pointer (the Area tool), a rolled ley-drawn sheet (Blueprints). */
  areaEmblem: 'emblem-area',
  listEmblem: 'emblem-blueprints',
  /** A list row's delete mark: a small rust X in a carved round stone. */
  deleteMark: 'blueprint-delete',
} as const;

/**
 * The Tools group (063): two build-bar cells (the Area tool, then Blueprints) under a "Tools" label, right-aligned
 * `right` px in from the view's right edge and raised over the bar's own label row by `lift` px, so they never widen
 * the bar. A greyed cell (Blueprints before the table) is drawn at `lockedAlpha`. The hover line sits `tipGap` px over
 * its cell.
 */
export const TOOLS_LAYOUT = { right: 8, lift: 3, lockedAlpha: 0.4, tipGap: 2 } as const;

/**
 * The area box (063) in the player's cyan: its outline `width` px, a faint fill, and each counted piece's outline
 * `inset` px inside its tiles.
 */
export const AREA_LOOK = {
  color: 'cyan',
  width: 1.5,
  alpha: 0.95,
  fill: { color: 'cyan', alpha: 0.12 },
  piece: { color: 'cyan-glow', width: 1, alpha: 0.9, inset: 2 },
} as const;

/**
 * The blueprint list (063): a tablet in the house panel style over the Tools group's label, `gap` px above it and
 * right-aligned with it, `pad` px in round a title line and one menu row (`rowH` tall, `rowGap` apart, the menus'
 * 184 px rows) per blueprint: its icon, its name, its piece count right-aligned before the delete mark at the row's
 * right end. Px from the row's top-left; text at the top of its capitals.
 */
export const BLUEPRINT_LIST = {
  gap: 4,
  pad: 4,
  rowW: 184,
  rowH: 20,
  rowGap: 1,
  title: { h: 14, y: 3 },
  icon: { x: 4, y: 2 },
  name: { x: 24, y: 8 },
  count: { right: 24, y: 9 },
  /** The delete mark's box (`size` px square); `mark` is its 16 px icon's art size, centred on that box. */
  del: { size: 14, right: 3, y: 3, mark: 16 },
  /** The empty list's line, in the row's place. */
  empty: { y: 8 },
} as const;

/**
 * The blueprint ghost (063): every piece drawn at `alpha` in the build ghost's tints (GHOST: cyan where it goes, rust
 * where it can't), each tile of a piece that can't go filled red (`tile`, `inset` px in). Hovering a piece not yet
 * unlocked shows its line `hoverRise` px over the tile's top, in world px.
 */
export const BLUEPRINT_GHOST = { alpha: 0.6, tile: { color: 'danger', alpha: 0.32, inset: 1 }, hoverRise: 3 } as const;
