// Layouts for the HUD pieces and the crafting menu added in 005. Px values
// tuned by eye; colours are palette ids.

import { CRAFT_TAB_COLUMNS, CRAFT_TAB_ROWS, CRAFT_TABS } from './craftTabs';

/** The harvest progress bar over a node: size, gap above the sprite, and palette ids. */
export const HARVEST_BAR = { w: 20, h: 3, gap: 2, border: 1, color: 'cyan', back: 'ink' } as const;

/** The item and ammo icons' size, px (16×16 vector frames, src/data/art/items.ts). */
export const ITEM_ICON_SIZE = 16;

/** Size of the hotbar cell (025), px: a tablet with a well, as the build bar's cells use too. */
const CELL = { w: 24, h: 28, step: 26, key: { x: 3, y: 3 }, icon: { x: 6, y: 3 }, count: { x: 4, y: 20 } } as const;
/**
 * How much bigger the tube slot's icons and text are than the hotbar's (025: 1.4). fix-playtest-ui (Shaun: the bottom
 * HUD hid enemies, "maybe make the HUD not as large"): 1, the carried cells' size, so the HUD's top sits 3.6 tiles
 * below the player's feet (was 3.2) and the five-round slot is 156 × 28 px (was 206 × 39).
 */
const ACTIVE_SCALE = 1;

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
    /** The cell's width scaled, plus 4 px so the "Melee" label clears the ring with `labelPad` each side (025: 28 px at 1.4×). */
    w: Math.round(CELL.w * ACTIVE_SCALE) + 4,
    h: Math.round(CELL.h * ACTIVE_SCALE),
    /** The icon's top, and the count's or label's top (the top of its capitals), scaled from the cell's. */
    iconY: Math.round(CELL.icon.y * ACTIVE_SCALE),
    countY: Math.round(CELL.count.y * ACTIVE_SCALE),
    /** Each round's well inside the frame, px in from the unit's edges; a label keeps `labelPad` px clear of the well's ring each side. */
    wellInset: 2,
    labelPad: 2,
    melee: 'Melee',
    /** 070: the fist's label, tube empty with a carried round ready; `{key}` is the use key (RMB or the bound key). Widens the card. */
    tubeEmpty: 'Tube empty · {key} fires carried',
    mouseKey: 'RMB',
    /** 070: the widened card's well: its ring (palette id, alpha, px) and its fill, top to bottom. */
    wide: { ring: 'cyan', ringAlpha: 0.85, ringWidth: 1.2, wellTop: 'ink', wellBottom: 'carve-dark' },
  },
} as const;

/** 070: an emptied carried-bar slot's round icon and "0", drawn at this alpha (greyed) until another round takes the slot. */
export const CARRIED_EMPTY = { alpha: 0.35 } as const;

/** The tube slot's width for `units` rounds (025): units side by side, `gap` px apart. */
export function tubeSlotWidth(units: number): number {
  const n = Math.max(1, units);
  return n * HUD_LAYOUT.tubeSlot.w + (n - 1) * HUD_LAYOUT.gap;
}

/** Every menu's rows are this wide (the picker, pause and site menus, and the crafting menu), so the menus match. */
const MENU_ROW_WIDTH = 184;

/** The crafting menu's rows (026): as wide as the other menus' rows, taller, for a name under each icon. */
const CRAFT_ROW = { w: MENU_ROW_WIDTH, h: 28, gap: 1 } as const;
const CRAFT_ROWS_AT = { x: 6, y: 6 } as const;
/** The crafting menu's tabs (047): a column down the panel's left, `w` x `h` each, `gap` px apart; icon and name inside. */
const CRAFT_TAB = { w: 74, h: 22, gap: 2, icon: { x: 3, y: 3 }, name: { x: 22, y: 8 } } as const;
const CRAFT_TAB_GAP = 6;
/** 062: the gap between the stone rows' column and the tier rows' column beside it. */
const CRAFT_COLUMN_GAP = 6;
const craftRowsWidth = CRAFT_TAB_COLUMNS * CRAFT_ROW.w + (CRAFT_TAB_COLUMNS - 1) * CRAFT_COLUMN_GAP;
const craftRowsHeight = CRAFT_TAB_ROWS * CRAFT_ROW.h + (CRAFT_TAB_ROWS - 1) * CRAFT_ROW.gap;
const craftTabsHeight = CRAFT_TABS.length * CRAFT_TAB.h + (CRAFT_TABS.length - 1) * CRAFT_TAB.gap;

/**
 * The crafting menu (026; 047: a tab per ammo family), centred on screen with its title card. The tabs run down the
 * panel's left, the open tab's rows to their right, one row per recipe. Each input and the output has its item's name
 * in small text under its icon (026), centred under it, or starting at its left edge when wider. The menu doesn't
 * print the click controls (Shaun: "don't show those controls on the menu it looks bad"). Px from the panel's
 * top-left, then from each row's or tab's top-left.
 */
