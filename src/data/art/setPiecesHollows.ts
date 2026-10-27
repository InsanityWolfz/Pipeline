import { SET_PIECE_FRAMES } from '../worldArtAssets';
import { one } from './decorParts';
import { ellipse, flat, line, path, rect, type Ink, type Shape, type VectorSprite } from './types';

// 077: Stonefall Hollows' set pieces on its cliffs: the Unfinished Giant, a face and shoulders half cut into the
// quarry face and never finished, its scaffold still up and a cut block hanging on chains from a beam (the block and
// ropes swing, a 4-frame loop); the Aqueduct Head, the broken stone water tower where the aqueduct came off the
// heights, its dry spillway down the cliff; and the Great Crane, a builders' crane of brass-bound timber whose cradle
// sways on its chain over its own footprint (a loop). Loops are drawn over the base with the same anchor and box.

const g = (x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, Ink])[]) => ({ linear: [x0, y0, x1, y1] as const, stops: stops.map(([at, color]) => ({ at, color })) });
const QUARRY = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'hollow-pale'], [0.25, 'hollow-light'], [0.65, 'hollow'], [1, 'hollow-dark']]);
const rim = (pts: readonly number[], a = 0.4): Shape => line(pts, 0.8, { id: 'snow', alpha: a });
const shade = (rx: number, ry: number): Shape => ellipse(0, -2, rx, ry, { fill: { id: 'ground-shade', alpha: 0.32 } });
const TIMBER = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'wood-light'], [0.5, 'wood'], [1, 'wood-dark']]);
const vein = (pts: readonly number[]): Shape[] => [line(pts, 1.8, { id: 'cyan-deep', alpha: 0.8 }), { ...line(pts, 0.8, 'vein'), glow: { color: 'vein', blur: 4 } }];

/** A rough quarry face: the cliff's mass, its lit top edge and strata, `x0`..`x1` wide up to `top`. */
const quarryFace = (x0: number, x1: number, top: number): Shape[] => [
  path(`M ${x0} 0 L ${x0} ${top + 8} Q ${(x0 + x1) / 2} ${top - 4} ${x1} ${top + 8} L ${x1} 0 Z`, { fill: QUARRY(x0, top, x1, 0), outline: true }),
  ...[0.3, 0.55, 0.8].map((k) => line([x0 + 2, top * k, x1 - 2, top * k + 2], 0.8, { id: 'hollow-dark', alpha: 0.7 })),
  rim([x0 + 2, top + 7, (x0 + x1) / 2, top - 2, x1 - 2, top + 7], 0.35),
];

/** A timber pole or beam from (x0, y0) to (x1, y1), `w` thick, with brass bands. */
const pole = (x0: number, y0: number, x1: number, y1: number, w: number, bands: readonly number[] = []): Shape[] => [
  line([x0, y0, x1, y1], w, 'wood-dark', true),
  line([x0 - w * 0.2, y0, x1 - w * 0.2, y1], w * 0.45, 'wood-light'),
  ...bands.map((k) => line([x0 + (x1 - x0) * k - (y1 - y0 === 0 ? 0 : w * 0.6), y0 + (y1 - y0) * k, x0 + (x1 - x0) * k + (y1 - y0 === 0 ? 0 : w * 0.6), y0 + (y1 - y0) * k], w * 0.6, 'brass')),
];

