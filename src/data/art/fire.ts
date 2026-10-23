import { BURN_FLAMES, STAGE_SPRITES } from '../stageAssets';
import { ellipse, path, type Shape, type ShapeStyle, type VectorSprite } from './types';

// 060's Fire art, in the 020 style: the fire tag's badge on a round's icon (a flame on an ember disc), the
// glowing ember head a Fire arrow wears, and the flames that lick round a burning enemy's feet and body (three
// flickering frames, render picks one by time, as the ice over a frozen enemy is picked by its thaw).

/** A tongue of flame standing on (x, y): `h` tall, `w` half-wide at its foot, its tip leaning by `lean`. */
function tongue(x: number, y: number, h: number, w: number, lean: number, alpha = 1): Shape[] {
  return [
    path(`M ${x - w} ${y} Q ${x - w * 1.25} ${y - h * 0.5} ${x + lean} ${y - h} Q ${x + w * 1.1} ${y - h * 0.45} ${x + w} ${y} Z`, {
      fill: { linear: [x, y, x + lean, y - h], stops: [{ at: 0, color: 'flame-dark' }, { at: 0.5, color: 'cinder' }, { at: 1, color: 'cinder-light' }] },
      glow: { color: 'cinder', blur: 3 },
      alpha,
    }),
    path(`M ${x - w * 0.45} ${y} Q ${x - w * 0.5} ${y - h * 0.35} ${x + lean * 0.6} ${y - h * 0.6} Q ${x + w * 0.5} ${y - h * 0.3} ${x + w * 0.45} ${y} Z`, {
      fill: { linear: [x, y, x, y - h * 0.6], stops: [{ at: 0, color: 'cinder' }, { at: 1, color: 'snow' }] },
      alpha: alpha * 0.85,
    }),
  ];
}

/** The fire badge: a flame on an ember disc, centred at (x, 4.2). */
export function flameBadge(x: number): Shape[] {
  return [
    ellipse(x, 4.2, 3.4, 3.4, { fill: 'flame-dark', outline: true }),
    path(`M ${x - 1.7} 6.2 Q ${x - 2.1} 3.8 ${x - 0.2} 1.4 Q ${x + 0.2} 3 ${x + 1} 3.2 Q ${x + 2.2} 4.6 ${x + 1.6} 6.2 Z`, {
      fill: { linear: [x, 6.2, x, 1.4], stops: [{ at: 0, color: 'cinder' }, { at: 1, color: 'cinder-light' }] },
      glow: { color: 'cinder-light', blur: 1.5 },
    }),
  ];
}

/** A Fire arrow's head on its icon: glowing ember. */
export const FIRE_HEAD: ShapeStyle = { fill: 'cinder-light', outline: true, glow: { color: 'cinder', blur: 2 } };

/** One frame of flames round a burning enemy, its feet at (0, 0): tongues at its sides and front, heights by `k`. */
function flames(k: number): Shape[] {
  const flick = (i: number): number => 0.75 + 0.25 * Math.sin((k + i * 0.37) * Math.PI * 2);
  return [
    ellipse(0, -2, 13, 4, { fill: { radial: [0, -2, 13], stops: [{ at: 0, color: { id: 'cinder', alpha: 0.45 } }, { at: 1, color: { id: 'flame-dark', alpha: 0 } }] } }),
    ...tongue(-9, 0, 16 * flick(0), 3.2, -1.5),
    ...tongue(9, 0, 15 * flick(1), 3, 1.8),
    ...tongue(-3.5, -9, 13 * flick(2), 2.6, 1, 0.9),
    ...tongue(4, -14, 11 * flick(3), 2.3, -1.2, 0.85),
    ...tongue(0, 1, 12 * flick(4), 3.4, 0.6),
  ];
}

/** The flames on a burning enemy, `BURN_FLAMES.frames` frames of one flicker. */
export const BURN_FLAMES_VECTOR: VectorSprite = {
  key: STAGE_SPRITES.burnFlames,
  size: [36, 44],
  anchor: [18, 40],
  frames: Array.from({ length: BURN_FLAMES.frames }, (_, i) => flames(i / BURN_FLAMES.frames)),
};

/** 060's Fire talent icons (16×16 round the centre): a flame over an ember bed with a brass ring of time round it. */
export const FIRE_DURATION_ICON: Shape[] = [
  ellipse(0, 0, 6.6, 6.6, { stroke: { color: 'brass', width: 1 }, outline: true }),
  path('M 0 -6.6 L 0 -5', { stroke: { color: 'brass-light', width: 1 } }),
  ellipse(0, 4, 4, 1.4, { fill: 'flame-dark', alpha: 0.8 }),
  ...tongue(0, 4.2, 9, 3, 0.6),
];

/** A flame leaping to two smaller ones at its sides. */
export const FIRE_SPREAD_ICON: Shape[] = [
  ...tongue(-4.6, 5.5, 6, 1.9, -1),
  ...tongue(4.6, 5.5, 6, 1.9, 1),
  ...tongue(0, 4, 10, 2.8, 0.4),
  path('M -2.2 -1.6 Q -4 -3.4 -5 -0.6', { stroke: { color: 'cinder-light', width: 0.7 } }),
  path('M 2.2 -1.6 Q 4 -3.4 5 -0.6', { stroke: { color: 'cinder-light', width: 0.7 } }),
];
