import { SET_PIECE_FRAMES } from '../worldArtAssets';
import { one } from './decorParts';
import { ellipse, flat, line, path, rect, type Ink, type Shape, type VectorSprite } from './types';

// 077: the Stormcrown's set pieces: the Storm Tower, a broken lightning tower of slate banded in brass, its crown of
// bent iron rods (weather lightning strikes it, src/data/weather.ts); the Stormcaller, a giant builder carved out of the
// Emberworks' cliff wall, arms raised to the sky, ley runes down its arms and storm glass in its chest; and the Wind
// Harp, a giant stone frame strung with brass wires that shiver in the wind (a 4-frame loop over it).

const g = (x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, Ink])[]) => ({ linear: [x0, y0, x1, y1] as const, stops: stops.map(([at, color]) => ({ at, color })) });
const SLATE = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'storm-pale'], [0.25, 'storm-light'], [0.65, 'storm'], [1, 'storm-dark']]);
const BRASS = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'brass-light'], [0.4, 'brass'], [1, 'brass-dark']]);
const GLASS = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'snow'], [0.3, 'storm-pale'], [1, 'storm-glow']]);
const rim = (pts: readonly number[], a = 0.4): Shape => line(pts, 0.8, { id: 'snow', alpha: a });
const shade = (rx: number, ry: number): Shape => ellipse(0, -2, rx, ry, { fill: { id: 'ground-shade', alpha: 0.35 } });
const glowRune = (pts: readonly number[]): Shape[] => [{ ...line(pts, 1.4, 'cyan'), glow: { color: 'cyan', blur: 4 } }, line(pts, 0.5, 'cyan-glow')];

/** A heap of slate stones at a piece's foot, standing in for the cairns it replaces. */
const footStones = (list: readonly (readonly [number, number, number, number])[]): Shape[] =>
  list.flatMap(([x, y, w, h]) => [rect(x, y, w, h, 3, { fill: SLATE(x, y, x + w, y + h), outline: true }), line([x + 2, y + 1.5, x + w - 3, y + 1.5], 0.8, { id: 'snow', alpha: 0.3 })]);

// The Storm Tower: 70 × 220 on 2 × 2 cairn tiles.
const TOWER: Shape[] = [
  shade(36, 8),
  ...footStones([[-34, -14, 26, 14], [6, -16, 28, 16], [-24, -24, 22, 12], [4, -26, 18, 12]]),
  // The tower: a tapering slate shaft, broken at one corner of its top.
  path('M -22 -18 L -15 -180 L -4 -186 L 2 -180 L 15 -182 L 22 -18 Z', { fill: SLATE(-22, -186, 22, -18), outline: true }),
  path('M 4 -18 L 6 -180 L 15 -182 L 22 -18 Z', flat({ id: 'storm-dark', alpha: 0.45 })),
  ...[-44, -76, -108, -140, -166].map((y) => line([-20 + (-y / 186) * 6, y, 20 - (-y / 186) * 6, y], 0.7, { id: 'storm-dark', alpha: 0.7 })),
  rim([-20, -24, -14, -178], 0.4),
  // Brass bands.
  ...[-60, -122, -170].map((y) => {
    const w = 22 - (-y / 186) * 6;
    return rect(-w - 1, y - 3, 2 * w + 2, 6, 1, { fill: BRASS(0, y - 3, 0, y + 3), outline: true });
  }),
  // Storm-glass panes, cracked, a dim light in one.
  ...[[-92, false], [-146, true]].flatMap(([y, lit]) => {
    const yy = Number(y);
    return [
      rect(-7, yy - 12, 14, 18, 2, { fill: GLASS(-7, yy - 12, 7, yy + 6), outline: true, ...(lit ? { glow: { color: 'storm-glow', blur: 5 } } : {}) }),
      path(`M -4 ${yy - 10} L 1 ${yy - 3} L -2 ${yy + 1} L 3 ${yy + 5}`, { stroke: { color: 'storm-dark', width: 0.7 } }),
      line([-5, yy - 10, -5, yy + 2], 0.6, { id: 'snow', alpha: 0.7 }),
    ];
  }),
  // The crown: a brass ring and a crown of bent iron rods, the middle one tallest (where lightning strikes).
  rect(-17, -192, 34, 7, 2, { fill: BRASS(0, -192, 0, -185), outline: true }),
  ...[[-14, -192, -22, -204, -26, -200], [-7, -192, -10, -206, -16, -212], [7, -192, 10, -205, 14, -214], [14, -192, 22, -202, 27, -206]].map((p) => line(p, 2, 'iron', true)),
  line([0, -192, 0, -213], 2.4, 'iron-light', true),
  line([-0.6, -192, -0.6, -212], 0.7, { id: 'snow', alpha: 0.6 }),
  ellipse(0, -214, 2.2, 2.2, { fill: 'iron-light', outline: true }),
];

