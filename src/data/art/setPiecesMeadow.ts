import { SET_PIECE_FRAMES } from '../worldArtAssets';
import { leaf, one } from './decorParts';
import { ellipse, flat, line, path, rect, type Ink, type Shape, type VectorSprite } from './types';

// 077: Region 1's set pieces, in the pushed vector style (soft gradients lit from the top left, a rim light, the ink
// outline): the Fallen Colossus, a hooded builder toppled among a grove's trees, the dim rune of its face an echo of
// the wanderer; the Ley Tower, broken, a cracked ley crystal still caught in its crown; and the Watcher, a hooded
// builder standing on a grove's edge, hands folded on a staff with a dead crystal. Anchored at the bottom centre of
// each footprint (src/data/setPieces.ts); every base fills its footprint's bottom row.

const rim = (pts: readonly number[], a = 0.45): Shape => line(pts, 0.8, { id: 'snow', alpha: a });
const g = (x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, Ink])[]) => ({ linear: [x0, y0, x1, y1] as const, stops: stops.map(([at, color]) => ({ at, color })) });
const STONE = (x0: number, y0: number, x1: number, y1: number) => g(x0, y0, x1, y1, [[0, 'rock-pale'], [0.3, 'rock-light'], [0.7, 'rock'], [1, 'rock-dark']]);
const glowRune = (pts: readonly number[], w = 1.2): Shape => ({ ...line(pts, w, 'cyan'), glow: { color: 'cyan', blur: 4 } });
const shade = (rx: number, ry: number, y = -2): Shape => ellipse(0, y, rx, ry, { fill: { id: 'ground-shade', alpha: 0.32 } });

/** Loose stones at a piece's foot. */
const rubble = (list: readonly (readonly [number, number, number])[]): Shape[] =>
  list.flatMap(([x, y, r]) => [ellipse(x, y, r, r * 0.7, { fill: STONE(x - r, y - r, x + r, y + r), outline: true }), ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, flat({ id: 'snow', alpha: 0.35 }))]);

/** Moss over stone: a soft patch with a lit edge. */
const moss = (x: number, y: number, rx: number, ry: number): Shape[] => [ellipse(x, y, rx, ry, { fill: g(x, y - ry, x, y + ry, [[0, 'grass-light'], [0.4, 'moss-tuft'], [1, 'leaf-dark']]) }), ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.4, ry * 0.3, flat({ id: 'leaf-pale', alpha: 0.5 }))];

