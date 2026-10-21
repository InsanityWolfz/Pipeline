import { inHollows } from './hollows';

/**
 * The minimap (017): the overworld's terrain at `scale` view px per tile in the
 * top-right corner, a stone frame, and markers. Colours are palette ids; no
 * enemies are shown.
 */
export const MINIMAP = {
  /** 053: the whole round world (168 tiles across) at this many view px a tile: about 100 px square. */
  scale: 0.6,
  margin: 6,
  /** The stone tablet framing it (020), px beyond the map. */
  frame: { width: 2 },
  /**
   * Each tile's colour by symbol. 051 (B.5, Shaun: the pools "look like stuff you can go get"): water, trees, boulders
   * and ruin stones are scenery, off the minimap, drawn as the ground round them; paths, walls and cliffs stay.
   */
  terrain: {
    '.': 'grass-bright',
    ',': 'dirt',
    ':': 'grass-bright',
    '~': 'grass-bright',
    T: 'grass-bright',
    R: 'grass-bright',
    B: 'grass-bright',
    '#': 'rock-dark',
    D: 'gold-trim',
    // Stonefall Hollows (034).
    C: 'hollow-dark',
    P: 'hollow-pale',
    F: 'hollow',
    A: 'hollow-light',
    '=': 'hollow-pale',
  } as Readonly<Record<string, string>>,
  /** The Hollows' own colours (034), by symbol, over `terrain`: its open ground is stone, not grass (051: its scenery too). */
  hollowsTerrain: { '.': 'hollow-light', ':': 'hollow-light', '~': 'hollow-light', R: 'hollow-light', T: 'hollow-light', B: 'hollow-light' } as Readonly<Record<string, string>>,
  /** 051 (B.5): a tile never on screen is fogged, this colour (palette id). */
  fog: 'hood-dark',
  markers: {
    player: { color: 'snow', r: 2 },
    claimed: { color: 'cyan', r: 3 },
    /** 033: a schematic lying on the ground, pinged by a ring growing out from it over `ping.ms`. */
    schematic: { color: 'cyan-glow', r: 2 },
  },
  /** 051 (B.5): the places shown as icons once their tile has been seen (landmarkAssets' MAP_ICONS), by marker kind. */
  icons: { entrance: 'foundry', shrine: 'pylon', arena: 'arena' },
  ping: { ms: 1100, reach: 6, color: 'cyan-glow', width: 1 },
  /** Discovered landmarks' icons (032), by marker: shown at this scale of their sprite (landmarkAssets' MAP_ICONS). */
  landmarkScale: 0.6,
  /**
   * 051 (B.5): hovering an icon (or a claimed pylon's dot) within `reach` view px names it in a small tablet `gap` px
   * left of the minimap's frame, level with the icon, padded `pad` px.
   */
  hover: { reach: 5, gap: 4, pad: 3 },
  /** 051 (B.5): what hovering names the places that aren't landmarks (an arena and a landmark go by their own names). */
  names: { entrance: 'Foundry', shrine: 'Shrine' },
} as const;

/** 051: the symbols that are scenery, drawn on the minimap as the ground round them (water, shallows, trees, ruin stones, boulders). */
export const MINIMAP_SCENERY = [':', '~', 'T', 'R', 'B'] as const;

/** The palette id the minimap draws an overworld tile in: the Hollows' own colour there (034), else Region 1's. */
export const minimapColor = (symbol: string, tx: number, ty: number): string =>
  (inHollows(tx, ty) ? MINIMAP.hollowsTerrain[symbol] : undefined) ?? MINIMAP.terrain[symbol] ?? 'grass-bright';
