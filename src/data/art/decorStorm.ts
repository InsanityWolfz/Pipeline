import { PLANT_FRAMES, SCATTER_FRAMES, VARIANT_FRAMES } from '../worldArtAssets';
import { blade, footShade, one } from './decorParts';
import { cairn } from './stormcrown';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// 077: the Stormcrown's detail, the dark heights: wind-bent grass leaning downwind (it sways hard in the gale), slate
// shards, storm-glass glints and rain-dark patches baked into the ground, and its variants: iron rods bent or snapped
// by the storms, and cairns with a brass marker plate or a storm-glass shard set on top.

/** Wind-bent grass: grey-green blades combed over to the south-east (variant: shape). */
function windGrass(v: number): Shape[] {
  const set: readonly (readonly [number, number, number])[] = v === 0 ? [[-4, 7, 3], [-1.5, 9, 5], [1, 8, 6], [3, 6, 6]] : v === 1 ? [[-3, 8, 4], [0, 10, 6], [2.5, 7, 6.5]] : [[-5, 6, 3.5], [-2, 8, 5.5], [0.5, 9, 6.5], [3, 7, 6], [5, 5, 5]];
  return [
    footShade(6),
    ...set.map(([x, h, l], i) => blade(x, h, l, 1.6, 'warden-dark', i % 2 ? 'warden' : 'warden-light', { outline: i === 0 })),
    ...set.map(([x, h, l]) => blade(x + 0.2, h * 0.85, l * 0.9, 0.5, 'warden', 'warden-light')),
  ];
}

/** Slate shards: thin dark flakes, lit on one edge. */
const slate = (v: number): Shape[] =>
  (v === 0 ? [[-5, 0, 4], [1, -1.5, 3], [4, 1.5, 2.4]] : [[-3, 0.5, 4.5], [3, -1, 3.5]]).flatMap(([x = 0, y = 0, w = 0]) => [
    path(`M ${x - w / 2} ${y + 0.8} L ${x - w / 2 + 1} ${y - 1} L ${x + w / 2} ${y - 0.6} L ${x + w / 2 - 0.6} ${y + 1} Z`, { fill: 'storm-dark', alpha: 0.85 }),
    line([x - w / 2 + 1, y - 0.9, x + w / 2, y - 0.5], 0.5, 'storm-light'),
  ]);

/** A storm-glass glint: a tiny pale crystal catching the light. */
const GLASS: Shape[] = [
  path('M -1.5 0.8 L -0.6 -2.6 L 1 -2 L 1.6 0.8 Z', { fill: { linear: [0, -2.6, 0, 0.8] as const, stops: [{ at: 0, color: 'snow' }, { at: 1, color: 'storm-pale' }] }, outline: true }),
  { ...ellipse(-0.6, -2.4, 0.6, 0.6, flat('snow')), glow: { color: 'storm-pale', blur: 2 } },
  path('M 2.5 1 L 3 -0.6 L 4 0.9 Z', { fill: 'storm-pale', outline: true }),
];

/** A rain-dark patch: wet slate, darker, with a faint sheen. */
const RAIN_DARK: Shape[] = [ellipse(0, 0, 9, 3.2, { fill: { id: 'storm-dark', alpha: 0.4 } }), ellipse(-2, -0.4, 4.5, 1.5, { fill: { id: 'storm-dark', alpha: 0.3 } }), ellipse(-3, -0.9, 2.5, 0.5, { fill: { id: 'storm-pale', alpha: 0.25 } })];

const slateFoot = { linear: [0, -12, 0, 0] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const ironBar = { linear: [-3, 0, 3, 0] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 0.45, color: 'iron' }, { at: 1, color: 'iron-dark' }] };

