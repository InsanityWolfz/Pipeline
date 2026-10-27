import { PLANT_FRAMES, SCATTER_FRAMES, VARIANT_FRAMES } from '../worldArtAssets';
import { blade, footShade, leaf, one, petals, stone } from './decorParts';
import { boulder, shadow } from './terrain';
import { ellipse, flat, line, path, rect, type Shape, type VectorSprite } from './types';

// 077: Region 1's detail, the sunny meadow: grass clumps, flower clumps, ferns at grove edges and reeds at pond rims
// (they sway about their foot, at most 12 px tall); pebbles, leaf litter and clover baked into the ground; and its
// ruin variants on tiles that were already solid: a toppled column drum, a fallen capital, a leaning rune slab, and
// mossy boulders with a fern. Each variant keeps its base frame's shadow, so its footprint (059) is the same.

/** A grass clump: dark blades behind, lighter in front, pale tips (variant: shape). */
function grass(v: number): Shape[] {
  const set: readonly (readonly [number, number, number, number])[] =
    v === 0
      ? [[-4, 8, -3, 2], [-1, 11, -1, 2.2], [2, 9, 3, 2], [4.5, 6, 4, 1.8], [-2.5, 6, -4, 1.8], [0.5, 7, 1.5, 2]]
      : v === 1
        ? [[-5, 7, -4, 1.8], [-2, 10, -2, 2.2], [1, 11.5, 1, 2.2], [3.5, 8, 4, 2], [0, 6, 0.5, 2]]
        : [[-3, 9, -2, 2], [0, 10, 1.5, 2.2], [3, 7, 3.5, 1.8], [-5, 5, -3, 1.6], [5, 5, 5, 1.6], [1.5, 5, 0, 1.8]];
  const back = set.slice(0, Math.ceil(set.length / 2));
  const front = set.slice(Math.ceil(set.length / 2));
  return [
    footShade(6),
    ...back.map(([x, h, l, w]) => blade(x, h, l, w + 0.3, 'grass-dark', 'grass', { outline: true })),
    ...back.map(([x, h, l]) => blade(x + l * 0.05, h * 0.92, l * 0.92, 0.7, 'grass', 'leaf-pale')),
    ...front.map(([x, h, l, w]) => blade(x, h, l, w, 'grass', 'grass-light', { outline: true })),
    ...front.map(([x, h, l]) => blade(x, h * 0.95, l * 0.95, 0.6, 'grass-light', 'leaf-pale')),
  ];
}

const FLOWER_LOOKS = [
  { petal: 'snow', centre: 'sun' },
  { petal: 'gold-trim', centre: 'gold-shade' },
  { petal: 'wisp-light', centre: 'sun' },
] as const;

/** A flower clump: a few leaf stems and two or three small flowers (variant: colour and shape). */
function flower(v: number): Shape[] {
  const look = FLOWER_LOOKS[v] ?? FLOWER_LOOKS[0];
  const heads: readonly (readonly [number, number, number])[] = v === 0 ? [[-2.5, -9, 2.2], [2.5, -10.5, 2.4], [0.5, -6, 1.8]] : v === 1 ? [[-3, -8, 2.4], [2, -11, 2.6]] : [[-3.5, -10, 2.1], [1, -8, 2], [3.5, -11, 2.2]];
  return [
    footShade(5),
    blade(-3, 5, -3, 1.6, 'grass-dark', 'leaf', { outline: true }),
    blade(3, 5, 3, 1.6, 'grass-dark', 'leaf', { outline: true }),
    ...heads.map(([x, y]) => line([x * 0.3, 0, x * 0.7, y * 0.5, x, y + 1], 0.7, 'leaf')),
    ...leaf(0, -1, -4, -4, 1.2, 'leaf'),
    ...leaf(0, -1.5, 4, -5, 1.2, 'leaf-light'),
    ...heads.flatMap(([x, y, r], i) => petals(x, y, 5, r, look.petal, look.centre, i * 0.6)),
  ];
}

/** A fern: arching fronds of small leaflets from the foot (variant: two or three fronds). */
function fern(v: number): Shape[] {
  const fronds: readonly (readonly [number, number])[] = v === 0 ? [[-7, -6], [6, -8], [0, -11]] : [[-6, -9], [7, -6]];
  const out: Shape[] = [footShade(7)];
  for (const [ex, ey] of fronds) {
    out.push(line([0, 0, ex * 0.4, ey * 0.9, ex, ey], 1, 'leaf-dark'));
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = ex * t;
      const y = ey * (t * (2 - t) * 0.9 + 0.1 * t);
      const s = 3.2 * (1 - t * 0.45);
      out.push(...leaf(x, y, x - s * 0.7, y - s, 1.1, k % 2 ? 'leaf' : 'leaf-light', undefined, false));
      out.push(...leaf(x, y, x + s * 0.8, y - s * 0.7, 1.1, k % 2 ? 'leaf-light' : 'leaf-pale', undefined, false));
    }
  }
  return out;
}

