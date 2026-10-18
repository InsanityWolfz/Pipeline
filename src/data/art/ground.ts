// How the overworld's ground is drawn (017): palette ids and how often each
// touch appears, by a fixed hash per tile. Render-only tuning.

export const GROUND = {
  base: 'grass-bright',
  patchLight: 'grass-light',
  patchDark: 'grass',
  forest: 'grass-dark',
  patchEvery: 5,
  patchRadius: [22, 46] as const,
  sun: 'sun',
  dappleEvery: 2,
  paving: 'rock-light',
  pavingGapEvery: 3,
  pavingAlpha: 0.28,
  /** The ruin field's old paving round the stairs. */
  fieldPaving: { x0: 33, y0: 13, x1: 47, y1: 22 },
  path: 'dirt',
  pathEdge: 'dirt-dark',
  pathFleck: 'dirt-light',
  pathWidth: 52,
  sand: 'sand',
  shallows: 'water-light',
  water: 'water',
  deep: 'water-deep',
  foam: 'foam',
  ley: 'cyan',
  leyDeep: 'cyan-deep',
  /** A seam bends every this many px, by up to 4 × `leyJag` px either way. */
  leyStep: 18,
  leyJag: 1.6,
  tuft: 'grass-dark',
  tuftEvery: 4,
  flowers: ['snow', 'gold-trim', 'wisp-light'],
  flowerEvery: 11,
  /** Ground chunks are drawn at up to this many texels per world px (memory), in squares of this many world px. */
  maxScale: 2,
  chunk: 640,
} as const;

/** The shrine site's looks (017): the barrier dome while sealed, and the safe zone once claimed. */
export const SITE_LOOK = {
  /** Fill and rim opacity, rim width px, and its fade when the gate opens, ms. */
  dome: { fill: 0.14, rim: 0.7, rimWidth: 2, fadeMs: 600, color: 'cyan' },
  /** The green wash's strength and the ley ring's, drawn once into a square texture this many px across. */
  safe: { wash: 0.35, ring: 0.6, ringWidth: 2, color: 'leaf-light', ringColor: 'cyan', textureSize: 256 },
} as const;
