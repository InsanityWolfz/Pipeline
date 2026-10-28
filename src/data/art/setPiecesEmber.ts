import { SET_PIECE_FRAMES } from '../worldArtAssets';
import { one } from './decorParts';
import { ellipse, flat, line, path, rect, type Ink, type Shape, type VectorSprite } from './types';

// 077: the Emberworks' set pieces: the Great Furnace, a towering beehive furnace of rust brick on soot stone behind
// the Anvil Hall, banded in brass with a cyan ley ring, its mouth glowing ember and smoke rolling from its crown (a
// 4-frame loop over it); the Great Crucible, a giant brass crucible tipped on a stone cradle among the Ash Kilns, slag
// frozen in a spill down its lip and an ember glow deep inside; and the Toppled Stack, a giant chimney fallen across
// a kiln row in three drums, its brass band burst, its ley ring gone dark.

const g = (x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, Ink])[]) => ({ linear: [x0, y0, x1, y1] as const, stops: stops.map(([at, color]) => ({ at, color })) });
const BRICK = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'rust-light'], [0.35, 'rust'], [1, 'rust-dark']]);
const SOOT = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'ash-light'], [0.4, 'ash'], [1, 'ash-dark']]);
const BRASS = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'brass-light'], [0.4, 'brass'], [1, 'brass-dark']]);
const rim = (pts: readonly number[], a = 0.4): Shape => line(pts, 0.8, { id: 'snow', alpha: a });
const shade = (rx: number, ry: number): Shape => ellipse(0, -2, rx, ry, { fill: { id: 'ground-shade', alpha: 0.35 } });
const EMBER = (x: number, y: number, r: number) => ({ radial: [x, y, r] as const, stops: [{ at: 0, color: 'cinder-light' as Ink }, { at: 0.45, color: 'cinder' as Ink }, { at: 1, color: 'flame-dark' as Ink }] });

/** The furnace dome's half-width at height `y` (px from its foot, negative up): a beehive. */
const dome = (y: number): number => {
  const t = Math.min(1, Math.max(0, -y / 176));
  return 62 * Math.sqrt(1 - t * t * 0.86) * (1 - 0.18 * t);
};

// The Great Furnace: 150 × 220 on a 4-tile cliff run.
const FURNACE: Shape[] = [
  shade(72, 10),
  // Its soot-stone footing on the cliff, a ley rune either side.
  rect(-66, -28, 132, 28, 3, { fill: SOOT(-66, -28, 66, 0), outline: true }),
  rect(-68, -32, 136, 7, 3, { fill: g(0, -32, 0, -25, [[0, 'ash-light'], [1, 'ash']]), outline: true }),
  ...[-48, 48].map((x): Shape => ({ ...path(`M ${x - 4} -18 L ${x} -10 L ${x + 4} -18`, { stroke: { color: 'cyan', width: 1.2 } }), glow: { color: 'cyan', blur: 4 } })),
  // The beehive of rust brick, lit from the top left.
  path(`M ${-dome(-30)} -30 ${[-50, -70, -90, -110, -130, -150, -166, -176].map((y) => `L ${-dome(y)} ${y}`).join(' ')} L ${dome(-176)} -176 ${[-166, -150, -130, -110, -90, -70, -50, -30].map((y) => `L ${dome(y)} ${y}`).join(' ')} Z`, { fill: BRICK(-60, -176, 60, -30), outline: true }),
  ...[-46, -62, -78, -94, -122, -138, -154, -168].map((y) => path(`M ${-dome(y) + 1} ${y} Q 0 ${y + 4} ${dome(y) - 1} ${y}`, { stroke: { color: { id: 'rust-dark', alpha: 0.65 }, width: 0.8 } })),
  ...[-54, -86, -130, -160].flatMap((y, i) => [-0.6, -0.2, 0.2, 0.6].map((k) => line([dome(y) * k + (i % 2 ? 6 : 0), y - 8, dome(y) * k + (i % 2 ? 6 : 0), y], 0.6, { id: 'rust-dark', alpha: 0.5 }))),
  rim([-dome(-40) + 2, -40, -dome(-100) + 2, -100, -dome(-160) + 3, -160, -8, -176], 0.45),
  // Soot streaks down from its crown.
  path('M 4 -176 Q 8 -140 2 -100 L 10 -100 Q 16 -140 12 -176 Z', flat({ id: 'ash-dark', alpha: 0.45 })),
  // Brass bands and the cyan ley ring.
  ...[-70, -146].map((y) => path(`M ${-dome(y)} ${y - 4} Q 0 ${y + 2} ${dome(y)} ${y - 4} L ${dome(y + 6)} ${y + 2} Q 0 ${y + 8} ${-dome(y + 6)} ${y + 2} Z`, { fill: BRASS(0, y - 4, 0, y + 6), outline: true })),
  { ...path(`M ${-dome(-108)} -108 Q 0 -102 ${dome(-108)} -108`, { stroke: { color: 'cyan', width: 2.2 } }), glow: { color: 'cyan', blur: 6 } },
  path(`M ${-dome(-108)} -108 Q 0 -102 ${dome(-108)} -108`, { stroke: { color: 'cyan-glow', width: 0.7 } }),
  // The crown: a soot-stone lip with embers in its throat.
  rect(-18, -186, 36, 12, 3, { fill: SOOT(-18, -186, 18, -174), outline: true }),
  { ...ellipse(0, -184, 13, 3.4, { fill: EMBER(0, -184, 13) }), glow: { color: 'cinder', blur: 8 } },
  // The great mouth, an arch of firebrick glowing ember.
  path('M -26 -28 L -26 -54 Q -26 -76 0 -78 Q 26 -76 26 -54 L 26 -28 Z', { fill: SOOT(-26, -78, 26, -28), outline: true }),
  { ...path('M -19 -28 L -19 -52 Q -19 -68 0 -70 Q 19 -68 19 -52 L 19 -28 Z', { fill: EMBER(0, -40, 34), outline: true }), glow: { color: 'cinder', blur: 12 } },
  path('M -19 -36 Q 0 -42 19 -36 L 19 -28 L -19 -28 Z', flat({ id: 'cinder-light', alpha: 0.7 })),
  ellipse(0, -28, 26, 4, { fill: { id: 'cinder', alpha: 0.45 }, glow: { color: 'cinder', blur: 8 } }),
];