/** Reeds at a pond's rim: tall straight stems, a few with brown heads (variant: count). */
function reed(v: number): Shape[] {
  const stems: readonly (readonly [number, number, boolean])[] = v === 0 ? [[-3, 11, true], [0, 12, false], [2.5, 10, true], [-1, 8, false]] : [[-2, 12, true], [1.5, 10, false], [3.5, 11, true]];
  return [
    footShade(5),
    ...stems.map(([x, h]) => blade(x, h, x * 0.15, 1.3, 'leaf', 'straw-light', { outline: true })),
    ...stems.filter(([, , head]) => head).map(([x, h]) => rect(x + x * 0.12 - 0.9, -h + 1, 1.8, 3.6, 0.9, { fill: { linear: [0, -h, 0, -h + 4] as const, stops: [{ at: 0, color: 'straw' }, { at: 1, color: 'wood' }] }, outline: true })),
  ];
}

/** Pebbles: a few small stones (variant: how many). */
const pebbles = (v: number): Shape[] => (v === 0 ? [...stone(-4, 0, 2.2, 1.6, 'rock-dark', 'rock', 'rock-light'), ...stone(2, 1.5, 1.5, 1.1, 'rock-dark', 'rock', 'rock-light'), ...stone(4, -2, 1.1, 0.8, 'rock', 'rock-light', 'rock-pale')] : [...stone(-1, 0, 2.8, 1.9, 'rock-dark', 'rock', 'rock-light'), ...stone(3.5, -1.5, 1.2, 0.9, 'rock', 'rock-light', 'rock-pale')]);

/** Leaf litter under a grove: fallen leaves, dark and straw-brown. */
const litter = (v: number): Shape[] => [
  ...leaf(-6, 1, -2, -1, 1.3, 'leaf-dark'),
  ...leaf(1, 2, 5, -0.5, 1.2, 'straw-dark'),
  ...leaf(-2, -2, 1, -4, 1.1, v === 0 ? 'straw-dark' : 'leaf-dark'),
  ...(v === 0 ? leaf(3, 3, 7, 3.5, 1, 'leaf-dark') : leaf(-7, -3, -4, -4.5, 1, 'straw-dark')),
];

/** Clover: three-leaved sprigs, flat on the grass. */
const CLOVER: Shape[] = [
  ...[[-3, 0], [2, -1.5], [0.5, 2]].flatMap(([x = 0, y = 0]) => [0, 2.1, 4.2].map((a) => ellipse(x + Math.cos(a) * 1.1, y + Math.sin(a) * 0.8, 1.15, 0.85, { fill: 'grass-light', alpha: 0.9 }))),
  ...[[-3, 0], [2, -1.5], [0.5, 2]].map(([x = 0, y = 0]) => ellipse(x, y, 0.4, 0.3, flat('leaf'))),
];

const ruinStone = { linear: [-14, -26, 14, 0] as const, stops: [{ at: 0, color: 'rock-light' }, { at: 0.5, color: 'rock' }, { at: 1, color: 'rock-dark' }] };
const RUIN_SHADOW = shadow(15, 4, -1);
const rune = (pts: readonly number[]): Shape => ({ ...line(pts, 1, 'cyan'), glow: { color: 'cyan', blur: 3 } });

/** A toppled column drum: a fluted cylinder on its side, its cut face to the left, moss on top. */
const RUIN_DRUM: Shape[] = [
  RUIN_SHADOW,
  rect(-12, -17, 26, 16, 7, { fill: { linear: [0, -17, 0, -1] as const, stops: [{ at: 0, color: 'rock-light' }, { at: 0.6, color: 'rock' }, { at: 1, color: 'rock-dark' }] }, outline: true }),
  ...[-12, -8, -5].map((y) => line([-6, y, 12, y], 0.7, { id: 'rock-dark', alpha: 0.6 })),
  ellipse(-12, -9, 5, 8, { fill: { radial: [-13, -11, 8] as const, stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] }, outline: true }),
  ellipse(-12, -9, 2, 3.4, { fill: { id: 'rock', alpha: 0.6 } }),
  ellipse(4, -16.5, 6, 2, flat('moss-tuft')),
  ellipse(1, -17, 2.5, 1, flat('grass-light')),
];

