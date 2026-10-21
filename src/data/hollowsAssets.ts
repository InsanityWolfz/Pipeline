// Asset keys and look numbers for Stonefall Hollows' art (034): its standing terrain,
// the ley-iron seam and item, the barrier, the Bulwark's enemy bombs and pound, the altar,
// the boss bar and the minimap's aqueduct icon. Render draws by these keys; the shapes are
// in src/data/art/hollows.ts and src/data/art/bulwark.ts. Times ms, sizes world px, alphas 0..1.

export const HOLLOWS_SPRITES = {
  /** A cliff tile's face with its lit top edge, by tile hash; `cliffTop` where another cliff stands in front (south). */
  cliffs: ['ow-cliff-0', 'ow-cliff-1', 'ow-cliff-2'],
  cliffTop: 'ow-cliff-top',
  /** An aqueduct pillar (or colonnade column), a standing arch's span over a walkable bay, a fallen span's heap. */
  pillar: 'ow-aqueduct-pillar',
  arch: 'ow-aqueduct-arch',
  fallen: ['ow-fallen-span-0', 'ow-fallen-span-1'],
  /** Loose rubble on the Hollows' grey-blue stone (its rock tiles). */
  rubble: ['ow-rubble-0', 'ow-rubble-1'],
  /** The ley-iron item: a rust-skinned ingot-lump with cyan veins. */
  itemLeyIron: 'item-ley-iron',
  /** The forum's altar stone: dim, awake (its runes lit) and summoning (blazing red). */
  altar: { dim: 'altar-dim', awake: 'altar-awake', summoning: 'altar-summoning' },
  /** The Bulwark's lobbed bomb: a riveted stone shell with a red fuse-glow. */
  enemyBomb: 'enemy-bomb',
} as const;