// The Stormcaller: 130 × 200 carved out of a 3-tile cliff wall.
const CALLER: Shape[] = [
  shade(62, 9),
  // The cliff it was carved from: rough slate round its legs, a lit top edge either side.
  path('M -64 0 L -64 -44 L -46 -58 L -30 -52 L -30 0 Z', { fill: SLATE(-64, -58, -30, 0), outline: true }),
  path('M 30 0 L 30 -50 L 48 -60 L 64 -46 L 64 0 Z', { fill: SLATE(30, -60, 64, 0), outline: true }),
  ...[-40, -24].flatMap((y) => [line([-62, y, -32, y + 2], 0.7, { id: 'storm-dark', alpha: 0.7 }), line([32, y + 2, 62, y], 0.7, { id: 'storm-dark', alpha: 0.7 })]),
  // The robe, the cliff's own rock dressed into folds.
  path('M -34 0 Q -32 -70 -24 -112 Q 0 -126 24 -112 Q 32 -70 34 0 Z', { fill: SLATE(-34, -126, 34, 0), outline: true }),
  ...[-16, -6, 6, 16].map((x) => path(`M ${x * 0.9} -108 Q ${x * 1.2} -60 ${x * 1.6} -2`, { stroke: { color: { id: 'storm-dark', alpha: 0.6 }, width: 0.9 } })),
  rim([-30, -12, -28, -70, -22, -110], 0.4),
  // Arms raised to the sky, ley runes running down them, open hands.
  path('M -22 -112 L -46 -170 L -36 -176 L -12 -118 Z', { fill: SLATE(-46, -176, -12, -112), outline: true }),
  path('M 22 -112 L 46 -170 L 36 -176 L 12 -118 Z', { fill: SLATE(12, -176, 46, -112), outline: true }),
  ...[-1, 1].flatMap((s) => [
    path(`M ${s * 42} -172 L ${s * 46} -190 L ${s * 41} -188 L ${s * 38} -196 L ${s * 34} -186 L ${s * 30} -190 L ${s * 33} -174 Z`, { fill: SLATE(s * 30, -196, s * 46, -172), outline: true }),
    ...glowRune([s * 38, -164, s * 33, -150, s * 30, -142, s * 25, -128, s * 22, -120]),
  ]),
  // The hood between its arms, its face a dark hollow lifted to the sky.
  path('M -14 -114 Q -16 -140 0 -148 Q 16 -140 14 -114 Q 0 -108 -14 -114 Z', { fill: SLATE(-16, -148, 16, -108), outline: true }),
  ellipse(0, -128, 7, 9, { fill: g(0, -137, 0, -119, [[0, 'ink'], [1, 'storm-dark']]), outline: true }),
  rim([-13, -120, -14, -136, -6, -146], 0.45),
  // Storm glass set in its chest.
  { ...path('M -8 -96 L 0 -108 L 8 -96 L 0 -84 Z', { fill: GLASS(-8, -108, 8, -84), outline: true }), glow: { color: 'storm-glow', blur: 6 } },
  line([-3, -102, 2, -94, -1, -88], 0.6, { id: 'snow', alpha: 0.8 }),
  ...glowRune([-10, -72, 0, -64, 10, -72]),
];

// The Wind Harp: 110 × 150 on 3 × 2 cairn tiles: two stone pillars and a curved neck, strung with brass wires.
const HARP_FRAME: Shape[] = [
  shade(54, 8),
  ...footStones([[-50, -16, 30, 16], [-16, -14, 32, 14], [18, -16, 32, 16], [-36, -26, 22, 12], [16, -24, 24, 10]]),
  // The sound board along the foot, carved with a ley band.
  rect(-42, -36, 84, 12, 3, { fill: SLATE(-42, -36, 42, -24), outline: true }),
  ...glowRune([-30, -30, -20, -27, -10, -30, 0, -27, 10, -30, 20, -27, 30, -30]),
  // The pillar on the west, tall, curving over into the neck that runs down to the eastern post.
  path('M -46 -34 L -44 -128 Q -40 -150 -14 -146 Q 20 -138 40 -104 L 44 -34 L 34 -34 L 32 -98 Q 16 -126 -14 -132 Q -32 -134 -34 -120 L -34 -34 Z', { fill: SLATE(-46, -150, 44, -34), outline: true }),
  rim([-44, -40, -43, -126, -36, -144, -14, -145], 0.45),
  // Brass pegs along the neck, where the wires tie.
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const t = i / 6;
    const x = -28 + t * 60;
    const y = -134 + t * 36 + Math.sin(t * Math.PI) * -4;
    return ellipse(x, y, 1.6, 1.6, { fill: BRASS(x - 1.6, y - 1.6, x + 1.6, y + 1.6), outline: true });
  }),
];

/** The harp's seven brass wires from the neck to the sound board, shivering in the wind (frame 0..3). */
const harpWires = (f: number): Shape[] =>
  [0, 1, 2, 3, 4, 5, 6].flatMap((i) => {
    const t = i / 6;
    const x = -28 + t * 60;
    const y0 = -134 + t * 36 + Math.sin(t * Math.PI) * -4;
    const y1 = -36;
    const bow = (([1.6, -0.6, -1.6, 0.6][(f + i) % 4] ?? 0) * (1 - Math.abs(t - 0.5))) * 1.4;
    const my = (y0 + y1) / 2;
    return [path(`M ${x} ${y0} Q ${x + bow} ${my} ${x} ${y1}`, { stroke: { color: i % 2 ? 'brass' : 'brass-light', width: 0.7 } }), ...(f % 2 === 0 ? [ellipse(x + bow * 0.5, my, 0.6, 2, flat({ id: 'brass-light', alpha: 0.6 }))] : [])];
  });

/** The Stormcrown's set pieces, for the vector catalog. */
export const STORM_SET_PIECES: readonly VectorSprite[] = [
  one(SET_PIECE_FRAMES['storm-tower'].base, [76, 226], [38, 222], TOWER),
  one(SET_PIECE_FRAMES.stormcaller.base, [136, 206], [68, 202], CALLER),
  one(SET_PIECE_FRAMES['wind-harp'].base, [116, 156], [58, 152], HARP_FRAME),
  { key: 'setpiece-wind-harp-loop', size: [116, 156], anchor: [58, 152], frames: [0, 1, 2, 3].map(harpWires) },
];