// The Fallen Colossus: 120 × 80, lying along its footprint, head to the west.
const COLOSSUS: Shape[] = [
  shade(60, 9),
  // The robe's long body, lying on its side, its folds running along it.
  path('M -28 -4 Q -34 -26 -22 -44 Q -6 -58 16 -52 Q 34 -46 40 -30 Q 44 -14 38 -4 Z', { fill: STONE(-28, -58, 40, -4), outline: true }),
  path('M -20 -42 Q -4 -52 16 -48', { stroke: { color: 'rock-dark', width: 0.9 } }),
  path('M -24 -30 Q -2 -40 30 -34', { stroke: { color: 'rock-dark', width: 0.9 } }),
  path('M -26 -16 Q 0 -24 36 -18', { stroke: { color: 'rock-dark', width: 0.9 } }),
  path('M 2 -4 Q 6 -20 22 -30', { stroke: { color: { id: 'rock-dark', alpha: 0.7 }, width: 0.8 } }),
  rim([-22, -44, -6, -55, 14, -51]),
  // A crack through the body.
  path('M 8 -52 L 10 -42 L 6 -34 L 9 -24', { stroke: { color: 'rock-dark', width: 1.1 } }),
  // The shoulder rising, and the reaching arm along the ground to an open stone hand.
  ellipse(-12, -48, 13, 10, { fill: STONE(-25, -58, 1, -38), outline: true }),
  line([18, -26, 44, -12], 10, 'rock', true),
  line([18, -29, 43, -15.5], 2.4, { id: 'rock-light', alpha: 0.9 }),
  line([44, -12, 48, -8], 9, 'rock', true),
  ellipse(52, -9, 7, 5, { fill: STONE(45, -14, 59, -4), outline: true }),
  ...[[52, -13, 55, -19], [55, -12, 60, -16], [57, -9, 62, -10], [56, -6, 61, -4]].map(([x0 = 0, y0 = 0, x1 = 0, y1 = 0]) => line([x0, y0, x1, y1], 2.6, 'rock-light', true)),
  line([47, -12, 46, -18], 2.6, 'rock-light', true),
  // A sash across the robe, and its hem at the east end, the feet's edge showing under it.
  path('M -6 -54 Q -2 -30 -8 -6', { stroke: { color: 'rock-dark', width: 3 } }),
  path('M -6 -54 Q -2 -30 -8 -6', { stroke: { color: 'rock-light', width: 1 } }),
  path('M 36 -40 Q 44 -30 40 -6 L 34 -6 Q 38 -26 32 -38 Z', { fill: STONE(32, -40, 44, -6), outline: true }),
  // The head on its side: the hood's shell (its peak falling to the west), its face a dark hollow with a dim rune where the face would be.
  path('M -44 -42 Q -64 -46 -66 -30 Q -60 -34 -52 -24 Z', { fill: STONE(-66, -46, -44, -24), outline: true }),
  ellipse(-38, -28, 19, 17, { fill: STONE(-57, -45, -19, -11), outline: true }),
  path('M -50 -18 Q -52 -36 -38 -42 Q -26 -40 -24 -28', { stroke: { color: 'rock-dark', width: 1 } }),
  ellipse(-35, -27, 13, 14, { fill: STONE(-48, -41, -22, -13), outline: true }),
  ellipse(-35, -27, 10, 11, { fill: g(-45, -38, -25, -16, [[0, 'ink'], [1, 'rock-dark']]), outline: true }),
  glowRune([-38, -32, -34, -26, -30, -32]),
  { ...ellipse(-34, -29, 2.4, 2.4, flat({ id: 'cyan-glow', alpha: 0.5 })), glow: { color: 'cyan', blur: 5 } },
  rim([-53, -34, -46, -43, -36, -45]),
  // Moss and ivy over it, grass grown up round it, stones fallen from it.
  ...moss(-42, -43, 9, 3.5),
  ...moss(4, -54, 11, 3.5),
  ...moss(30, -42, 6, 2.5),
  ...leaf(-22, -6, -16, -12, 1.6, 'leaf', 'leaf-dark'),
  ...leaf(-20, -4, -26, -10, 1.6, 'leaf-dark'),
  ...leaf(28, -4, 34, -9, 1.5, 'leaf'),
  ...rubble([[-56, -4, 4], [-48, -2, 2.5], [42, -2, 3], [60, -3, 2.4]]),
];

/** The ivy hanging over the Colossus's shoulder, its root at the anchor: it sways like a tree's leaves. */
const COLOSSUS_IVY: Shape[] = [
  line([0, 0, -3, 8, -1, 16, -4, 24], 1.1, 'leaf-dark'),
  line([0, 0, 4, 7, 6, 14], 1.1, 'leaf-dark'),
  ...[[-3, 6], [-1, 12], [-3, 19], [-4, 24], [4, 6], [6, 12], [5, 15]].flatMap(([x = 0, y = 0], i) => leaf(x, y, x + (i % 2 ? 4 : -4), y + 3, 1.7, i % 3 === 0 ? 'leaf-light' : 'leaf', undefined, false)),
  ...moss(1, 0, 6, 2),
];

