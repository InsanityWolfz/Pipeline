import { PLANT_FRAMES, SCATTER_FRAMES, VARIANT_FRAMES } from './worldArtAssets';

// 077: the world's detail, per region: plants that sway, ground scatter baked into the chunks' ground, and ruin
// variants (new looks for tiles that are already solid, keeping their footprints). Decorative only: none of it is
// collision, and the sim never reads it. Where each goes is a pure function of the fixed map and `worldTileHash`,
// salted per set (src/render/world/decorPlace.ts). Densities are one chance per eligible tile: `1 in N`.

/** The four looks of the overworld, by distance from the foundry's door (the ground's own edges: 48, 79, 110 tiles). */
export type DecorRegion = 'meadow' | 'hollows' | 'ember' | 'storm';
export const DECOR_REGIONS: readonly DecorRegion[] = ['meadow', 'hollows', 'ember', 'storm'];

/** How a plant sways (its amplitude and rate in src/data/ambient.ts `SWAY`). */
export type SwayKind = 'grass' | 'flower' | 'fern' | 'reed' | 'vine' | 'tree';

/** Where a plant set may stand: open floor, floor beside a grove's tree, floor beside a pond's shallows. */
export type PlantWhere = 'open' | 'groveEdge' | 'pondRim';

/** One plant set: its looks, how it sways, where it stands, and its share among the region's sets that fit there. */
export interface PlantSet {
  readonly id: string;
  readonly frames: readonly string[];
  readonly sway: SwayKind;
  readonly where: PlantWhere;
  readonly weight: number;
}

/** One scatter set: its looks, where (open floor, or floor beside a grove), and its share. */
export interface ScatterSet {
  readonly id: string;
  readonly frames: readonly string[];
  readonly where: 'open' | 'groveEdge';
  readonly weight: number;
}

/** A region's decor and densities (1 in N per eligible tile). */
export interface RegionDecor {
  readonly plants: readonly PlantSet[];
  readonly plantOneIn: number;
  readonly scatter: readonly ScatterSet[];
  readonly scatterOneIn: number;
  /** Vines hanging from a cliff face over open floor (the Hollows'), 1 in N such faces; none elsewhere. */
  readonly vines?: { readonly frames: readonly string[]; readonly oneIn: number };
}

const plant = (id: string, frames: readonly string[], sway: SwayKind, where: PlantWhere, weight: number): PlantSet => ({ id, frames, sway, where, weight });
const scatter = (id: string, frames: readonly string[], where: 'open' | 'groveEdge', weight: number): ScatterSet => ({ id, frames, where, weight });

export const DECOR: {
  readonly regions: Readonly<Record<DecorRegion, RegionDecor>>;
  readonly maxPlantsPerChunk: number;
  readonly salts: { readonly plant: number; readonly kind: number; readonly scatter: number; readonly vine: number; readonly variant: number };
  readonly tile: { readonly jitterX: number; readonly jitterY: number };
} = {
  regions: {
    meadow: {
      plants: [
        plant('grass-clump', PLANT_FRAMES.grass, 'grass', 'open', 6),
        plant('flower-clump', PLANT_FRAMES.flower, 'flower', 'open', 3),
        plant('fern', PLANT_FRAMES.fern, 'fern', 'groveEdge', 1),
        plant('pond-reed', PLANT_FRAMES.reed, 'reed', 'pondRim', 1),
      ],
      plantOneIn: 7,
      scatter: [scatter('pebbles', SCATTER_FRAMES.pebbles, 'open', 3), scatter('leaf-litter', SCATTER_FRAMES.litter, 'groveEdge', 1), scatter('clover', SCATTER_FRAMES.clover, 'open', 2)],
      scatterOneIn: 10,
    },
    hollows: {
      plants: [plant('dry-tuft', PLANT_FRAMES.dryTuft, 'grass', 'open', 1)],
      plantOneIn: 14,
      scatter: [scatter('quarry-chips', SCATTER_FRAMES.chips, 'open', 4), scatter('cut-flag', SCATTER_FRAMES.flag, 'open', 1), scatter('rust-stain', SCATTER_FRAMES.rust, 'open', 1)],
      scatterOneIn: 6,
      vines: { frames: PLANT_FRAMES.vine, oneIn: 6 },
    },
    ember: {
      plants: [plant('scorched-tuft', PLANT_FRAMES.scorchedTuft, 'grass', 'open', 2), plant('ember-thorn', PLANT_FRAMES.thorn, 'fern', 'open', 1)],
      plantOneIn: 24,
      scatter: [scatter('slag-drips', SCATTER_FRAMES.slag, 'open', 3), scatter('soot-stain', SCATTER_FRAMES.soot, 'open', 1), scatter('clinker', SCATTER_FRAMES.clinker, 'open', 2)],
      scatterOneIn: 6,
    },
    storm: {
      plants: [plant('wind-grass', PLANT_FRAMES.windGrass, 'grass', 'open', 1)],
      plantOneIn: 12,
      scatter: [scatter('slate-shards', SCATTER_FRAMES.slate, 'open', 3), scatter('storm-glass-glint', SCATTER_FRAMES.glass, 'open', 1), scatter('rain-dark', SCATTER_FRAMES.rainDark, 'open', 2)],
      scatterOneIn: 6,
    },
  },
  /** A chunk holds at most this many plants; past it, the farthest from the chunk's centre are dropped. */
  maxPlantsPerChunk: 80,
  /** Each set's salt, mixed into the tile's hash, so the sets don't line up with each other or the ground's own touches. */
  salts: { plant: 0x77a1, kind: 0x77b2, scatter: 0x77c3, vine: 0x77d4, variant: 0x77e5 },
  /** A plant or scatter mark stands up to this many px off its tile's centre, either way. */
  tile: { jitterX: 10, jitterY: 8 },
};

