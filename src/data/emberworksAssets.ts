// Asset keys and look numbers for the Emberworks' art (060): its standing terrain (kilns, chimneys, its ash cliffs),
// its ground and its ramps, its barrier across the ramps and the minimap's colours. Render draws by these keys; the
// shapes are in src/data/art/emberworks.ts. Palette ids; sizes world px; alphas 0..1.

export const EMBERWORKS_SPRITES = {
  /** A kiln tile's front (its glowing mouth), and its brick top where another kiln stands in front (south). */
  kiln: 'ow-kiln',
  kilnTop: 'ow-kiln-top',
  /** A chimney stack: soot-dark stone, a brass band and a cyan ley ring, embers at its lip. */
  chimney: ['ow-chimney-0', 'ow-chimney-1'],
  /** The Emberworks' own cliffs (its ragged foot and outer edge), in ash; `cliffTop` where another stands in front. */
  cliffs: ['ow-ash-cliff-0', 'ow-ash-cliff-1', 'ow-ash-cliff-2'],
  cliffTop: 'ow-ash-cliff-top',
} as const;

/** The Emberworks' cliffs' stone (art/hollows.ts `CliffStone`): warm ash. */
export const ASH_STONE = { dark: 'ash-dark', mid: 'ash', light: 'ash-light', pale: 'ash-pale' } as const;

/**
 * The Emberworks' ground (060), painted into the overworld's ground chunks: warm ash-grey with darker slag patches,
 * cinder specks, rust glow pooling here and there and a cyan ley vein in one tile of `veinEvery`; ash terraces as
 * raised cut steps; the ramps as stone steps climbing outward; the plateau past its edge as soot-dark stone.
 */
export const EMBERWORKS_GROUND = {
  base: 'ash-light',
  patch: 'ash',
  patchEvery: 4,
  patchAlpha: 0.45,
  glow: 'cinder',
  glowEvery: 11,
  glowAlpha: 0.16,
  speck: 'cinder-light',
  speckEvery: 3,
  speckAlpha: 0.55,
  crack: 'ash-dark',
  crackEvery: 6,
  vein: 'vein',
  veinDeep: 'cyan-deep',
  veinEvery: 23,
  terrace: { top: 'ash-pale', step: 'ash-dark', alpha: 0.7 },
  /** A ramp's steps: a pale cut slab per tile with a dark riser line every `riser` px along its climb. */
  ramp: { slab: 'ash-pale', alpha: 0.85, riser: 'ash-dark', riserAlpha: 0.6, step: 8 },
  plateau: 'ash-dark',
  plateauEdge: 'ink',
} as const;
