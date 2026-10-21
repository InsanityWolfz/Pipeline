// Asset keys and look numbers for 032's art: the landmarks' own standing things and
// decals, the Ruined Cache's reliquary, the minimap's landmark icons, the champion's glow
// and name, and the discovery banner. Render draws by these keys; the shapes are in
// src/data/art/landmarks.ts. Times ms, sizes world px (view px for the HUD), alphas 0..1.

export const LANDMARK_SPRITES = {
  /** The Quarry's cut stone blocks (on its ruin-block tiles), by tile hash. */
  cutBlocks: ['ow-cut-block-0', 'ow-cut-block-1'],
  /** The Husk Hive's nest stones, amber-crusted (on its ruin-block tiles), by tile hash (049). */
  hiveStones: ['ow-hive-stone-0', 'ow-hive-stone-1'],
  /** The Old Grove's old trees (on its tree tiles), by tile hash. */
  oldTrees: ['ow-old-tree-0', 'ow-old-tree-1'],
  /** A clump of reeds and cattails at a marsh pond's rim, and a lily pad on its water. */
  marshTuft: 'ow-marsh-tuft',
  lily: 'ow-lily',
  /** A low slab on a grotto hollow's lip: plain (the Ley Grotto) and frost-rimed (the Frozen Grotto). */
  lip: 'ow-hollow-lip',
  lipFrost: 'ow-hollow-lip-frost',
  /** The reliquary: sealed with its ley seal, opening (the seal broken, light pouring out), and open and empty. */
  cacheSealed: 'cache-sealed',
  cacheOpen: 'cache-open',
  cacheEmpty: 'cache-empty',
  /** The champion's glow, drawn white for render to tint. */
  championGlow: 'champion-glow',
} as const;

/** The minimap's landmark icons, by marker (hudLayout's `MINIMAP.landmarkScale` sizes them). */
export const MAP_ICONS = {
  site: 'map-site',
  grotto: 'map-grotto',
  spring: 'map-spring',
  cache: 'map-cache',
  aqueduct: 'map-aqueduct',
} as const;

export const LANDMARK_LOOK = {
  /**
   * A grotto hollow: a sunken basin over its area, `inset` tiles in from the area's edge, its floor darker and its lip
   * ringed with `lips` slabs; a light over it breathing between two alphas. The frozen one is cold blue-white.
   */
  hollow: {
    inset: 0.6,
    lips: 22,
    basin: { color: 'ground-shade', alpha: 0.28 },
    rim: { color: 'rock-dark', alpha: 0.35, width: 5 },
    leyLight: { color: 'cyan', radius: 110, alpha: [0.18, 0.32] as const, breatheMs: 3800 },
    coldLight: { color: 'snow', radius: 150, alpha: [0.16, 0.28] as const, breatheMs: 5200 },
    frost: { basin: 'water-light', alpha: 0.32, size: [0.9, 0.88] as const },
    /** The basin's deeper middle: lower by `dy` of its height, `size` of its radii. */
    inner: { dy: 0.12, size: [0.72, 0.68] as const },
    /** No lip slab within this many tiles of a path's point, or of a node or guard. */
    clear: { path: 1.2, things: 0.8 },
    /** Lip slabs lie flat this far over the floor's depth. */
    depth: 0.6,
  },
  /**
   * The Husk Hive's ground (049): amber resin crust in patches on its open tiles (`every` nth, by tile hash), and a
   * darker stain round each nest stone, painted into the ground.
   */
  hive: { crust: 'resin-dark', alpha: 0.4, every: 2, rx: 11, ry: 5, jitter: 12, stain: { color: 'resin-dark', alpha: 0.22, rx: 22, ry: 9 } },
  /** The Old Grove's sun: warm patches on its grass (`every` nth open tile), drawn into the ground. */
  grove: { sun: 'sun', alpha: 0.4, every: 3, rx: 20, ry: 9, jitter: 10 },
  /** The marsh: damp ground round its ponds and tufts every `tuftStep` radians round each rim, lilies on the water. */
  marsh: {
    mud: 'dirt-dark',
    mudAlpha: 0.22,
    /** The damp ground's radii, × the pond's. */
    mudSize: [2.2, 2] as const,
    tuftStart: 0.4,
    tuftStep: 1.1,
    tuftRim: 1.55,
    /** No tuft within this many tiles of a node, guard or pylon. */
    tuftClear: 0.9,
    /** Lilies per pond, at angles `lilyFrom` + i × `lilyStep` radians, `lilyAt` of the pond's radii out, this far over the floor. */
    lilies: 2,
    lilyFrom: 1,
    lilyStep: 2.6,
    lilyAt: [0.45, 0.4] as const,
    lilyDepth: 0.7,
  },
  /** The champion glow sprite's radius at 1×, px (art/landmarks.ts draws it this size). */
  championGlowPx: 30,
  /** The reliquary's opening: it shows the `cacheOpen` frame this long after it opens, then `cacheEmpty`. */
  cacheOpenMs: 900,
  /** A champion's name over it: the name in the display font, its kind ("Husk champion") under it, px above the sprite. */
  championLabel: { rise: 6, gap: 1, kindSuffix: ' champion' },
} as const;

/** The discovery banner (032): the landmark's name in the display font, top centre below the objective band. */
export const DISCOVERY_BANNER = {
  /**
   * View px from the top (050, A.3: at the top of the screen, never over the player): under the boss bar (20 + 8) and
   * above the objective band (86), between the minimap and the left edge.
   */
  top: 34,
  /** A small line above the name. */
  kicker: 'Discovered',
  kickerGap: 2,
  pad: { x: 10, y: 4 },
  fadeInMs: 200,
  fadeOutMs: 500,
  alpha: 0.9,
} as const;