// The Unfinished Giant: 200 × 130 over a 5-tile cliff run.
const GIANT: Shape[] = [
  shade(96, 9),
  // The quarry face it was being cut from, rising behind it in rough steps.
  path('M -86 -30 L -86 -86 L -66 -92 L -60 -108 L -36 -112 L -28 -124 L 26 -126 L 32 -112 L 58 -106 L 64 -94 L 86 -88 L 86 -30 Z', { fill: g(0, -126, 0, -30, [[0, 'hollow-light'], [0.3, 'hollow'], [1, 'hollow-dark']]), outline: true }),
  ...[-100, -84, -66].map((y) => line([-84, y, 84, y + 3], 0.8, { id: 'hollow-dark', alpha: 0.8 })),
  rim([-84, -86, -64, -92, -58, -107, -36, -111, -28, -123, 26, -125], 0.3),
  ...quarryFace(-82, 82, -34),
  // The shoulders roughed out either side, the left one cut smooth, the right still in chisel steps.
  path('M -82 -30 Q -80 -62 -48 -70 L -30 -72 L -30 -30 Z', { fill: QUARRY(-82, -72, -30, -30), outline: true }),
  rim([-80, -40, -76, -60, -50, -69]),
  path('M 30 -30 L 30 -72 L 44 -72 L 44 -64 L 56 -64 L 56 -56 L 68 -56 L 68 -48 L 80 -48 L 82 -30 Z', { fill: QUARRY(30, -72, 82, -30), outline: true }),
  ...[[44, -64, 56, -64], [56, -56, 68, -56], [68, -48, 80, -48]].map(([a = 0, b = 0, c = 0, d = 0]) => line([a, b, c, d], 1, 'hollow-pale')),
  // The face: brow, closed eyes, nose and set mouth on the left, the right half still rough block with chisel marks.
  path('M -32 -30 Q -36 -96 0 -118 Q 34 -96 32 -30 Z', { fill: QUARRY(-34, -118, 34, -30), outline: true }),
  path('M 0 -118 Q 34 -96 32 -30 L 4 -30 L 4 -112 Z', { fill: g(0, -118, 32, -30, [[0, 'hollow-light'], [1, 'hollow-dark']]) }),
  ...[[6, -104], [14, -92], [20, -78], [24, -62], [26, -46], [12, -70], [16, -54]].map(([x = 0, y = 0]) => path(`M ${x} ${y} L ${x + 3} ${y - 1} L ${x + 2} ${y + 2} Z`, flat('hollow-pale'))),
  ...[-96, -80, -64, -48].map((y) => line([6, y, 30, y + 2], 0.7, { id: 'hollow-dark', alpha: 0.7 })),
  path('M -26 -84 Q -14 -92 -2 -86', { stroke: { color: 'hollow-dark', width: 2 } }),
  path('M -22 -76 Q -15 -72 -8 -76', { stroke: { color: 'hollow-dark', width: 1.4 } }),
  path('M -4 -78 L -2 -56 L -9 -52', { stroke: { color: 'hollow-dark', width: 1.4 } }),
  path('M -18 -44 Q -10 -40 -2 -44', { stroke: { color: 'hollow-dark', width: 1.6 } }),
  rim([-30, -40, -32, -78, -14, -108, 0, -117], 0.5),
  // A ley vein glinting across the left shoulder.
  ...vein([-74, -50, -64, -58, -56, -62, -48, -60]),
  // The scaffold against the right: poles, planks and a beam reaching out, ropes tied off.
  ...pole(40, -2, 40, -120, 3.2, [0.3, 0.7]),
  ...pole(70, -2, 70, -104, 3.2, [0.4]),
  ...pole(38, -84, 74, -84, 2.6),
  ...pole(38, -46, 74, -46, 2.6),
  rect(36, -90, 40, 4, 1, { fill: TIMBER(36, -90, 76, -86), outline: true }),
  rect(36, -52, 40, 4, 1, { fill: TIMBER(36, -52, 76, -48), outline: true }),
  ...pole(34, -118, 98, -118, 3.4, [0.15]),
  line([40, -118, 70, -104], 1, 'wood-dark'),
  line([42, -86, 68, -50], 0.7, 'straw-dark'),
  // Chisels and a mallet left on the plank, fallen chips at its foot.
  line([46, -92, 52, -93], 1, 'iron'),
  rect(56, -95, 6, 4, 1, { fill: 'wood', outline: true }),
  ...[[-60, -3], [-20, -2], [14, -3], [62, -2], [86, -3]].map(([x = 0, y = 0], i) => ellipse(x, y, 3 + (i % 2), 2, { fill: QUARRY(x - 3, y - 2, x + 3, y + 2), outline: true })),
];

