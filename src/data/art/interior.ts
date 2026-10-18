import { SPRITES } from '../assets';
import { PROPS } from '../props';
import { FLOOR_TILES, WALL_SPRITES } from '../roomArt';
import { ellipse, flat, line, path, rect, solid, trim, type Paint, type Shape, type VectorSprite } from './types';

// The foundry interior (020), in the 016 vector style: warm sandstone flagstones,
// one per tile so the build grid lines up with them, some cracked, worn, inlaid
// with a ley rune or set with brass; carved walls with a brass band and a rune
// course, seen in 3/4 view (a top, and a face where floor lies below); the carved
// block, the violet banner and the ember brazier. Walls and floors have no ink
// outline, so they sit behind everything standing on them.

const T = 32;
const vertical = (top: string, bottom: string, y0: number, y1: number): Paint => ({ linear: [0, y0, 0, y1], stops: [{ at: 0, color: top }, { at: 1, color: bottom }] });

/** A flagstone filling a tile, mortar along its top and left edges (its neighbours give the rest), bevelled. */
const FLAG: Shape[] = [
  rect(0, 0, T, T, 0, flat('mortar')),
  rect(1, 1, T - 1, T - 1, 1.6, { fill: { linear: [0, 0, T, T], stops: [{ at: 0, color: 'flag-light' }, { at: 0.55, color: 'flag' }, { at: 1, color: 'flag-dark' }] } }),
  line([2, 1.8, T - 1.5, 1.8], 0.7, { id: 'flag-light', alpha: 0.6 }),
  line([1.8, 2, 1.8, T - 1.5], 0.7, { id: 'flag-light', alpha: 0.45 }),
  line([2, T - 0.6, T - 0.6, T - 0.6], 0.9, { id: 'flag-dark', alpha: 0.8 }),
  ellipse(22, 9, 0.8, 0.5, flat({ id: 'flag-dark', alpha: 0.6 })),
  ellipse(8, 24, 0.6, 0.4, flat({ id: 'flag-dark', alpha: 0.6 })),
];

const CRACK: Shape[] = [path('M 6 4 L 11 11 L 9 16 L 15 22 L 14 28', trim({ id: 'mortar', alpha: 0.55 }, 0.7)), path('M 11 11 L 16 10', trim({ id: 'mortar', alpha: 0.5 }, 0.5))];
const WORN: Shape[] = [ellipse(17, 18, 9, 6, flat({ id: 'flag-light', alpha: 0.25 })), ellipse(25, 5, 1.6, 1, flat('flag-dark')), ellipse(5, 27, 1.2, 0.8, flat('flag-dark'))];
const INLAY: Shape[] = [
  ellipse(16, 16, 8, 8, trim({ id: 'flag-dark', alpha: 0.7 }, 0.8)),
  { ...path('M 13 11 L 18 15 L 14 17 L 19 21', trim('cyan', 0.8)), glow: { color: 'cyan', blur: 3 }, alpha: 0.5 },
];
const BRASS: Shape[] = [rect(9, 15, 14, 2.2, 0.8, { fill: 'brass-dark', alpha: 0.8 }), ...[12, 20].map((x) => ellipse(x, 16.1, 0.7, 0.7, flat({ id: 'brass-light', alpha: 0.8 })))];

const floor = (key: string, extra: readonly Shape[]): VectorSprite => ({ key, size: [T, T], anchor: [0, 0], frames: [[...FLAG, ...extra]] });

/** A wall's top as seen from above: dark carved blocks in two courses. */
const wallTop = (y0: number, brassStud: boolean): Shape[] => [
  rect(0, y0, T, T / 2, 0, flat('carve-dark')),
  line([0, y0 + 8, T, y0 + 8], 0.8, 'mortar'),
  line([12, y0, 12, y0 + 8], 0.8, 'mortar'),
  line([26, y0 + 8, 26, y0 + 16], 0.8, 'mortar'),
  line([1, y0 + 1, T - 1, y0 + 1], 0.6, { id: 'carve', alpha: 0.8 }),
  ...(brassStud ? [ellipse(20, y0 + 4, 1.4, 1.1, solid('brass')), ellipse(5, y0 + 12, 1.4, 1.1, solid('brass'))] : []),
];

/** A wall seen from the floor in front of it: its top, then its carved face with a brass band and a rune course. */
const WALL_FACE: Shape[] = [
  ...wallTop(-48, false),
  rect(0, -32, T, 32, 0, { fill: vertical('carve-light', 'carve', -32, 0) }),
  line([0, -32, T, -32], 1.2, 'carve-light'),
  line([0, -17, T, -17], 0.8, 'mortar'),
  line([10, -32, 10, -26], 0.8, 'mortar'),
  line([22, -17, 22, 0], 0.8, 'mortar'),
  rect(0, -27, T, 3, 0, solid('brass-dark')),
  rect(0, -27, T, 1.2, 0, flat('brass')),
  ...[4, 16, 28].map((x) => ellipse(x, -25.5, 0.9, 0.9, flat('brass-light'))),
  path('M 13 -13 L 16 -10 L 13 -7 M 19 -13 L 16 -10 L 19 -7', trim('carve-dark', 1)),
  rect(0, -2, T, 2, 0, flat({ id: 'mortar', alpha: 0.7 })),
];

