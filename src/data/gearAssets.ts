import type { GearSlot, Rarity } from './gear';

// Asset keys, the bench's gear panel layout and the relics' look (036). Render draws by
// these keys; the shapes are in src/data/art/gear.ts. Times ms (on the tween clock),
// sizes view px for the panel and world px for effects, alphas 0..1.

export const GEAR_SPRITES = {
  /** Slot icons (the body's are 010's light and heavy armor icons). */
  helm: 'gear-helm',
  boots: 'gear-boots',
  trinket: 'gear-trinket',
  /** A rounded frame round a piece's icon in its rarity's colour. */
  frameCommon: 'gear-frame-common',
  frameFine: 'gear-frame-fine',
  frameRare: 'gear-frame-rare',
  frameRelic: 'gear-frame-relic',
  /** The four relics' own icons. */
  relicRollbreaker: 'relic-rollbreaker',
  relicWardstone: 'relic-wardstone',
  relicFeatherplate: 'relic-featherplate',
  relicEmber: 'relic-ember',
  /** The Wardstone's ready shimmer round the player: a faint violet ring of light. */
  wardShimmer: 'ward-shimmer',
  /** Last Ember's flash as it saves the player. */
  emberFlash: 'ember-flash',
  /** A relic's flare over the bench as it's identified. */
  relicFlare: 'relic-flare',
} as const;

/** Each rarity's icon frame. */
export const RARITY_FRAMES: Readonly<Record<Rarity, string>> = {
  common: GEAR_SPRITES.frameCommon,
  fine: GEAR_SPRITES.frameFine,
  rare: GEAR_SPRITES.frameRare,
  relic: GEAR_SPRITES.frameRelic,
};

/** Each slot's name on the bench. */
export const SLOT_NAMES: Readonly<Record<GearSlot, string>> = { helm: 'Helm', body: 'Body', boots: 'Boots', trinket: 'Trinket' };

/**
 * The bench's gear panel (036), centred on screen (left of 029's Stages panel, STAGE_PANEL.gap apart, once the shrine is claimed): a title and
 * the Identify button, four slot cells (the worn piece in each), a tab per slot, the open tab's rows (paged when they
 * don't fit), a pager and the totals. View px from the panel's top-left, then from each part's top-left; text at the
 * top of its capitals.
 */
export const GEAR_PANEL = {
  w: 280,
  h: 214,
  /** Its top, view px: high enough that it clears the bottom HUD's tube slot. */
  y: 48,
  pad: 6,
  title: { text: 'Gear', y: 7 },
  /** The Identify button, right of the title. */
  identify: { w: 96, h: 14, y: 4, textY: 4, text: (n: number): string => `Identify all (${n})` },
  /** Four cells in a row, each the worn piece's frame and icon, the slot's name, its armor and the worn piece's name. */
  cells: { y: 22, h: 36, gap: 4, icon: { x: 13, y: 13 }, slot: { x: 27, y: 5 }, armor: { x: 27, y: 14 }, name: { x: 4, y: 27 } },
  tabs: { y: 62, h: 13, gap: 4, textY: 3 },
  /** The open tab's rows: a frame and icon (centred at `icon`), the name over the affixes, a relic's rule under them; a worn row's edge `wornEdge` px wide. */
  list: { y: 79, h: 96, gap: 2, rowH: 22, relicH: 30, icon: { x: 13, y: 11 }, text: { x: 26, line1: 4, line2: 13, line3: 22 }, rightPad: 4, wornEdge: 2 },
  pager: { y: 177, h: 10, textY: 2 },
  totals: { y: 191, step: 9 },
  /** The words it shows. */
  words: {
    empty: (slot: string): string => `No ${slot.toLowerCase()} pieces`,
    emptyCell: 'empty',
    worn: 'worn',
    armor: 'armor',
    sep: ' · ',
    page: (index: number, count: number): string => `Page ${index + 1}/${count} ›`,
  },
  /** An empty cell's frame and slot icon are drawn this faint. */
  emptyAlpha: { frame: 0.5, icon: 0.35 },
  /** Fills and lines (palette ids and alphas): the tablet's wells, the selected tab, a hovered row, the worn row's edge. */
  colors: {
    well: { color: 'ink', alpha: 0.35 },
    tab: { color: 'carve-dark', alpha: 0.8 },
    tabOn: { color: 'brass-dark', alpha: 0.9 },
    hover: { color: 'brass', alpha: 0.18 },
    worn: { color: 'cyan', alpha: 0.9 },
    button: { color: 'cyan-deep', alpha: 0.9 },
    buttonEdge: { color: 'cyan', alpha: 1 },
    dim: 'rock-light',
    wornText: 'cyan',
    rule: 'wisp-light',
    pagerHover: 'brass-light',
    /** A press flashes this colour, fading from `alpha` over `flashMs`. */
    flash: { color: 'brass-light', alpha: 0.35 },
  },
  /** A pressed row or button flashes this long. */
  flashMs: 160,
} as const;

/** The relics' effects on the player and at the bench. Depths are px above (or below) the player's feet, or the bench's base. */
export const RELIC_LOOK = {
  /** The Wardstone's shimmer while ready: at the player's feet, `lift` px up, breathing between two alphas once per `breatheMs`. */
  shimmer: { lift: 6, alpha: [0.55, 0.95] as const, breatheMs: 1400, depthBelow: 1 },
  /** The ward breaking on a block: the shimmer swells from `from` to `to` times and fades over `ms`. */
  wardBreak: { ms: 420, from: 1, to: 2.2, depthAbove: 1 },
  /** Last Ember's flash on a save: from `from` to `to` times, fading over `ms`, `lift` px over the feet. */
  ember: { ms: 650, from: 0.8, to: 2.6, lift: 18, depthAbove: 2 },
  /** A relic identified: a violet flare rising `rise` px over the bench, from `from` to `to` times, over `ms`. */
  flare: { ms: 1100, from: 0.6, to: 1.6, rise: 18, depthAbove: 2 },
} as const;