/** The Giant's hanging block on its chains from the beam's end, swinging (frame 0..3). */
const giantBlock = (f: number): Shape[] => {
  const a = ([-5, 0, 5, 0][f] ?? 0) * (Math.PI / 180);
  const px = 92;
  const py = -118;
  const len = 46;
  const bx = px + Math.sin(a) * len;
  const by = py + Math.cos(a) * len;
  return [
    line([px - 4, py, bx - 7, by - 2], 0.9, 'iron'),
    line([px + 4, py, bx + 7, by - 2], 0.9, 'iron'),
    ...[0.25, 0.5, 0.75].flatMap((k) => [ellipse(px - 4 + (bx - 7 - px + 4) * k, py + (by - 2 - py) * k, 1, 1.4, { stroke: { color: 'iron-light', width: 0.5 } }), ellipse(px + 4 + (bx + 7 - px - 4) * k, py + (by - 2 - py) * k, 1, 1.4, { stroke: { color: 'iron-light', width: 0.5 } })]),
    rect(bx - 11, by - 2, 22, 16, 1.5, { fill: QUARRY(bx - 11, by - 2, bx + 11, by + 14), outline: true }),
    rect(bx - 11, by - 4, 22, 4, 1, { fill: 'hollow-pale', outline: true }),
    line([bx - 9, by + 4, bx + 9, by + 4], 0.6, { id: 'hollow-dark', alpha: 0.6 }),
    // The rope tied off to the scaffold, swaying with it.
    path(`M ${px - 30} ${py} Q ${px - 18 + Math.sin(a) * 20} ${py + 30} ${bx - 8} ${by + 6}`, { stroke: { color: 'straw-dark', width: 0.8 } }),
  ];
};

// The Aqueduct Head: 110 × 170 on a 3-tile cliff, above the Broken Aqueduct.
const AQUEDUCT_HEAD: Shape[] = [
  shade(54, 8),
  ...quarryFace(-50, 50, -30),
  // Three stepped stages, each lit on its top and left.
  rect(-44, -76, 88, 48, 2, { fill: QUARRY(-44, -76, 44, -28), outline: true }),
  rect(-46, -80, 92, 6, 2, { fill: g(0, -80, 0, -74, [[0, 'hollow-pale'], [1, 'hollow-light']]), outline: true }),
  rect(-34, -122, 68, 44, 2, { fill: QUARRY(-34, -122, 34, -78), outline: true }),
  rect(-36, -126, 72, 6, 2, { fill: g(0, -126, 0, -120, [[0, 'hollow-pale'], [1, 'hollow-light']]), outline: true }),
  path('M -24 -122 L -24 -156 L -16 -162 L -10 -156 L -2 -166 L 8 -158 L 16 -164 L 24 -154 L 24 -122 Z', { fill: QUARRY(-24, -166, 24, -122), outline: true }),
  // Arched openings, dark.
  ...[-28, 28].map((x) => path(`M ${x - 7} -32 L ${x - 7} -56 Q ${x} -64 ${x + 7} -56 L ${x + 7} -32 Z`, { fill: g(x, -64, x, -32, [[0, 'ink'], [1, 'hollow-dark']]), outline: true })),
  ...[-20, 20].map((x) => path(`M ${x - 5} -84 L ${x - 5} -102 Q ${x} -108 ${x + 5} -102 L ${x + 5} -84 Z`, { fill: 'ink', outline: true })),
  // The dry spillway: a channel down the middle of every stage, cascade lips stepping down, rust streaks either side.
  rect(-8, -160, 16, 160, 1, { fill: g(-8, 0, 8, 0, [[0, 'hollow-dark'], [0.5, 'iron-dark'], [1, 'hollow-dark']]), outline: true }),
  ...[-150, -124, -100, -78, -54, -30].map((y) => rect(-10, y, 20, 3, 1, { fill: 'hollow-light', outline: true })),
  ...[-12, 12].map((x) => path(`M ${x} -150 Q ${x + 2} -100 ${x - 1} -40 L ${x + 2} -40 Q ${x + 4} -100 ${x + 2} -150 Z`, { fill: { id: 'iron-rust', alpha: 0.55 } })),
  rim([-42, -30, -43, -76], 0.35),
  rim([-32, -80, -33, -120], 0.35),
  // The channel stub where the aqueduct came off, pointing south over the cliff's lip.
  path('M -8 -6 L 8 -6 L 12 2 L -12 2 Z', { fill: QUARRY(-12, -6, 12, 2), outline: true }),
  rect(-5, -6, 10, 6, 1, flat('iron-dark')),
  ellipse(-38, -80, 6, 2, flat({ id: 'moss-tuft', alpha: 0.7 })),
];

