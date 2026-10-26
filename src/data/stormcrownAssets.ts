// Asset keys and look numbers for the Stormcrown's art (064): its standing terrain (iron rods, cairns, its slate
// cliffs), its ground, chasms and the minimap's colours. Render draws by these keys; the shapes are in
// src/data/art/stormcrown.ts. Palette ids; sizes world px; alphas 0..1.

export const STORMCROWN_SPRITES = {
  /** An iron rod of the builders' storm-works: a tall dark iron post, brass-banded, a cyan ley spark at its tip. */
  ironRod: ['ow-iron-rod-0', 'ow-iron-rod-1'],
  /** A cairn of wind-cut slate, heaped; `cairnTop` where another cairn stands in front (south). */
  cairn: ['ow-cairn-0', 'ow-cairn-1', 'ow-cairn-2'],
  cairnTop: 'ow-cairn-top',
  /** The Stormcrown's own cliffs (its ragged foot and outer edge), in slate; `cliffTop` where another stands in front. */
  cliffs: ['ow-slate-cliff-0', 'ow-slate-cliff-1', 'ow-slate-cliff-2'],
  cliffTop: 'ow-slate-cliff-top',
} as const;

/** The Stormcrown's cliffs' stone (art/hollows.ts `CliffStone`): cool slate. */
export const SLATE_STONE = { dark: 'storm-dark', mid: 'storm', light: 'storm-light', pale: 'storm-pale' } as const;

/**
 * The Stormcrown's ground (064), painted into the overworld's ground chunks: wind-scoured slate in long scored slabs,
 * pale grit streaks along the wind, a slate-violet glow pooling here and there, and a cyan ley vein in one tile of
 * `veinEvery`; chasms as dark rifts with a violet glow deep in them; the plateau past its edge as storm-dark stone.
 */
export const STORMCROWN_GROUND = {
  base: 'storm-light',
  patch: 'storm',
  patchEvery: 3,
  patchAlpha: 0.45,
  glow: 'storm-glow',
  glowEvery: 9,
  glowAlpha: 0.18,
  streak: 'storm-pale',
  streakEvery: 3,
  streakAlpha: 0.35,
  crack: 'storm-dark',
  crackEvery: 6,
  vein: 'vein',
  veinDeep: 'cyan-deep',
  veinEvery: 29,
  plateau: 'storm-dark',
  plateauEdge: 'ink',
  /** A chasm: a dark rift, its lip lit pale where open rock lies north of it, a violet glow far down. */
  chasm: { depth: 'ink', wall: 'storm-dark', lip: 'storm-pale', glow: 'storm-glow', glowAlpha: 0.35 },
} as const;
