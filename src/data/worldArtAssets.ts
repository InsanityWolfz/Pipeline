// 077: the frame keys of the world's detail and set pieces (src/data/art/decor*.ts, setPieces*.ts), and the
// weather's and ambient motion's textures. Render draws by these keys; src/data/assets.ts re-exports them.

/** Plants (they sway), by region: each list is one kind's looks, picked per tile by its hash. */
export const PLANT_FRAMES = {
  grass: ['decor-grass-0', 'decor-grass-1', 'decor-grass-2'],
  flower: ['decor-flower-0', 'decor-flower-1', 'decor-flower-2'],
  fern: ['decor-fern-0', 'decor-fern-1'],
  reed: ['decor-reed-0', 'decor-reed-1'],
  dryTuft: ['decor-dry-tuft-0', 'decor-dry-tuft-1'],
  vine: ['decor-vine-0', 'decor-vine-1'],
  scorchedTuft: ['decor-scorched-tuft-0', 'decor-scorched-tuft-1'],
  thorn: ['decor-thorn-0', 'decor-thorn-1'],
  windGrass: ['decor-wind-grass-0', 'decor-wind-grass-1', 'decor-wind-grass-2'],
} as const;

/** Ground scatter (baked into the chunk's ground), by region: flat and still. */
export const SCATTER_FRAMES = {
  pebbles: ['scatter-pebbles-0', 'scatter-pebbles-1'],
  litter: ['scatter-litter-0', 'scatter-litter-1'],
  clover: ['scatter-clover-0'],
  chips: ['scatter-chips-0', 'scatter-chips-1'],
  flag: ['scatter-flag-0'],
  rust: ['scatter-rust-0'],
  slag: ['scatter-slag-0', 'scatter-slag-1'],
  soot: ['scatter-soot-0'],
  clinker: ['scatter-clinker-0'],
  slate: ['scatter-slate-0', 'scatter-slate-1'],
  glass: ['scatter-glass-0'],
  rainDark: ['scatter-rain-dark-0'],
} as const;

/** Ruin variants: new looks for tiles that are already solid, by the frame they replace (same footprint). */
export const VARIANT_FRAMES = {
  ruinStone: ['ow-ruin-drum', 'ow-ruin-capital', 'ow-ruin-slab'],
  mossRock: { 'ow-rock-0': 'ow-rock-0-moss', 'ow-rock-1': 'ow-rock-1-moss' },
  rubble: {
    'ow-rubble-0': ['ow-rubble-block-0', 'ow-rubble-drum-0', 'ow-rubble-heap-0'],
    'ow-rubble-1': ['ow-rubble-block-1', 'ow-rubble-drum-1', 'ow-rubble-heap-1'],
  },
  chimneyStump: 'ow-chimney-stump',
  kilnEnd: 'ow-kiln-end',
  rod: ['ow-iron-rod-bent', 'ow-iron-rod-snapped'],
  cairn: {
    'ow-cairn-0': ['ow-cairn-plate-0', 'ow-cairn-glass-0'],
    'ow-cairn-1': ['ow-cairn-plate-1', 'ow-cairn-glass-1'],
    'ow-cairn-2': ['ow-cairn-plate-2', 'ow-cairn-glass-2'],
  },
} as const;

/**
 * The set pieces' frames: each one's still base (`setpiece-<id>`), and where it moves, a 4-frame loop drawn over it
 * (`setpiece-<id>-loop/0..3`) or a swaying part (`setpiece-<id>-ivy`).
 */
export const SET_PIECE_FRAMES = {
  'fallen-colossus': { base: 'setpiece-fallen-colossus', sway: 'setpiece-fallen-colossus-ivy' },
  'ley-tower': { base: 'setpiece-ley-tower' },
  watcher: { base: 'setpiece-watcher' },
  'unfinished-giant': { base: 'setpiece-unfinished-giant', loop: ['setpiece-unfinished-giant-loop/0', 'setpiece-unfinished-giant-loop/1', 'setpiece-unfinished-giant-loop/2', 'setpiece-unfinished-giant-loop/3'] },
  'aqueduct-head': { base: 'setpiece-aqueduct-head' },
  'great-crane': { base: 'setpiece-great-crane', loop: ['setpiece-great-crane-loop/0', 'setpiece-great-crane-loop/1', 'setpiece-great-crane-loop/2', 'setpiece-great-crane-loop/3'] },
  'great-furnace': { base: 'setpiece-great-furnace', loop: ['setpiece-great-furnace-loop/0', 'setpiece-great-furnace-loop/1', 'setpiece-great-furnace-loop/2', 'setpiece-great-furnace-loop/3'] },
  'great-crucible': { base: 'setpiece-great-crucible' },
  'toppled-stack': { base: 'setpiece-toppled-stack' },
  'storm-tower': { base: 'setpiece-storm-tower' },
  stormcaller: { base: 'setpiece-stormcaller' },
  'wind-harp': { base: 'setpiece-wind-harp', loop: ['setpiece-wind-harp-loop/0', 'setpiece-wind-harp-loop/1', 'setpiece-wind-harp-loop/2', 'setpiece-wind-harp-loop/3'] },
} as const;

/** Ambient motion's frames: a water ripple's ring (white, tinted per pond or spring) and a ley bead's soft streak. */
export const AMBIENT_FRAMES = { ripple: 'fx-ripple-ring', glint: 'fx-ripple-glint', bead: 'fx-ley-bead' } as const;

/** The weather's particle textures (drawn once at boot, white, tinted per particle): a dot, a flake, a rain streak, a splash ring. */
export const WEATHER_TEXTURES = { dot: 'wx-dot', flake: 'wx-flake', streak: 'wx-streak', splash: 'wx-splash' } as const;
