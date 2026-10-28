import { PLANT_FRAMES, SCATTER_FRAMES, VARIANT_FRAMES } from '../worldArtAssets';
import { blade, footShade, leaf, one } from './decorParts';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, type Shape, type VectorSprite } from './types';

// 077: Stonefall Hollows' detail, the dusk quarry: dry tufts on open ground and vines hanging from the cliff faces
// (they sway), quarry chips, half-buried cut flags and rust stains baked into the ground, and rubble variants on its
// rock tiles: a cut block with a row of drill holes, a broken column drum, a heap of stone and scaffold timber with a
// scrap of ley-iron. Each variant keeps its rubble's shadow, so its footprint (059) is the same.

/** A dry tuft: straw blades, a little moss at the foot (variant: shape). */
function dryTuft(v: number): Shape[] {
  const set: readonly (readonly [number, number, number])[] = v === 0 ? [[-3, 8, -4], [-1, 10, -1], [1.5, 9, 2.5], [3.5, 6, 4.5]] : [[-4, 6, -5], [-1.5, 9, -2], [1, 11, 0.5], [3.5, 8, 3.5], [0, 5, 2]];
  return [
    footShade(6),
    ellipse(0, -0.6, 5, 1.6, { fill: 'moss-tuft' }),
    ...set.map(([x, h, l], i) => blade(x, h, l, 1.5, 'straw-dark', i % 2 ? 'straw' : 'straw-light', { outline: i % 2 === 0 })),
  ];
}

/** A vine hanging from a cliff's lit top edge: a few strands of moss and dark leaves, its root at the anchor (top). */
function vine(v: number): Shape[] {
  const strands: readonly (readonly [number, number, number])[] = v === 0 ? [[-3, 16, -1], [0.5, 20, 1], [3.5, 12, 2]] : [[-2, 18, -2], [2, 14, 1.5]];
  const out: Shape[] = [ellipse(0, 0.5, 5, 1.6, { fill: 'moss-tuft' })];
  for (const [x, len, drift] of strands) {
    out.push(line([x, 0, x + drift * 0.6, len * 0.5, x + drift, len], 0.9, 'leaf-dark'));
    for (let k = 1; k <= 3; k++) {
      const y = (len * k) / 3.4;
      const lx = x + drift * (y / len);
      out.push(...leaf(lx, y, lx - 3.4, y + 2, 1.3, k % 2 ? 'moss-tuft' : 'leaf', undefined, false));
      out.push(...leaf(lx, y + 1.5, lx + 3.2, y + 3.6, 1.3, k % 2 ? 'leaf' : 'moss-tuft', undefined, false));
    }
  }
  return out;
}

/** Quarry chips: small angular flakes of pale stone. */
const chips = (v: number): Shape[] =>
  (v === 0 ? [[-5, 0, 0.2], [0, -2, 1.3], [3, 1.5, 2.2], [5.5, -1, 0.9]] : [[-3, 1, 0.6], [2, -1, 1.8], [-0.5, -2.5, 2.9]]).map(([x = 0, y = 0, a = 0], i) =>
    path(`M ${x - 1.6} ${y + 0.6} L ${x - 0.3} ${y - 1.2 - (a % 1)} L ${x + 1.7} ${y - 0.2} L ${x + 0.5} ${y + 1.1} Z`, { fill: i % 2 ? 'hollow-pale' : 'hollow-light', stroke: { color: { id: 'hollow-dark', alpha: 0.5 }, width: 0.4 } }),
  );

/** A half-buried cut flag: the top edge of a squared paving stone showing through the dust. */
const FLAG: Shape[] = [
  path('M -9 1 L -7 -3 L 8 -3.5 L 9.5 0.5 Q 0 2.5 -9 1 Z', { fill: { linear: [0, -3.5, 0, 1] as const, stops: [{ at: 0, color: 'flag-light' }, { at: 0.4, color: 'flag' }, { at: 1, color: 'flag-dark' }] }, stroke: { color: { id: 'flag-dark', alpha: 0.8 }, width: 0.5 } }),
  line([-6, -2.4, 7, -2.8], 0.6, { id: 'snow', alpha: 0.25 }),
  line([1, -3.2, 0.5, 1.2], 0.6, 'flag-dark'),
];

/** A rust stain: a soft run of iron-rust on the stone. */
const RUST: Shape[] = [ellipse(0, 0, 7, 2.6, { fill: { id: 'iron-rust', alpha: 0.32 } }), ellipse(-2, -0.4, 3.5, 1.4, { fill: { id: 'iron-rust', alpha: 0.35 } }), ellipse(3.5, 0.6, 2, 0.9, { fill: { id: 'iron-rust', alpha: 0.3 } })];

const cut = (x0: number, y0: number, x1: number, y1: number) => ({ linear: [x0, y0, x1, y1] as const, stops: [{ at: 0, color: 'hollow-pale' }, { at: 0.35, color: 'hollow-light' }, { at: 1, color: 'hollow' }] });