export const CRAFT_MENU_LAYOUT = {
  width: CRAFT_ROWS_AT.x + CRAFT_TAB.w + CRAFT_TAB_GAP + craftRowsWidth + CRAFT_ROWS_AT.x,
  height: CRAFT_ROWS_AT.y * 2 + Math.max(craftRowsHeight, craftTabsHeight),
  /** The tabs' column: its top-left inside the panel, each tab's size and gap, and where its icon and name sit. */
  tabsAt: CRAFT_ROWS_AT,
  tab: CRAFT_TAB,
  /** The open tab's brass stripe (palette id) down its right edge, `w` wide and `inset` px from its top and bottom; a closed tab's alpha. */
  tabOpen: 'brass',
  tabStripe: { w: 2, inset: 2 },
  tabClosedAlpha: 0.7,
  /** First row's top-left inside the panel. */
  rowsAt: { x: CRAFT_ROWS_AT.x + CRAFT_TAB.w + CRAFT_TAB_GAP, y: CRAFT_ROWS_AT.y },
  /** 062: a tab's tier rows stand in a second column, this far right of the first's left edge. */
  tierColumnX: CRAFT_ROW.w + CRAFT_COLUMN_GAP,
  rowWidth: CRAFT_ROW.w,
  rowHeight: CRAFT_ROW.h,
  rowGap: CRAFT_ROW.gap,
  /** Item icons are this tall, `iconY` px down the row; each name's capitals start `labelY` px down. */
  iconSize: ITEM_ICON_SIZE,
  iconY: 2,
  labelY: 20,
  /** Up to three inputs, `step` px apart (room for the longest name): icon, then "have/need" beside it. */
  input: { x: 2, step: 40, textX: 17, textY: 7 },
  arrow: { x: 122, y: 8 },
  output: { x: 134, textX: 18, madeY: 3, ownedY: 11 },
  /**
   * 066: the room kept between two item names in a row, px, so a long one ("Stormsteel arrowhead") moves clear of the
   * next. A name keeps `input.x` px from the row's ends, as the first icon does.
   */
  nameGap: 2,
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
  /**
   * 062: 1 px closer than the hotbar's cells, and the groups 6 px apart (was 12), so the Forge group fits the view too;
   * 064: 2 px closer (the cells touch), so the Lightning rune's piece fits beside it; 066: the groups 3 px apart, so
   * the Tempering coil fits too.
   */
  cellStep: CELL.step - 2,
  cellWidth: CELL.w,
  cellHeight: CELL.h,
  icon: { x: 4, y: 6 },
  groupGap: 3,
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
 * The menus' rows (the pylon, stash and waystone menus; 047 replaced the hopper menu with the grid's hopper
 * screen): a column of rows, centred on screen. A row shows its icons (`takeShift` apart) and its text. Px on screen,
 * then per row.
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

/** Palette tints on the player's body for the worn body piece's weight (010); Featherplate (036) shows no slow tint. */
export const ARMOR_TINTS = { light: 'leaf-light', heavy: 'rock', feather: 'leaf-light' } as const;

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
  /** 050 (A.2): the name and its description in the small label font. */
  style: 'label',
  /**
   * 050.1: the tag sits `gap` px under the thing's ground point, so its E prompt (a tile over its centre, 045) stays
   * clear; where that would cover the player, it goes above, its bottom at least this far over the ground point (a
   * piece's prompt, over its centre, tops out about 65 px over its ground point).
   */
  promptClear: 68,
  /** The player's sprite a tag never covers: this wide, this tall up from the feet, px. */
  playerBox: { w: 24, h: 44 },
  /** The E prompt's key cap a tag never covers (the 11 px key cap, 045), px. */
  promptCap: { w: 12, h: 11 },
} as const;

/** World names for things that aren't pieces, enemies, nodes or items (015). */
export const WORLD_NAMES = {
  pylon: 'Ley pylon',
  tubeStone: 'Tube stone',
  dormantTube: 'Dormant tube',
  crystal: 'Ley crystal',
  leyLine: 'Ley line',
  intake: 'Foundry intake',
  /** 034: the Sunken Forum's altar stone. */
  altar: 'Altar',
} as const;

/** Menu rows (020): a pressed row flashes brass for this long, ms (081: 160 → 140, inside the 150 ms motion rule). */
export const MENU_FEEDBACK = { pressMs: 140 } as const;

/**
 * The pause menu (020, Esc): a dim over the world, a title card, and rows (042): Resume, Settings (the sound rows
 * moved there) and Quit to title. Rows use the menu row frames.
 */
export const PAUSE_MENU = {
  title: 'Paused',
  note: 'Esc to resume',
  card: { w: 128, h: 30, gap: 6, titleY: 4, noteY: 19 },
  dim: { color: 'ink', alpha: 0.5 },
  rowGap: 4,
  label: { x: 10, y: 6 },
  rows: { resume: 'Resume', settings: 'Settings', quit: 'Quit to title' },
} as const;

/**
 * 058: the guided builds' look. Each ghost still to build is a glowing outline on its tile (`outline`), the next one
 * brighter (`next`) with its piece drawn faintly (`bodyAlpha`) and its facing arrows. In build mode an arrow bobs
 * `barArrowLift` px over the next piece's build-bar cell, and the cells the lock holds back show at `lockedAlpha`, with
 * the locked line `lockTipGap` px over the hovered one. A refused placement's hint shows for `hintMs`, `hintRise` px
 * over the build bar's labels. The bench screen's arrows point right at what to click, `benchArrowGap` px left of it.
 */
export const GUIDED_LOOK = {
  outline: { color: 'cyan', alpha: 0.35, width: 1 },
  next: { color: 'cyan-glow', alpha: 0.95, width: 2 },
  bodyAlpha: 0.4,
  inset: 2,
  barArrowLift: 4,
  lockedAlpha: 0.3,
  lockTipGap: 4,
  hintMs: 1600,
  hintRise: 14,
  benchArrowGap: 2,
  removeLabelRise: 8,
} as const;