/** A carved sandstone block, a ley rune cut in its face. */
const BLOCK: Shape[] = [
  rect(1, -46, 30, 16, 1.6, { fill: vertical('flag-light', 'flag', -46, -30), outline: true }),
  rect(1, -31, 30, 30, 1.6, { fill: vertical('carve-light', 'carve', -31, -1), outline: true }),
  rect(1, -31, 30, 2, 0.4, solid('brass-dark')),
  { ...path('M 13 -22 L 18 -18 L 14 -15 L 19 -10', trim('cyan', 1)), glow: { color: 'cyan', blur: 3 } },
];

/** The violet rune banner hanging from its brass pole, its foot swaying. */
const banner = (sway: number): Shape[] => [
  line([-7, -38, 7, -38], 1.6, 'brass', true),
  path(`M -5.5 -37 L 5.5 -37 L ${5 + sway} -6 L ${sway} -1 L ${-5 + sway} -6 Z`, { fill: vertical('core', 'core-dark', -37, -1), outline: true }),
  path(`M -3 -30 L 3 -30 M ${-2.6 + sway * 0.3} -24 L ${2.6 + sway * 0.3} -24`, trim('gold-trim', 0.8)),
  path(`M ${sway * 0.5} -20 L ${2 + sway * 0.6} -16 L ${sway * 0.7} -12 L ${2 + sway * 0.8} -8`, trim('gold-trim', 0.9)),
];

/** The brazier: an iron bowl on legs, embers, and a flame that flickers through four shapes. */
const FLAMES: readonly (readonly [tip: number, h: number, lean: number])[] = [
  [0, 16, -1],
  [1.5, 18, 1],
  [-1, 15, 0.5],
  [0.5, 19, -0.5],
];
const flameFill = (h: number): Paint => ({ radial: [0, -22, h * 0.8], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.55, color: 'cinder' }, { at: 1, color: 'flame-dark' }] });
const brazier = ([tip, h, lean]: readonly [number, number, number]): Shape[] => [
  ellipse(0, -2, 10, 2.6, { fill: { id: 'ground-shade', alpha: 0.4 } }),
  line([-7, -2, -4, -13], 1.4, 'rock-dark', true),
  line([7, -2, 4, -13], 1.4, 'rock-dark', true),
  line([0, -1, 0, -13], 1.4, 'rock-dark', true),
  path('M -11 -18 Q -10 -11 0 -11 Q 10 -11 11 -18 Z', { fill: vertical('rock', 'rock-dark', -18, -11), outline: true }),
  ellipse(0, -18, 11, 2.6, solid('rock-dark')),
  ellipse(0, -18.4, 9, 1.8, { fill: 'cinder', glow: { color: 'cinder', blur: 4 } }),
  path(`M -7 -19 Q ${-6 + lean} ${-19 - h * 0.6} ${tip} ${-19 - h} Q ${6 + lean} ${-19 - h * 0.6} 7 -19 Z`, { fill: flameFill(h), glow: { color: 'cinder', blur: 5 }, alpha: 0.95 }),
  path(`M -3 -19 Q ${-2 + lean * 0.5} ${-19 - h * 0.4} ${tip * 0.5} ${-19 - h * 0.6} Q ${2 + lean * 0.5} ${-19 - h * 0.4} 3 -19 Z`, flat('cinder-light')),
  rect(-11.5, -19, 23, 1.6, 0.6, solid('brass-dark')),
];

export const INTERIOR_SPRITES_VECTOR: readonly VectorSprite[] = [
  floor(SPRITES.floor, []),
  floor(FLOOR_TILES.cracked, CRACK),
  floor(FLOOR_TILES.worn, WORN),
  floor(FLOOR_TILES.inlay, INLAY),
  floor(FLOOR_TILES.brass, BRASS),
  { key: WALL_SPRITES.top, size: [T, T], anchor: [0, 0], frames: [[...wallTop(0, false), ...wallTop(16, false)]] },
  { key: WALL_SPRITES.topAlt, size: [T, T], anchor: [0, 0], frames: [[...wallTop(0, true), ...wallTop(16, false)]] },
  { key: WALL_SPRITES.edgeSide, size: [3, T], anchor: [0, 0], frames: [[rect(0, 0, 3, T, 0, flat('carve-light')), line([2.6, 0, 2.6, T], 0.6, 'mortar')]] },
  { key: WALL_SPRITES.edgeTop, size: [T, 3], anchor: [0, 0], frames: [[rect(0, 0, T, 3, 0, flat('carve-light')), line([0, 2.6, T, 2.6], 0.6, 'mortar')]] },
  { key: WALL_SPRITES.face, size: [T, 48], anchor: [0, 48], frames: [WALL_FACE] },
  { key: SPRITES.ruinBlock, size: [T, 48], anchor: [0, 48], frames: [BLOCK] },
  { key: PROPS.banner.anim.key, size: [16, 40], anchor: [8, 40], frames: [banner(-0.8), banner(0.8)] },
  { key: PROPS.brazier.anim.key, size: [32, 44], anchor: [16, 44], frames: FLAMES.map(brazier) },
];