// The Ley Tower: 70 × 190 on a 64 px footprint, round, broken off at the top with its crystal in the break.
const TOWER_BODY = g(-24, 0, 24, 0, [[0, 'rock-light'], [0.35, 'rock'], [0.8, 'rock-dark'], [1, 'rock-dark']]);
const LEY_TOWER: Shape[] = [
  shade(36, 8),
  // Its plinth and the fallen stones of its top.
  rect(-32, -16, 64, 16, 3, { fill: STONE(-32, -16, 32, 0), outline: true }),
  rect(-32, -18, 64, 6, 3, { fill: g(0, -18, 0, -12, [[0, 'rock-pale'], [1, 'rock-light']]), outline: true }),
  // The tower: a stone drum, its top snapped into a jagged break.
  path('M -24 -14 L -24 -146 L -18 -152 L -12 -146 L -6 -158 L 2 -150 L 8 -160 L 14 -150 L 19 -154 L 24 -144 L 24 -14 Z', { fill: TOWER_BODY, outline: true }),
  // Courses and joints, curving round it.
  ...[-34, -54, -74, -94, -114, -134].flatMap((y, i) => [path(`M -24 ${y} Q 0 ${y + 4} 24 ${y}`, { stroke: { color: { id: 'rock-dark', alpha: 0.65 }, width: 0.8 } }), line([i % 2 ? -10 : 6, y + 2, i % 2 ? -10 : 6, y + 20], 0.7, { id: 'rock-dark', alpha: 0.5 })]),
  line([-22, -140, -22, -18], 1.2, { id: 'snow', alpha: 0.35 }),
  // A ley rune course down its face, dim, and an arrow slit.
  glowRune([-5, -88, 0, -82, 5, -88], 1),
  glowRune([-4, -70, 4, -70, 0, -62, 0, -76], 1),
  glowRune([-5, -44, -1, -52, 3, -44, 6, -50], 1),
  rect(-3, -126, 6, 14, 2, { fill: 'ink', outline: true }),
  // The brass collar.
  rect(-26, -104, 52, 8, 2, { fill: g(0, -104, 0, -96, [[0, 'brass-light'], [0.4, 'brass'], [1, 'brass-dark']]), outline: true }),
  ...[-18, -6, 6, 18].map((x) => ellipse(x, -100, 1.1, 1.1, flat('brass-dark'))),
  // The hollow inside its broken top, and the crystal caught in the break, cracked and still glowing.
  ellipse(1, -150, 18, 5, { fill: g(0, -155, 0, -145, [[0, 'ink'], [1, 'rock-dark']]) }),
  { ...ellipse(2, -168, 14, 18, { fill: { id: 'cyan', alpha: 0.18 } }), glow: { color: 'cyan-glow', blur: 14 } },
  path('M -6 -150 L -9 -168 L 1 -188 L 11 -170 L 9 -152 Z', { fill: g(-9, -188, 11, -150, [[0, 'cyan-glow'], [0.45, 'cyan'], [1, 'cyan-deep']]), outline: true, glow: { color: 'cyan', blur: 6 } }),
  path('M 1 -188 L 3 -170 L 11 -170 Z', flat({ id: 'cyan-glow', alpha: 0.9 })),
  path('M -4 -174 L 1 -166 L -1 -160 L 4 -154', { stroke: { color: 'cyan-deep', width: 0.9 } }),
  // Ivy climbing it, moss on its plinth, stones round its foot.
  line([-20, -16, -16, -40, -21, -62, -15, -86], 1, 'leaf-dark', true),
  ...[[-17, -30], [-19, -46], [-17, -58], [-20, -70], [-16, -82]].flatMap(([x = 0, y = 0], i) => leaf(x, y, x + (i % 2 ? 5 : -4), y - 3, 1.6, i % 2 ? 'leaf' : 'leaf-dark', 'leaf-dark')),
  ...moss(-20, -17, 9, 2.6),
  ...rubble([[-38, -4, 4.5], [36, -3, 4], [30, -8, 2.6], [-28, -2, 2.4]]),
];