/** A rod bent over by a storm: the post kinked at a brass band, its crown hanging toward the ground, its spark out. */
const ROD_BENT: Shape[] = [
  shadow(11, 3.5, -1),
  rect(-9, -10, 18, 10, 2, { fill: slateFoot, outline: true }),
  rect(-3, -44, 6, 36, 1, { fill: ironBar, outline: true }),
  rect(-4, -22, 8, 3, 0.6, solid('brass')),
  path('M -3 -44 Q 0 -54 14 -52 L 14 -46 Q 4 -48 3 -42 Z', { fill: { linear: [0, -54, 0, -42] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
  rect(-4, -46, 8, 3, 0.6, solid('brass')),
  line([14, -49, 18, -42], 1.6, 'iron-dark'),
  line([14, -49, 19, -50], 1.6, 'iron-dark'),
  ellipse(16, -39, 1.4, 1.4, { fill: 'dormant-dark', outline: true }),
  line([-1.5, -40, -1.5, -12], 0.8, { id: 'snow', alpha: 0.3 }),
];

/** A rod snapped by a strike: a jagged stub on its footing, the top lying across the ground, scorched black at the break. */
const ROD_SNAPPED: Shape[] = [
  shadow(11, 3.5, -1),
  path('M -6 -3 L 22 -6 L 22 -2 L -6 1 Z', { fill: ironBar, outline: true }),
  rect(12, -7, 3, 7, 0.4, solid('brass')),
  line([22, -4, 26, -9], 1.4, 'iron-dark'),
  line([22, -4, 27, -1], 1.4, 'iron-dark'),
  rect(-9, -10, 18, 10, 2, { fill: slateFoot, outline: true }),
  path('M -3 -10 L -3 -34 L -1 -38 L 0.5 -33 L 2 -37 L 3 -33 L 3 -10 Z', { fill: ironBar, outline: true }),
  rect(-4, -22, 8, 3, 0.6, solid('brass')),
  ellipse(0, -34, 3, 1.3, flat({ id: 'iron-dark', alpha: 0.8 })),
  line([-1.5, -32, -1.5, -12], 0.8, { id: 'snow', alpha: 0.3 }),
];

/** The heaps' top stone, per cairn look: where a plate leans or a shard is set. */
const TOPS: readonly (readonly [number, number])[] = [[0, -28], [0.5, -30], [0, -22]];

/** A cairn with a brass marker plate leaning on its front: an engraved builder's mark. */
const plate = (v: number): Shape[] => [
  ...cairn(v),
  path('M -6 -3 L -5 -15 L 5 -16 L 6 -3 Z', { fill: { linear: [-6, -16, 6, -3] as const, stops: [{ at: 0, color: 'brass-light' }, { at: 0.4, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  path('M -2.5 -12 L 0 -7 L 2.5 -12 M 0 -7 L 0 -5', { stroke: { color: 'brass-dark', width: 0.8 } }),
  ellipse(-3, -14.5, 1.6, 0.6, flat({ id: 'snow', alpha: 0.45 })),
];

/** A cairn crowned with a shard of storm glass, catching what light there is. */
const glass = (v: number): Shape[] => {
  const [x, y] = TOPS[v] ?? [0, -28];
  return [
    ...cairn(v),
    { ...ellipse(x, y - 6, 6, 6, { fill: { id: 'storm-glow', alpha: 0.18 } }), glow: { color: 'storm-glow', blur: 6 } },
    path(`M ${x - 3} ${y + 1} L ${x - 1.5} ${y - 12} L ${x + 1.5} ${y - 9} L ${x + 3} ${y + 1} Z`, { fill: { linear: [x, y - 12, x, y + 1] as const, stops: [{ at: 0, color: 'snow' }, { at: 0.35, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] }, outline: true }),
    path(`M ${x + 2.5} ${y + 1} L ${x + 4} ${y - 5} L ${x + 5.5} ${y + 1} Z`, { fill: 'storm-pale', outline: true }),
    line([x - 1, y - 9, x - 1.6, y - 2], 0.5, { id: 'snow', alpha: 0.8 }),
  ];
};

/** The Stormcrown's decor sprites, for the vector catalog. */
export const STORM_DECOR: readonly VectorSprite[] = [
  ...PLANT_FRAMES.windGrass.map((k, i) => one(k, [20, 12], [8, 10.5], windGrass(i))),
  ...SCATTER_FRAMES.slate.map((k, i) => one(k, [16, 8], [8, 4], slate(i))),
  one(SCATTER_FRAMES.glass[0], [10, 8], [5, 5], GLASS),
  one(SCATTER_FRAMES.rainDark[0], [22, 8], [11, 4], RAIN_DARK),
  one(VARIANT_FRAMES.rod[0], [36, 92], [10, 88], ROD_BENT),
  one(VARIANT_FRAMES.rod[1], [40, 92], [10, 88], ROD_SNAPPED),
  ...Object.entries(VARIANT_FRAMES.cairn).flatMap(([, [p, g]], i) => [one(p, [34, 40], [17, 36], plate(i)), one(g, [34, 48], [17, 44], glass(i))]),
];