/** The furnace's smoke rolling up from its crown: puffs rising and swelling, cycling (frame 0..3). */
const furnaceSmoke = (f: number): Shape[] =>
  [0, 1, 2, 3].map((i) => {
    const k = ((i + f / 4) % 4) / 4;
    const y = -190 - k * 30;
    const r = 6 + k * 7;
    const x = 4 + k * 14 + Math.sin(i * 2.1) * 3;
    return ellipse(x, y, r, r * 0.8, { fill: g(x - r, y - r, x + r, y + r, [[0, { id: 'ash-light', alpha: 0.55 * (1 - k) + 0.1 }], [1, { id: 'ash-dark', alpha: 0.6 * (1 - k) + 0.1 }]]) });
  });

// The Great Crucible: 120 × 110 on a 3-tile kiln row.
const CRUCIBLE: Shape[] = [
  shade(58, 9),
  // The stone cradle: a low block with two arms up either side.
  rect(-50, -24, 100, 24, 3, { fill: SOOT(-50, -24, 50, 0), outline: true }),
  rect(-52, -28, 104, 6, 3, { fill: g(0, -28, 0, -22, [[0, 'ash-light'], [1, 'ash']]), outline: true }),
  path('M -46 -26 L -42 -70 L -32 -70 L -30 -26 Z', { fill: SOOT(-46, -70, -30, -26), outline: true }),
  path('M 22 -26 L 26 -62 L 36 -62 L 38 -26 Z', { fill: SOOT(22, -62, 38, -26), outline: true }),
  // The crucible, tipped toward the east on its trunnions: a deep brass bowl, its lip and its glowing throat.
  path('M -44 -96 Q -52 -60 -24 -34 Q 2 -18 26 -40 L 34 -84 Q 0 -108 -44 -96 Z', { fill: BRASS(-50, -104, 30, -26), outline: true }),
  ...[-0.3, 0.1, 0.5].map((k) => path(`M ${-44 + 70 * k} ${-98 + 14 * k} Q ${-40 + 66 * k} ${-62 + 4 * k} ${-26 + 58 * k} ${-36 - 6 * k}`, { stroke: { color: { id: 'brass-dark', alpha: 0.55 }, width: 0.8 } })),
  rim([-46, -88, -44, -64, -32, -44], 0.5),
  ellipse(-38, -68, 6, 6, { fill: BRASS(-44, -74, -32, -62), outline: true }),
  ellipse(30, -58, 6, 6, { fill: BRASS(24, -64, 36, -52), outline: true }),
  ellipse(-5, -98, 41, 11, { fill: BRASS(-46, -109, 36, -87), outline: true, alpha: 1 }),
  ellipse(-3, -97, 34, 8, { fill: g(0, -105, 0, -89, [[0, 'iron-dark'], [1, 'ash-dark']]) }),
  { ...ellipse(6, -96, 18, 5, { fill: EMBER(6, -96, 18) }), glow: { color: 'cinder', blur: 10 } },
  // Slag frozen in a spill over its lip and down to the ground.
  path('M 30 -92 Q 42 -86 40 -70 Q 38 -52 46 -36 Q 52 -18 44 -4 L 34 -4 Q 38 -22 32 -40 Q 28 -60 26 -84 Z', { fill: g(26, -92, 50, -4, [[0, 'iron-dark'], [0.6, 'ash-dark'], [1, 'iron-dark']]), outline: true }),
  path('M 36 -86 Q 40 -70 37 -58', { stroke: { color: { id: 'snow', alpha: 0.25 }, width: 0.8 } }),
  ...[[40, -60], [44, -30], [38, -12]].map(([x = 0, y = 0]): Shape => ({ ...ellipse(x, y, 1.2, 0.9, flat('cinder')), glow: { color: 'cinder', blur: 3 } })),
  ellipse(46, -3, 10, 3, { fill: g(36, -6, 56, 0, [[0, 'ash-dark'], [1, 'iron-dark']]), outline: true }),
];

