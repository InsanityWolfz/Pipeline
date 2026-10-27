import { PLANT_FRAMES, SCATTER_FRAMES, VARIANT_FRAMES } from '../worldArtAssets';
import { blade, footShade, one, stone } from './decorParts';
import { KILN } from './emberworks';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, type Shape, type VectorSprite } from './types';

// 077: the Emberworks' detail, orange through smoke: scorched tufts and ember-thorn scrub (they sway a little in the
// still, hot air), cooled slag drips with cinder glints, soot stains and clinker baked into the ground, and its
// variants: a broken chimney stump with soot (its fire burns low at its own lip, 074.7), and a fallen brick pile at a
// kiln row's east end (the kiln's mouth still glows).

/** A scorched tuft: ash-grey blades singed brown at the foot (variant: shape). */
function scorched(v: number): Shape[] {
  const set: readonly (readonly [number, number, number])[] = v === 0 ? [[-3, 7, -3], [0, 9, 0.5], [3, 6, 3.5]] : [[-4, 5, -4], [-1, 8, -1.5], [2, 9, 2], [4, 5, 4.5]];
  return [footShade(5), ...set.map(([x, h, l], i) => blade(x, h, l, 1.5, 'straw-dark', 'ash-light', { outline: i % 2 === 0 }))];
}

/** Ember-thorn scrub: a low tangle of rust-dark thorny stems, ash at their tips, a cinder bud or two (variant: shape). */
function thorn(v: number): Shape[] {
  const stems: readonly (readonly number[])[] = v === 0 ? [[0, 0, -3, -4, -7, -6], [0, 0, 1, -5, -1, -10], [0, 0, 4, -4, 7, -7]] : [[0, 0, -2, -5, -5, -9], [0, 0, 3, -3, 8, -5], [0, 0, 2, -6, 3, -11]];
  const out: Shape[] = [footShade(6)];
  for (const s of stems) {
    out.push(line(s, 1.1, 'rust-dark', true));
    const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = s.slice(2);
    out.push(line([x1, y1, x1 - 2, y1 - 1.4], 0.6, 'rust-dark'), line([(x1 + x2) / 2, (y1 + y2) / 2, (x1 + x2) / 2 + 1.8, (y1 + y2) / 2 - 1.6], 0.6, 'rust-dark'));
    out.push(ellipse(x2, y2, 1, 1, flat('ash-light')));
  }
  out.push({ ...ellipse(stems[1]?.[4] ?? 0, (stems[1]?.[5] ?? 0) + 0.5, 0.9, 0.9, flat('cinder')), glow: { color: 'cinder', blur: 2 } });
  return out;
}

/** Cooled slag drips: dark glassy puddles with a cinder glint. */
const slag = (v: number): Shape[] => [
  path(v === 0 ? 'M -7 0 Q -6 -2.5 -2 -2 Q 2 -3.5 6 -1.5 Q 8 0.5 4 1.6 Q -1 2.6 -7 0 Z' : 'M -5 -1 Q -3 -3 1 -2.2 Q 5 -2 5.5 0.5 Q 3 2.4 -1 2 Q -5 1.4 -5 -1 Z', { fill: { linear: [-6, -3, 6, 2] as const, stops: [{ at: 0, color: 'ash' }, { at: 0.5, color: 'ash-dark' }, { at: 1, color: 'iron-dark' }] }, alpha: 0.9 }),
  ellipse(-2, -1.2, 2, 0.6, flat({ id: 'snow', alpha: 0.2 })),
  { ...ellipse(v === 0 ? 3 : 1, -0.6, 0.8, 0.6, flat('cinder')), glow: { color: 'cinder', blur: 2.5 } },
];

/** A soot stain: soft dark smudges. */
const SOOT: Shape[] = [ellipse(0, 0, 8, 3, { fill: { id: 'ash-dark', alpha: 0.35 } }), ellipse(-3, -0.5, 4, 1.8, { fill: { id: 'ash-dark', alpha: 0.35 } }), ellipse(4, 0.8, 2.6, 1.2, { fill: { id: 'iron-dark', alpha: 0.25 } })];