// The Great Crane: 120 × 180 on a 4-tile cliff run.
const CRANE: Shape[] = [
  shade(62, 9),
  ...quarryFace(-62, 62, -32),
  // Its foot: a timber platform bolted to the cliff, the winch drum and the counterweight.
  rect(-46, -42, 70, 10, 1.5, { fill: TIMBER(-46, -42, 24, -32), outline: true }),
  ...[-40, -24, -8, 8].map((x) => line([x, -42, x, -32], 0.6, 'wood-dark')),
  rect(-58, -74, 22, 30, 2, { fill: QUARRY(-58, -74, -36, -44), outline: true }),
  ...[-66, -58, -50].map((y) => line([-56, y, -38, y], 0.6, { id: 'hollow-dark', alpha: 0.6 })),
  ellipse(-16, -50, 8, 8, { fill: TIMBER(-24, -58, -8, -42), outline: true }),
  ellipse(-16, -50, 3, 3, { fill: 'brass', outline: true }),
  // The A-frame mast, brass-bound, braced.
  ...pole(-34, -42, -10, -158, 4, [0.25, 0.55, 0.85]),
  ...pole(14, -42, -8, -158, 4, [0.25, 0.55, 0.85]),
  ...pole(-28, -84, 6, -84, 2.4),
  ...pole(-22, -120, 0, -120, 2.4),
  line([-30, -80, 4, -124], 1.6, 'wood-dark'),
  rect(-14, -164, 12, 10, 2, { fill: 'brass', outline: true }),
  // The jib leaning out over the drop, stayed back to the counterweight.
  ...pole(-12, -150, 50, -176, 4, [0.4, 0.8]),
  line([-48, -74, -8, -162, 48, -174], 0.8, 'straw-dark'),
  ellipse(50, -175, 3.2, 3.2, { fill: 'brass', outline: true }),
  line([-16, -50, 46, -174], 0.7, 'straw-dark'),
];

/** The crane's chain and its block cradle hanging over the footprint, swaying (frame 0..3). */
const craneCradle = (f: number): Shape[] => {
  const a = ([-4, 0, 4, 0][f] ?? 0) * (Math.PI / 180);
  const px = 50;
  const py = -173;
  const len = 104;
  const cx = px + Math.sin(a) * len;
  const cy = py + Math.cos(a) * len;
  const links = 9;
  return [
    ...Array.from({ length: links }, (_, i) => {
      const k = (i + 0.5) / links;
      return ellipse(px + (cx - px) * k, py + (cy - py) * k, 1.1, 2, { stroke: { color: i % 2 ? 'iron-light' : 'iron', width: 0.7 } });
    }),
    // The cradle: a brass-bound frame of timber holding a cut block.
    line([cx, cy, cx - 12, cy + 8], 0.8, 'iron'),
    line([cx, cy, cx + 12, cy + 8], 0.8, 'iron'),
    rect(cx - 13, cy + 8, 26, 4, 1, { fill: TIMBER(cx - 13, cy + 8, cx + 13, cy + 12), outline: true }),
    rect(cx - 10, cy + 12, 20, 14, 1.5, { fill: g(cx - 10, cy + 12, cx + 10, cy + 26, [[0, 'hollow-pale'], [0.4, 'hollow-light'], [1, 'hollow']]), outline: true }),
    rect(cx - 13, cy + 26, 26, 3, 1, { fill: TIMBER(cx - 13, cy + 26, cx + 13, cy + 29), outline: true }),
    line([cx - 12, cy + 10, cx - 12, cy + 27], 1, 'brass'),
    line([cx + 12, cy + 10, cx + 12, cy + 27], 1, 'brass'),
  ];
};

/** The Hollows' set pieces, for the vector catalog. */
export const HOLLOWS_SET_PIECES: readonly VectorSprite[] = [
  one(SET_PIECE_FRAMES['unfinished-giant'].base, [224, 136], [112, 132], GIANT),
  { key: 'setpiece-unfinished-giant-loop', size: [224, 136], anchor: [112, 132], frames: [0, 1, 2, 3].map(giantBlock) },
  one(SET_PIECE_FRAMES['aqueduct-head'].base, [116, 176], [58, 172], AQUEDUCT_HEAD),
  one(SET_PIECE_FRAMES['great-crane'].base, [132, 186], [66, 182], CRANE),
  { key: 'setpiece-great-crane-loop', size: [132, 186], anchor: [66, 182], frames: [0, 1, 2, 3].map(craneCradle) },
];