/** A chimney drum lying on its side from x0 to x1, its ends round: soot stone banded in brass, its ley ring dark. */
const drum = (x0: number, x1: number, y: number, h: number, band: boolean): Shape[] => [
  rect(x0, y - h, x1 - x0, h, h / 2.2, { fill: SOOT(0, y - h, 0, y), outline: true }),
  rim([x0 + 4, y - h + 2, x1 - 4, y - h + 2], 0.35),
  line([x0 + 6, y - h * 0.55, x1 - 6, y - h * 0.5], 0.7, { id: 'ash-dark', alpha: 0.6 }),
  ...(band ? [rect((x0 + x1) / 2 - 3, y - h - 1, 6, h + 2, 1, { fill: BRASS(0, y - h, 0, y), outline: true })] : []),
  line([x1 - 9, y - h + 3, x1 - 9, y - 3], 1.6, 'cyan-deep'),
];

// The Toppled Stack: 130 × 70 across a 3-tile kiln row.
const STACK: Shape[] = [
  shade(66, 10),
  // The kiln row it fell across: crushed brick heaped under it.
  path('M -54 0 L -50 -20 L -30 -26 L -6 -22 L 18 -28 L 44 -22 L 54 0 Z', { fill: BRICK(-54, -28, 54, 0), outline: true }),
  ...[-40, -16, 8, 30].map((x) => line([x, -20, x + 8, -6], 0.7, { id: 'rust-dark', alpha: 0.7 })),
  // Three drums, the far one lifted where it broke, its open end showing the dark flue and spilling soot.
  ...drum(-64, -24, -18, 26, true),
  ...drum(-22, 20, -26, 28, false),
  ...drum(22, 60, -16, 30, true),
  // The burst brass band, sprung off the middle drum.
  path('M -4 -56 Q 6 -66 14 -58 L 12 -54 Q 6 -60 -1 -53 Z', { fill: BRASS(-4, -66, 14, -53), outline: true }),
  // The open flue at the east end, and soot spilled out of it.
  ellipse(60, -31, 7, 15, { fill: SOOT(53, -46, 67, -16), outline: true }),
  ellipse(60, -31, 4.5, 11, { fill: g(56, -42, 64, -20, [[0, 'ink'], [1, 'ash-dark']]) }),
  path('M 62 -18 Q 70 -10 64 -2 Q 56 2 50 -1 Q 58 -8 56 -16 Z', { fill: { id: 'ash-dark', alpha: 0.85 }, outline: true }),
  ellipse(60, 1, 10, 2.6, { fill: { id: 'ash-dark', alpha: 0.5 } }),
];

/** The Emberworks' set pieces, for the vector catalog. */
export const EMBER_SET_PIECES: readonly VectorSprite[] = [
  one(SET_PIECE_FRAMES['great-furnace'].base, [156, 246], [78, 236], FURNACE),
  { key: 'setpiece-great-furnace-loop', size: [156, 246], anchor: [78, 236], frames: [0, 1, 2, 3].map(furnaceSmoke) },
  one(SET_PIECE_FRAMES['great-crucible'].base, [128, 116], [64, 112], CRUCIBLE),
  one(SET_PIECE_FRAMES['toppled-stack'].base, [140, 76], [70, 72], STACK),
];
