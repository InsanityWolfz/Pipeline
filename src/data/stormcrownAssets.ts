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
  /** A length of the Crown Spire's wall: slate blocks banded in brass, a cyan rune course. */
  spireWall: 'ow-spire-wall',
  /** The stormglass item: a pale violet crystal shard with a cyan crackle inside. */
  itemStormglass: 'item-stormglass',
  /**
   * A storm rod's looks while it isn't charged (it's charged in its node frames, by uses left): idle, its warning
   * (sparks crawling up it, its crown flashing) and the strike itself (a bolt down onto it, held `STORM_ROD_LOOK.strikeTicks`).
   */
  rod: { idle: 'node-storm-rod-idle', warning: 'node-storm-rod-warning', strike: 'node-storm-rod-strike' },
} as const;

/** How a storm rod reads (064): its strike frame shows over the first `strikeTicks` of its charge; the warning flickers every `flickerMs`. */
export const STORM_ROD_LOOK = { strikeTicks: 14 } as const;

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
  /** The Broken Sky-bridge's deck over the chasm: worn builders' slabs, a broken brass-capped parapet where it meets the rift. */
  bridge: { deck: 'storm-pale', seam: 'storm', parapet: 'carve-dark', cap: 'brass', alpha: 1 },
  /** Slate flagstones on the Weathervane's and the Crown Spire's floors. */
  flags: { color: 'storm-pale', edge: 'storm', alpha: 0.5, gapEvery: 4 },
  /** The Rod Field's storm-scarred slate: dark scorch blotches with pale glass grit. */
  scorch: { color: 'storm-dark', alpha: 0.26, grit: 'cyan-glow' },
} as const;