/** How the Hollows' live effects look (034): palette ids, ms, world px (view px for the boss bar), alphas 0..1. */
export const HOLLOWS_LOOK = {
  /**
   * The ley barrier over the gap: a translucent cyan wall `height` px tall in the dome's style (017), its rim and
   * ripples shimmering every `shimmerMs`; on its gate event it flashes, shards fall and it fades over `collapseMs`.
   */
  barrier: {
    color: 'cyan',
    glow: 'cyan-glow',
    /** The curtain's width, as a fraction of a tile, and its fill, dipping by `shimmerDip` with the shimmer. */
    width: 0.7,
    fill: 0.28,
    shimmerDip: 0.2,
    rim: 0.85,
    rimWidth: 2,
    height: 56,
    shimmerMs: 1400,
    /** Ripples climbing it: how many, their line, alpha at the bottom fading by `fade` to the top, inset px and slant px. */
    ripples: 4,
    ripple: { width: 1, alpha: 0.7, fade: 0.5, inset: 2, slant: 6 },
    collapseMs: 900,
    /** 053: the round barrier is drawn in straight lengths this many px long round its circle, its ripples offset by `rippleSkew` of a cycle from one length to the next. */
    segment: 16,
    rippleSkew: 0.004,
    /** Its collapse: a flash of `flash` fading `flashFade` times faster than the wall, shards falling up to `shardFall` px. */
    flash: 0.9,
    flashFade: 3,
    shardFall: 120,
  },
  /** The Bulwark's bomb on the ground: the outer ring, the danger-red disc growing inside it, and the bomb arcing in over `flightTicks`. */
  bomb: { color: 'danger', ringWidth: 2, ringAlpha: 0.9, fillAlpha: 0.38, flightTicks: 24, arcPeak: 48 },
  /** The pound's ground circle, in the Warden's slam style (009), danger red. */
  pound: { color: 'danger', alpha: 0.22, fillAlpha: 0.5 },
  /** The back seam's halo while its back shows (the place to hit): its colour, radius px, and a slow pulse between two alphas. */
  seam: { color: 'gold-trim', radius: 14, sideScale: 0.7, pulseMs: 900, alpha: [0.25, 0.6] as const },
  /** A shielded enemy shows its turning shuffle this long after its facing last changed, ms. */
  turnHoldMs: 300,
  /** A blocked hit: the shield flashes brass for `flashMs`. */
  block: { color: 'brass-light', flashMs: 120 },
  /** The summon at the start point: a red circle cracking open (`cracks` lines) as the boss rises, `radius` px. */
  summon: {
    color: 'danger',
    radius: 40,
    cracks: 7,
    /** The first crack's angle, radians, and the ring's and cracks' line widths. */
    crackStart: 0.4,
    ringWidth: 2,
    crackWidth: 1.5,
    alpha: 0.85,
    /** As the boss rises: a red flare `riseMs` long, a column `flare.w` × `flare.h` radii wide and tall (× radius), `flare.lift` px up. */
    riseMs: 700,
    flare: { alpha: 0.5, lift: 20, w: 1.2, h: 2.4 },
  },
  /** The altar's offering row (in the 033 restore panel's style). */
  panel: { name: "The Bulwark's altar", effect: 'Offer to summon the Bulwark again.', action: 'Summon', spent: 'The Bulwark is here' },
  /** The boss bar along the top of the screen while a boss fights: its width and height, view px, gap under the objective band, colours (041.15: unchanged by the enrage). */
  bossBar: { w: 240, h: 8, top: 20, border: 1, fill: 'danger', back: 'ink', frame: 'brass', nameGap: 2 },
  /**
   * The back wave's build-up (041.16, draft for Shaun's eye): `rings` arcs over its rear arc in danger red, rippling
   * outward from its feet to the arc's edge as the wind-up runs (rings only, unlike the stomp's filled half-disc); its
   * spray bursts `sprayAt` of its radius out as it breaks. 054 (E.2): its whole area is shaded red on the ground
   * (`shadeAlpha`), a fill (`fillAlpha`) growing out to its edge through the wind-up, in the other telegraphs' style.
   */
  wave: { color: 'danger', rings: 4, ringWidth: 2.5, ringAlpha: 0.85, sprayAt: 0.5, shadeAlpha: 0.2, fillAlpha: 0.3 },
  /** A circle a roll won't save from (041.12: the pound, an enraged Bulwark's bombs): a second ring `gap` px outside its edge. */
  rollProof: { color: 'danger', width: 2, alpha: 0.9, gap: 4 },
  /** The rear stomp's wind-up (041): a half-disc over its back in the pound circle's style, danger red; its dust rises `dustAt` of its radius out. */
  stomp: { color: 'danger', alpha: 0.22, fillAlpha: 0.5, dustAt: 0.5 },
  /**
   * Enraged (041, draft for Shaun's eye): the back seam's halo and the shield's runes burn danger red, the seam pulsing
   * faster; steam puffs rise from its shoulders, each `riseMs` long, `rise` px up, swelling from `radius` to twice it.
   */
  enraged: {
    color: 'danger',
    seamPulseMs: 360,
    seamAlpha: [0.45, 0.9] as const,
    runeAlpha: 0.85,
    runeWidth: 2,
    /** Each puff starts `spread` × `spreadFrom` px out to its side and drifts to `spread`, swelling to `swell` × its radius. */
    steam: { color: 'snow', puffs: 4, riseMs: 900, rise: 34, radius: 4, swell: 2, alpha: 0.35, spread: 14, spreadFrom: 0.5, top: -64 },
  },
  /** An add rising (041): the summon's cracked circle at its feet, `scale` of the summon's size, and the add fading up from `sink` px under the ground. */
  addRise: { scale: 0.55, sink: 14 },
} as const;

/**
 * The Hollows' ground (034), painted into the overworld's ground chunks: grey-blue quarry stone over the region's
 * columns with lighter and darker slabs, rust stains, fine cracks and cyan veins glinting in one tile of `veinEvery`;
 * quarry-cut terraces as raised cut slabs with a dark step at their front; the Cistern Terrace's and the Sunken Forum's
 * flagstones. Palette ids and alphas; sizes world px.
 */
export const HOLLOWS_GROUND = {
  base: 'hollow-light',
  slabLight: 'hollow-pale',
  slabDark: 'hollow',
  slabEvery: 3,
  slabAlpha: 0.45,
  rust: 'iron-rust',
  rustEvery: 13,
  rustAlpha: 0.22,
  crack: 'hollow-dark',
  crackEvery: 5,
  vein: 'vein',
  veinDeep: 'cyan-deep',
  veinEvery: 17,
  terrace: { top: 'hollow-pale', step: 'hollow-dark', alpha: 0.75 },
  flags: { color: 'hollow-pale', edge: 'hollow', alpha: 0.5, gapEvery: 4 },
} as const;
