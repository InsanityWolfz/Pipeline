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
  tuft: 'grass-dark',
  tuftEvery: 4,
  flowers: ['snow', 'gold-trim', 'wisp-light'],
  flowerEvery: 11,
  /**
   * The Frozen Grotto's frosted ground (029): a pale wash over its clearing, soft-edged by `edge` px, with drifts of
   * snow on one tile in `driftEvery`, ice glints on one in `glintEvery`, and its grass tufts rimed white.
   */
  frost: {
    wash: 'foam',
    washAlpha: 0.75,
    /** The wash is a blob per tile: `edge` px plus up to `jitter` inside the clearing; the ring of tiles round it, half that plus up to `rimJitter`, one in `rimSkip` left out. Blobs are `squash` as tall as wide. */
    edge: 22,
    jitter: 7,
    rimJitter: 9,
    rimSkip: 3,
    squash: 0.8,
    /** Snow drifts: up to `driftShift` px off the tile's centre, `driftRx` px wide plus up to `driftGrow`, `driftRy` px tall. */
    drift: 'snow',
    driftEvery: 3,
    driftAlpha: 0.8,
    driftShift: [16, 12],
    driftRx: 9,
    driftGrow: 6,
    driftRy: 4,
    /** Ice sheets: up to `iceShift` px off centre, `iceSize` px, `iceAlpha`, a glint `glintSize` px nudged by `glintAt`. */
    ice: 'water-light',
    iceShift: [18, 14],
    iceSize: [6, 2.6],
    iceAlpha: 0.7,
    glint: 'snow',
    glintEvery: 5,
    glintSize: [2, 0.7],
    glintAt: [-2, -0.6],
    glintAlpha: 0.9,
    tuft: 'rock-light',
  },
  /** Ground chunks are drawn at up to this many texels per world px (memory), in squares of this many world px. */
  maxScale: 2,
  chunk: 640,
  /**
   * 053: the round map is too big to bake whole (≈460 MB of textures at scale 2), so chunks, their ground and their
   * standing sprites, are built near the camera and dropped far from it: every chunk the view touches at once, those
   * within `ahead` chunks of it one a frame, and any past `keep` chunks away dropped.
   */
  ahead: 1,
  keep: 2,
  /** 074: a chunk's ground is drawn in squares this many world px across, each lit only while a light reaches it. */
  lightTile: 160,
  /** 053: the world's cliff edge past the Hollows, away from its face: flat plateau stone, and its darker cracks. */
  plateau: 'hollow-dark',
  plateauEdge: 'rock-dark',
} as const;

/** A claimed site's looks (017): its safe zone (067: the shrine's barrier dome is gone, open from the start). */
export const SITE_LOOK = {
  /** The green wash's strength and the ley ring's, drawn once into a square texture this many px across. */
  safe: { wash: 0.35, ring: 0.6, ringWidth: 2, color: 'leaf-light', ringColor: 'cyan', textureSize: 256 },
} as const;

/**
 * The claimed pylon's harvest, made visible (018): a ley tendril reaches from the pylon to a node, the node
 * pulses, then the raw's icon runs along the pylon's ley line to the foundry's ruin and sinks in (053, D.4).
 * Times ms, sizes px, speed px/s.
 */
export const SUPPLY_LOOK = {
  tendrilMs: 500,
  tendrilColor: 'cyan-glow',
  tendrilWidth: 1.5,
  /** The tendril's sideways wave, px, how many waves along it, how fast they run (ms per radian) and how many segments draw it. */
  wobble: 4,
  waves: 3,
  waveMs: 90,
  tendrilSteps: 16,
  /** The tendril leaves the pylon this far above its base. */
  pylonRise: 26,
  /** The node's pulse: starts this far through the tendril's reach, ring width and radius px, this far above the node's base. */
  pulseAt: 0.6,
  pulseMs: 500,
  pulseWidth: 2,
  pulseRadius: 18,
  pulseRise: 6,
  moteSpeed: 200,
  /** 053 (D.4, Shaun: "show each resource that that pylon's collecting go along the line"): each haul runs home as its raw's item icon at this scale, over its halo. */
  iconScale: 0.85,
  /** Hauls leaving one pylon together set off this far apart, ms, so each raw's icon reads on its own. */
  staggerMs: 450,
  /** The disc of the raw's colour under its icon: radius px and alpha. */
  plateRadius: 6,
  plateAlpha: 0.55,
  haloRadius: 9,
  halo: 'cyan',
  haloAlpha: 0.35,
  /** Sinking into the ruin, a haul's icon shrinks by this fraction as it fades. */
  sinkMs: 400,
  sinkShrink: 0.6,
  /** No frame moves a mote on further than this many ms, so a hitch never skips its run. */
  maxStepMs: 50,
  /** A haul's plate takes its raw's colour. */
  moteColors: { wood: 'wood-light', stone: 'rock-pale', fiber: 'leaf-light', 'ley-crystal': 'cyan-glow', 'ley-iron': 'iron-light', 'husk-resin': 'resin-light', rimestone: 'snow', cinderite: 'cinder-light', stormglass: 'storm-pale' } as Readonly<Record<string, string>>,
} as const;