// The Watcher: 64 × 170, a hooded builder standing, hands folded on a staff topped with a dead crystal.
const ROBE = g(-24, -120, 24, -16, [[0, 'rock-pale'], [0.3, 'rock-light'], [0.75, 'rock'], [1, 'rock-dark']]);
const WATCHER: Shape[] = [
  shade(34, 8),
  rect(-30, -16, 60, 16, 3, { fill: STONE(-30, -16, 30, 0), outline: true }),
  rect(-30, -18, 60, 6, 3, { fill: g(0, -18, 0, -12, [[0, 'rock-pale'], [1, 'rock-light']]), outline: true }),
  // The robe, wide at the hem, its folds falling.
  path('M -24 -16 Q -22 -70 -16 -114 Q 0 -124 16 -114 Q 22 -70 24 -16 Z', { fill: ROBE, outline: true }),
  ...[-12, -4, 6, 14].map((x) => path(`M ${x * 0.7} -110 Q ${x * 1.1} -64 ${x * 1.3} -18`, { stroke: { color: { id: 'rock-dark', alpha: 0.6 }, width: 0.9 } })),
  rim([-21, -30, -19, -80, -15, -110]),
  // Moss streaking down the robe from its shoulders.
  path('M -14 -112 Q -18 -90 -15 -64 Q -13 -84 -11 -110 Z', flat({ id: 'moss-tuft', alpha: 0.85 })),
  path('M 10 -108 Q 13 -80 11 -50 Q 15 -76 14 -106 Z', flat({ id: 'moss-tuft', alpha: 0.7 })),
  ...moss(-16, -18, 8, 2.4),
  // The shoulders and the hood, its face a dark hollow.
  ellipse(0, -114, 18, 8, { fill: STONE(-18, -122, 18, -106), outline: true }),
  path('M -14 -114 Q -17 -136 -6 -146 Q 0 -150 6 -146 Q 17 -136 14 -114 Q 0 -108 -14 -114 Z', { fill: STONE(-17, -150, 17, -108), outline: true }),
  path('M -8 -118 Q -9 -134 0 -138 Q 9 -134 8 -118 Q 0 -114 -8 -118 Z', { fill: g(0, -138, 0, -114, [[0, 'ink'], [1, 'rock-dark']]), outline: true }),
  rim([-12, -122, -13, -136, -4, -148]),
  // The staff at its side, its dead crystal beside the hood, and the hands folded over it at the chest.
  rect(10, -152, 4, 136, 1.5, { fill: g(10, 0, 14, 0, [[0, 'rock-light'], [1, 'rock-dark']]), outline: true }),
  path('M 6 -156 L 9 -170 L 13 -176 L 17 -166 L 18 -156 L 12 -150 Z', { fill: g(6, -176, 18, -150, [[0, 'dormant'], [1, 'dormant-dark']]), outline: true }),
  path('M 9 -170 L 13 -176 L 13 -152 L 6 -156 Z', flat({ id: 'snow', alpha: 0.18 })),
  line([12, -170, 10.5, -154], 0.6, { id: 'snow', alpha: 0.45 }),
  rect(8, -156, 8, 4, 1, { fill: 'rock', outline: true }),
  path('M -10 -104 Q 0 -96 14 -98 L 16 -90 Q 2 -86 -10 -94 Z', { fill: STONE(-10, -104, 16, -86), outline: true }),
  ellipse(13, -95, 5, 4, { fill: STONE(8, -99, 18, -91), outline: true }),
  line([10, -97, 16, -96], 0.6, 'rock-dark'),
  ...rubble([[-36, -3, 3.5], [34, -4, 3], [28, -2, 2]]),
];

/** Region 1's set pieces, for the vector catalog. */
export const MEADOW_SET_PIECES: readonly VectorSprite[] = [
  one(SET_PIECE_FRAMES['fallen-colossus'].base, [136, 90], [68, 84], COLOSSUS),
  one(SET_PIECE_FRAMES['fallen-colossus'].sway, [24, 34], [12, 4], COLOSSUS_IVY),
  one(SET_PIECE_FRAMES['ley-tower'].base, [80, 196], [40, 192], LEY_TOWER),
  one(SET_PIECE_FRAMES.watcher.base, [76, 186], [38, 182], WATCHER),
];