/** One variant set: the frames it replaces, the variants for each, and the share of those tiles that change (`[n, d]`: n in d). */
export interface RuinVariant {
  readonly id: string;
  readonly base: readonly string[];
  readonly frames: (base: string) => readonly string[];
  readonly share: readonly [number, number];
}

/**
 * Ruin variants (same footprints, 059): the frame `pieceFrame` or the region's tile picker gives, swapped for a
 * variant on a share of the tiles with that look. Landmarks' own blocks (cut blocks, nest stones, cache walls) are
 * never listed, so they keep their looks.
 */
export const RUIN_VARIANTS: readonly RuinVariant[] = [
  /** Region 1's ruin stones: a toppled column drum, a fallen capital, a leaning rune slab, 3 in 4. */
  { id: 'ruin-stone', base: ['ow-ruin-stone'], frames: () => VARIANT_FRAMES.ruinStone, share: [3, 4] },
  /** Region 1's boulders: 1 in 5 gets moss and a fern. */
  { id: 'mossy-boulder', base: Object.keys(VARIANT_FRAMES.mossRock), frames: (b) => [VARIANT_FRAMES.mossRock[b as keyof typeof VARIANT_FRAMES.mossRock]], share: [1, 5] },
  /** The Hollows' rubble: a drilled cut block, a broken column drum, a heap with scaffold timber, 1 in 4. */
  { id: 'hollows-rubble', base: Object.keys(VARIANT_FRAMES.rubble), frames: (b) => VARIANT_FRAMES.rubble[b as keyof typeof VARIANT_FRAMES.rubble], share: [1, 4] },
  /** The Emberworks' chimneys: 1 in 6 a broken stump with soot. */
  { id: 'chimney-stump', base: ['ow-chimney-0', 'ow-chimney-1'], frames: () => [VARIANT_FRAMES.chimneyStump], share: [1, 6] },
  /** A fallen brick pile at a kiln row's east end, 1 in 2 such ends (its mouth still glows). */
  { id: 'kiln-end', base: ['ow-kiln'], frames: () => [VARIANT_FRAMES.kilnEnd], share: [1, 2] },
  /** The Stormcrown's iron rods: 1 in 6 bent or snapped. */
  { id: 'broken-rod', base: ['ow-iron-rod-0', 'ow-iron-rod-1'], frames: () => VARIANT_FRAMES.rod, share: [1, 6] },
  /** Its cairns: 1 in 5 with a brass marker plate or a storm-glass shard. */
  { id: 'marked-cairn', base: Object.keys(VARIANT_FRAMES.cairn), frames: (b) => VARIANT_FRAMES.cairn[b as keyof typeof VARIANT_FRAMES.cairn], share: [1, 5] },
];

/**
 * Kept clear of plants and scatter (both stand only on walkable floor; vines hang from a cliff face over it): a road
 * or path tile and `pathMargin` tiles round it; a boss arena (its walls and floor); the barrier's band, a ramp, a gate;
 * `pointMargin` tiles round a pylon (the waystones), node, altar, arena door, 072's return stone, cache, the start
 * stone and the foundry's stairs; `springMargin` tiles round a spring's pool; the Frozen Grotto's clearing.
 */
export const DECOR_CLEAR = {
  pathMargin: 1,
  pointMargin: 2,
  springMargin: 2,
  /**
   * 072's return stones (not yet on main): each stands this many tiles west of its arena door's `leaveTo` (072's
   * RETURN_STONES). Kept clear now so nothing changes when 072 lands; then this reads 072's data.
   */
  returnStoneWest: 3,
} as const;
