import { regionAt } from './hollows';

/**
 * The minimap (017): the overworld's terrain at `scale` view px per tile in the
 * top-right corner, a stone frame, and markers. Colours are palette ids; no
 * enemies are shown.
 */
export const MINIMAP = {
  /** 053: the whole round world at this many view px a tile: about 100 px square (060: 230 tiles across, 0.43; 064: 292, so 0.34 keeps it clear of the objective band). */
  scale: 0.34,
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
    // 055: a boss arena's door, brass in its wall.
    G: 'brass',
    // Stonefall Hollows (034).
    C: 'hollow-dark',
    P: 'hollow-pale',
    F: 'hollow',
    A: 'hollow-light',
    '=': 'hollow-pale',
  } as Readonly<Record<string, string>>,
  /** The Hollows' own colours (034), by symbol, over `terrain`: its open ground is stone, not grass (051: its scenery too). */
  hollowsTerrain: { '.': 'hollow-light', ':': 'hollow-light', '~': 'hollow-light', R: 'hollow-light', T: 'hollow-light', B: 'hollow-light' } as Readonly<Record<string, string>>,
  /**
   * The Emberworks' own colours (060), by symbol, over `terrain`: ash ground and terraces, soot-dark cliffs and
   * chimneys, rust kilns, the ramps' pale steps, the Slag River's ember and its bridges; its scenery as its ground.
   */
  emberworksTerrain: {
    '.': 'ash-light',
    ':': 'ash-light',
    '~': 'ash-light',
    R: 'ash-light',
    T: 'ash-light',
    B: 'ash-light',
    '=': 'ash-pale',
    C: 'ash-dark',
    K: 'rust',
    H: 'ash-dark',
    '^': 'ash-pale',
    '%': 'cinder',
    '+': 'carve-light',
  } as Readonly<Record<string, string>>,
  /**
   * The Stormcrown's own colours (064), by symbol, over `terrain`: slate ground, storm-dark cliffs, iron rods, pale
   * cairns, ink chasms, the ramps' pale steps and the Sky-bridge's deck; its scenery as its ground.
   */
  stormcrownTerrain: {
    '.': 'storm-light',
    ':': 'storm-light',
    '~': 'storm-light',
    R: 'storm-light',
    T: 'storm-light',
    B: 'storm-light',
    C: 'storm-dark',
    I: 'iron-dark',
    Y: 'storm-pale',
    V: 'ink',
    '^': 'ash-pale',
    '+': 'carve-light',
  } as Readonly<Record<string, string>>,
  /** 051 (B.5): a tile never on screen is fogged, this colour (palette id). */
  fog: 'hood-dark',
  markers: {
    player: { color: 'snow', r: 2 },
    claimed: { color: 'cyan', r: 3 },
    /** 033: a schematic lying on the ground, pinged by a ring growing out from it over `ping.ms`. */
    schematic: { color: 'cyan-glow', r: 2 },
  },
  /** 051 (B.5): the places shown as icons once their tile has been seen (landmarkAssets' MAP_ICONS), by marker kind. */
  icons: { entrance: 'foundry', shrine: 'pylon', arena: 'arena', returnStone: 'returnStone' },
  /**
   * 072.9: a woken return stone's icon (none while dormant: a pylon gets its own marker only once claimed) stands with
   * its foot on the stone's tile, its middle `lift` view px above it, so it rises clear of the Forum's arena icon just
   * south. Hovering it names the stone ("Sunken Forum door").
   */
  returnStone: { lift: 4 },
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

/** Each region's own colours over `terrain` (Region 1 has none of its own). */
const REGION_TERRAIN: Readonly<Record<number, Readonly<Record<string, string>>>> = { 2: MINIMAP.hollowsTerrain, 3: MINIMAP.emberworksTerrain, 4: MINIMAP.stormcrownTerrain };

/** The palette id the minimap draws an overworld tile in: its region's own colour there (034: the Hollows', 060: the Emberworks', 064: the Stormcrown's), else Region 1's. */
export const minimapColor = (symbol: string, tx: number, ty: number): string => REGION_TERRAIN[regionAt(tx, ty)]?.[symbol] ?? MINIMAP.terrain[symbol] ?? 'grass-bright';