/**
 * 074: the ground's blending and variation, baked into the chunks with the rest of the ground (no cost per frame), each
 * tile's look from its fixed hash. Flat paint only: no collision, nothing standing, and it never covers a path, a ley
 * line or a telegraph (paths and ley lines are painted over it; telegraphs are drawn above the ground).
 */
export const GROUND_BLEND = {
  /**
   * Soft edges where two grounds meet (`spill` creeps into `into`): `blobs` rounded blobs along each shared tile edge,
   * each `radius` px (min, max) and reaching up to `depth` px into the tile, so the edge is a ragged band, never a
   * straight tile edge.
   */
  edge: {
    pairs: [
      { spill: 'slag', into: 'ember' },
      { spill: 'ember', into: 'slag' },
    ] as readonly { readonly spill: GroundClass; readonly into: GroundClass }[],
    blobs: 3,
    radius: [4, 8] as const,
    depth: 7,
  },
  /**
   * Region 1's edge with the Hollows (the barrier's circle): the two grounds meet along the true circle, not the tiles'
   * steps, wobbling by `wobble` px (two waves of `waves` per circle), with a grass blob every `blobStep` px of arc along
   * it (`blobRadius` px), and a stray tuft of each ground on the other's side one sample in `strayEvery`, up to `strayOut`
   * px off the edge, so it reads as a ragged band of overlapping rounded blobs.
   */
  circle: { wobble: [7, 4] as const, waves: [53, 131] as const, blobStep: 9, blobRadius: [3, 9] as const, strayEvery: 3, strayOut: 14, strayRadius: [2, 4.5] as const, reach: 2 },
  /** Broad soft patches of lighter and darker ground: one centred on a tile in `every`, `radius` tiles (min, max), at `alpha`, in each region's own colours (light, dark). */
  patches: {
    every: 41,
    radius: [2, 4] as const,
    alpha: 0.2,
    colors: {
      grass: ['grass-light', 'grass-dark'],
      hollows: ['hollow-pale', 'hollow'],
      ember: ['ash-pale', 'ash'],
      storm: ['storm-pale', 'storm'],
    } as Readonly<Partial<Record<GroundClass, readonly [string, string]>>>,
  },
  /**
   * Cracks with a lit lip on stone, paving, ash and slate: one on a tile in `every` (per ground; Region 1's grass has
   * none, its paving does), a dark groove `width` px with its lower-right lip lit (light from the top left) `lip` px off.
   */
  cracks: {
    every: { paving: 5, hollows: 7, ember: 6, storm: 5 } as Readonly<Partial<Record<GroundClass | 'paving', number>>>,
    colors: {
      paving: ['rock-dark', 'rock-pale'],
      hollows: ['hollow-dark', 'hollow-pale'],
      ember: ['ash-dark', 'ash-pale'],
      storm: ['storm-dark', 'storm-pale'],
    } as Readonly<Partial<Record<GroundClass | 'paving', readonly [string, string]>>>,
    width: 0.9,
    lip: 0.7,
    lipAlpha: 0.45,
    alpha: 0.6,
  },
  /**
   * Worn paths (059's joined shape, its outline and width unchanged): a darker trodden centre `centre` × the path's
   * width; the ground creeping in at its edges, a blob every `creepStep` px along each side, `creepRadius` px, up to
   * `creepIn` px in; and a pebble every `pebbleStep` px, lit on top.
   */
  path: {
    centre: 0.42,
    centreColor: 'dirt-dark',
    centreAlpha: 0.2,
    creepStep: 12,
    creepRadius: [3.5, 7] as const,
    creepIn: 5,
    pebbleStep: 19,
    pebble: ['rock-light', 'rock-dark'] as const,
  },
} as const;

/** 074: a tile's ground for blending: a region's own ground, or a feature that has its own (slag, a chasm, plateau stone). */
export type GroundClass = 'grass' | 'hollows' | 'ember' | 'storm' | 'slag' | 'chasm' | 'plateau';
