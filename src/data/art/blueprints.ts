import { BLUEPRINT_SPRITES } from '../blueprintAssets';
import { ellipse, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// Blueprints' art (063), in the 020 vector style: the build bar's Tools emblems (the Area tool's dashed cyan box and
// pointer, the Blueprints list's rolled ley-drawn sheet). 16x16 icons round their middle.

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

/** A cyan stroke with a soft glow, the player's colour. */
const glow = (pts: readonly number[], width = 1.2): Shape => ({ ...line(pts, width, 'cyan-glow'), glow: { color: 'cyan', blur: 2 } });

/** The Area tool: a dashed cyan box over two little stone tiles, its corner brackets bright, and a brass pointer. */
const AREA: Shape[] = [
  rect(-5.6, -4.4, 4.6, 4.6, 0.8, solid('rock-light')),
  rect(-0.4, -4.4, 4.6, 4.6, 0.8, solid('rock-light')),
  rect(-6.6, -6.6, 12.4, 12.4, 1, { stroke: { color: 'cyan', width: 0.9, dash: [1.6, 1.2] }, fill: { id: 'cyan', alpha: 0.18 } }),
  glow([-6.6, -3.4, -6.6, -6.6, -3.4, -6.6]),
  glow([2.6, -6.6, 5.8, -6.6, 5.8, -3.4]),
  glow([-6.6, 2.6, -6.6, 5.8, -3.4, 5.8]),
  path('M 3 3 L 7.4 5 L 5.4 5.6 L 6.8 7.6 L 6 8.2 L 4.6 6.2 L 3.4 7.6 Z', { fill: 'brass-light', outline: true }),
];

/** Blueprints: a rolled sheet of deep-blue vellum, its ley drawing in cyan, curling at both ends, a brass clasp. */
const LIST: Shape[] = [
  rect(-5.6, -5.4, 11.2, 10.8, 1, { fill: { linear: [0, -5, 0, 5], stops: [{ at: 0, color: 'water-deep' }, { at: 1, color: 'cyan-deep' }] }, outline: true }),
  ...[-5.6, 5.6].map((x) => ellipse(x, 0, 1.6, 6, { fill: { linear: [x - 1.6, 0, x + 1.6, 0], stops: [{ at: 0, color: 'water-light' }, { at: 1, color: 'water-deep' }] }, outline: true })),
  glow([-3.4, -2.8, 3, -2.8], 0.7),
  glow([-3.4, -2.8, -3.4, 2.6, 2.4, 2.6], 0.7),
  rect(-1.2, -1.2, 3, 2.2, 0.4, trim('cyan-glow', 0.6)),
  rect(-1.2, 3.6, 2.4, 2.2, 0.5, solid('brass')),
];

export const BLUEPRINT_SPRITES_VECTOR: readonly VectorSprite[] = [icon(BLUEPRINT_SPRITES.areaEmblem, AREA), icon(BLUEPRINT_SPRITES.listEmblem, LIST)];