/** Clinker: fused lumps of iron-dark and ash. */
const CLINKER: Shape[] = [...stone(-3, 0, 2.6, 1.8, 'iron-dark', 'ash-dark', 'ash', false), ...stone(2.5, 1, 1.8, 1.3, 'iron-dark', 'iron', 'ash-light', false), ...stone(1, -2, 1.2, 0.9, 'ash-dark', 'ash', 'ash-light', false)];

const sootStone = { linear: [0, -12, 0, 0] as const, stops: [{ at: 0, color: 'ash' }, { at: 1, color: 'ash-dark' }] };
const stack = { linear: [-8, 0, 8, 0] as const, stops: [{ at: 0, color: 'ash-light' }, { at: 0.5, color: 'ash' }, { at: 1, color: 'ash-dark' }] };

/** A broken chimney stump: the footing, a short stack snapped in a jagged edge, its brass band burst, soot down it, embers low in its throat. */
const STUMP: Shape[] = [
  shadow(13, 4, -1),
  rect(-11, -14, 22, 14, 2, { fill: sootStone, outline: true }),
  path('M -8 -12 L -8 -32 L -5 -36 L -2 -31 L 2 -38 L 5 -33 L 8 -35 L 8 -12 Z', { fill: stack, outline: true }),
  path('M -8 -24 L -8 -21 L 8 -21 L 8 -24 Z', { fill: 'brass', outline: true }),
  path('M 8 -24 L 11 -27 L 12 -23 L 8 -21 Z', { fill: 'brass-dark', outline: true }),
  path('M -6 -32 Q -5 -22 -6 -13 L -2 -13 Q -3 -24 -2 -31 Z', flat({ id: 'ash-dark', alpha: 0.6 })),
  ellipse(0, -33.5, 5.5, 1.6, flat('ash-dark')),
  { ...ellipse(0, -33.5, 3.2, 0.9, flat('cinder')), glow: { color: 'cinder', blur: 4 } },
  ellipse(13, -2, 4, 1.4, { fill: { id: 'ash-dark', alpha: 0.5 } }),
  ...stone(12, -3, 2.4, 1.8, 'ash-dark', 'ash', 'ash-light'),
];

/** A kiln with a fallen brick pile at its foot (a row's east end): the kiln as it is, bricks tumbled at its right. */
const KILN_END: Shape[] = [
  ...KILN,
  ...[[9, -4, 0.3], [13, -2, -0.2], [11, -8, 0.5], [15, -6, 0.1], [7, -1, -0.4]].map(([x = 0, y = 0, a = 0]) =>
    path(`M ${x - 3} ${y + a} L ${x + 3} ${y - a} L ${x + 3} ${y + 2.4 - a} L ${x - 3} ${y + 2.4 + a} Z`, { fill: { linear: [x, y, x, y + 2.4] as const, stops: [{ at: 0, color: 'rust-light' }, { at: 1, color: 'rust-dark' }] }, outline: true }),
  ),
  ellipse(12, 0.5, 5, 1.2, { fill: { id: 'rust-dark', alpha: 0.4 } }),
];

/** The Emberworks' decor sprites, for the vector catalog. */
export const EMBER_DECOR: readonly VectorSprite[] = [
  ...PLANT_FRAMES.scorchedTuft.map((k, i) => one(k, [14, 12], [7, 10.5], scorched(i))),
  ...PLANT_FRAMES.thorn.map((k, i) => one(k, [20, 14], [10, 12.5], thorn(i))),
  ...SCATTER_FRAMES.slag.map((k, i) => one(k, [18, 8], [9, 4], slag(i))),
  one(SCATTER_FRAMES.soot[0], [20, 8], [10, 4], SOOT),
  one(SCATTER_FRAMES.clinker[0], [14, 8], [7, 4], CLINKER),
  one(VARIANT_FRAMES.chimneyStump, [36, 92], [15, 88], STUMP),
  one(VARIANT_FRAMES.kilnEnd, [44, 48], [18, 44], KILN_END),
];