/** A cut block left in the quarry: squared, its top lit, a row of drill holes where it was to be split. */
const block = (k: number): Shape[] => [
  shadow(13 * k, 3.5 * k, -1),
  rect(-11 * k, -13 * k, 22 * k, 13 * k, 1.5, { fill: cut(-11 * k, -13 * k, 11 * k, 0), outline: true }),
  rect(-11 * k, -17 * k, 22 * k, 6 * k, 1.5, { fill: { linear: [0, -17 * k, 0, -11 * k] as const, stops: [{ at: 0, color: 'hollow-pale' }, { at: 1, color: 'hollow-light' }] }, outline: true }),
  rect(5 * k, -13 * k, 6 * k, 13 * k, 1, flat('hollow-dark')),
  ...[-7, -3.5, 0, 3.5].map((x) => ellipse(x * k, -7 * k, 0.9 * k, 1.3 * k, flat('hollow-dark'))),
  line([-9 * k, -15.5 * k, 8 * k, -15.5 * k], 0.6, { id: 'snow', alpha: 0.3 }),
];

/** A broken column drum: a short fluted drum standing, its top snapped off in a jagged edge. */
const drum = (k: number): Shape[] => [
  shadow(13 * k, 3.5 * k, -1),
  rect(-12 * k, -4 * k, 24 * k, 4 * k, 1, { fill: 'hollow', outline: true }),
  path(`M ${-8 * k} ${-3 * k} L ${-8 * k} ${-17 * k} L ${-4 * k} ${-21 * k} L ${-1 * k} ${-17 * k} L ${3 * k} ${-20 * k} L ${8 * k} ${-15 * k} L ${8 * k} ${-3 * k} Z`, { fill: cut(-8 * k, -21 * k, 8 * k, -3 * k), outline: true }),
  ...[-4, 0, 4].map((x) => line([x * k, -5 * k, x * k, -15 * k], 0.7, { id: 'hollow-dark', alpha: 0.6 })),
  path(`M ${3 * k} ${-3 * k} L ${8 * k} ${-3 * k} L ${8 * k} ${-15 * k} L ${3 * k} ${-18 * k} Z`, flat({ id: 'hollow-dark', alpha: 0.55 })),
];

/** A heap of stone and scaffold timber: broken blocks, two crossed planks and a scrap of ley-iron with a vein glint. */
const heap = (k: number): Shape[] => [
  shadow(13 * k, 3.5 * k, -1),
  path(`M ${-12 * k} 0 L ${-10 * k} ${-7 * k} L ${-3 * k} ${-10 * k} L ${2 * k} ${-6 * k} L ${1 * k} 0 Z`, { fill: cut(-12 * k, -10 * k, 2 * k, 0), outline: true }),
  rect(-11 * k, -14 * k, 22 * k, 3 * k, 0.8, { fill: { linear: [0, -14 * k, 0, -11 * k] as const, stops: [{ at: 0, color: 'wood' }, { at: 1, color: 'wood-dark' }] }, outline: true }),
  path(`M ${-5 * k} ${-2 * k} L ${7 * k} ${-17 * k} L ${9.5 * k} ${-15.5 * k} L ${-2.5 * k} ${-0.5 * k} Z`, { fill: 'wood', outline: true }),
  path(`M ${2 * k} 0 L ${4 * k} ${-6 * k} L ${11 * k} ${-5 * k} L ${12 * k} 0 Z`, { fill: 'hollow-dark', outline: true }),
  path(`M ${5 * k} ${-6 * k} L ${7 * k} ${-10 * k} L ${11 * k} ${-9 * k} L ${10 * k} ${-5.5 * k} Z`, { fill: { linear: [5 * k, -10 * k, 11 * k, -5 * k] as const, stops: [{ at: 0, color: 'iron' }, { at: 1, color: 'iron-rust' }] }, outline: true }),
  { ...line([6.5 * k, -7.5 * k, 8.5 * k, -8.5 * k, 10 * k, -7.5 * k], 0.6, 'vein'), glow: { color: 'vein', blur: 2.5 } },
];

const RUBBLE: Readonly<Record<string, number>> = { 'ow-rubble-0': 1.1, 'ow-rubble-1': 0.85 };

/** The Hollows' decor sprites, for the vector catalog. */
export const HOLLOWS_DECOR: readonly VectorSprite[] = [
  ...PLANT_FRAMES.dryTuft.map((k, i) => one(k, [16, 14], [8, 12.5], dryTuft(i))),
  ...PLANT_FRAMES.vine.map((k, i) => one(k, [16, 26], [8, 3], vine(i))),
  ...SCATTER_FRAMES.chips.map((k, i) => one(k, [16, 8], [8, 4], chips(i))),
  one(SCATTER_FRAMES.flag[0], [22, 8], [11, 5], FLAG),
  one(SCATTER_FRAMES.rust[0], [18, 8], [9, 4], RUST),
  ...Object.entries(VARIANT_FRAMES.rubble).flatMap(([base, [b, d, h]]) => {
    const k = RUBBLE[base] ?? 1;
    return [one(b, [32, 26], [16, 23], block(k)), one(d, [32, 30], [16, 27], drum(k)), one(h, [32, 26], [16, 23], heap(k))];
  }),
];
