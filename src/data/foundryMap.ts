// The foundry's minimap (051, B.6, Shaun: "literally dots and lines on the screen is fine"): inside the foundry it
// takes the overworld minimap's place in the top-right corner. Conduits (and the other carriers) are lines, machines
// and the other placed pieces dots, and icons mark the intake (the tube), the bench, the stash, the door, the open
// entrances and the supply ports. Items moving aren't shown. Px are view px; colours palette ids.

export const FOUNDRY_MAP = {
  /** View px per tile, and the gap from the screen's top-right corner (the overworld minimap's, MINIMAP.margin). */
  scale: 4,
  margin: 6,
  frame: { width: 2 },
  /** The room's tiles: floor, walls, the door. */
  floor: 'flag-dark',
  wall: 'mortar',
  door: 'gold-trim',
  /** Carriers: a line through each from the side it takes from to the side it hands to. */
  line: { color: 'cyan', width: 1.2 },
  /** Placed pieces as dots, by kind. */
  dots: {
    machine: { color: 'brass-light', r: 1.8 },
    hopper: { color: 'rock-light', r: 1.3 },
    crate: { color: 'wood-light', r: 1.3 },
  },
  /** The player, as on the overworld minimap. */
  player: { color: 'snow', r: 1.6 },
  /** An open intake entrance: a dot on its mouth. */
  entrance: { color: 'cyan-glow', r: 1.2 },
  /** The icons' sprites are drawn at this scale (src/data/art/landmarks.ts' minimap icons). */
  iconScale: 0.7,
  /** A supply port shows its raw's item icon at this scale. */
  portScale: 0.4,
} as const;