/** A fallen capital: a column's carved head on the ground, its scrolls at each end, a ley rune in its face. */
const RUIN_CAPITAL: Shape[] = [
  RUIN_SHADOW,
  rect(-14, -8, 28, 8, 2, { fill: ruinStone, outline: true }),
  path('M -11 -8 L -9 -18 L 9 -18 L 11 -8 Z', { fill: ruinStone, outline: true }),
  rect(-15, -23, 30, 6, 2, { fill: { linear: [0, -23, 0, -17] as const, stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] }, outline: true }),
  ellipse(-13, -18, 3.2, 3.2, { fill: 'rock-light', outline: true }),
  ellipse(13, -18, 3.2, 3.2, { fill: 'rock', outline: true }),
  ellipse(-13, -18, 1.3, 1.3, flat('rock-dark')),
  ellipse(13, -18, 1.3, 1.3, flat('rock-dark')),
  rune([-3, -15, 0, -11, 3, -15]),
  ellipse(-6, -23, 5, 1.6, flat('moss-tuft')),
];

/** A leaning rune slab: a tall cut slab tipped against its own fallen base, a ley rune down its face, moss at its foot. */
const RUIN_SLAB: Shape[] = [
  RUIN_SHADOW,
  rect(-14, -7, 28, 7, 2, { fill: ruinStone, outline: true }),
  path('M -9 -6 L -3 -40 L 9 -38 L 7 -6 Z', { fill: { linear: [-9, -40, 9, -6] as const, stops: [{ at: 0, color: 'rock-pale' }, { at: 0.45, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  path('M 9 -38 L 12 -36 L 10 -6 L 7 -6 Z', { fill: 'rock-dark', outline: true }),
  rune([-1, -33, 2, -28, -1, -23, 2, -18]),
  line([-4, -12, 5, -11], 0.7, { id: 'rock-dark', alpha: 0.6 }),
  ellipse(-8, -5.5, 6, 2, flat('moss-tuft')),
  ellipse(8, -6, 4, 1.4, flat('grass-light')),
];

/** A mossy boulder: Region 1's boulder (the same base) with moss over its top and a fern at its foot. */
const mossy = (k: number): Shape[] => [
  ...boulder(k),
  path(`M ${-11 * k} ${-9 * k} Q ${-6 * k} ${-16 * k} ${3 * k} ${-15 * k} Q ${8 * k} ${-13 * k} ${6 * k} ${-10 * k} Q ${-1 * k} ${-12 * k} ${-11 * k} ${-9 * k} Z`, flat('moss-tuft')),
  ellipse(-3 * k, -13.5 * k, 3 * k, 1 * k, flat('grass-light')),
  ...leaf(10 * k, -1, 15 * k, -6 * k, 1.1, 'leaf'),
  ...leaf(10 * k, -1, 13 * k, -8 * k, 1, 'leaf-light'),
  ...leaf(10 * k, -1, 8 * k, -7 * k, 1, 'leaf'),
];

/** Region 1's decor sprites, for the vector catalog. */
export const MEADOW_DECOR: readonly VectorSprite[] = [
  ...PLANT_FRAMES.grass.map((k, i) => one(k, [16, 14], [8, 12.5], grass(i))),
  ...PLANT_FRAMES.flower.map((k, i) => one(k, [16, 16], [8, 13], flower(i))),
  ...PLANT_FRAMES.fern.map((k, i) => one(k, [20, 15], [10, 13], fern(i))),
  ...PLANT_FRAMES.reed.map((k, i) => one(k, [12, 15], [6, 13], reed(i))),
  ...SCATTER_FRAMES.pebbles.map((k, i) => one(k, [14, 8], [7, 4], pebbles(i))),
  ...SCATTER_FRAMES.litter.map((k, i) => one(k, [18, 10], [9, 5], litter(i))),
  one(SCATTER_FRAMES.clover[0], [12, 8], [6, 4], CLOVER),
  one(VARIANT_FRAMES.ruinStone[0], [36, 44], [18, 40], RUIN_DRUM),
  one(VARIANT_FRAMES.ruinStone[1], [36, 44], [18, 40], RUIN_CAPITAL),
  one(VARIANT_FRAMES.ruinStone[2], [36, 48], [18, 44], RUIN_SLAB),
  one(VARIANT_FRAMES.mossRock['ow-rock-0'], [40, 30], [20, 27], mossy(1.15)),
  one(VARIANT_FRAMES.mossRock['ow-rock-1'], [36, 26], [18, 23], mossy(0.9)),
];
