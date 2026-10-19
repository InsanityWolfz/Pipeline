import { SPRING_SPRITES } from '../springAssets';
import { ellipse, flat, line, path, type Shape, type VectorSprite } from './types';

// The Ley Spring (030) in the 020 style: a low ring of rune-carved stones round a pool
// of glowing ley-cyan water, seen from three-quarter top-down. The pool's radius is
// the sim's (48 px); the stones sit just outside it. Flat on the ground: feet, enemies
// and shots cross it. Light comes from the top left.

const POOL = 46;
const RIM = 52;
const STONES = 16;

/** One rim stone: a low block on the ring between two angles, its top lit and its front face in shade. */
function stone(i: number): Shape[] {
  const a0 = (i / STONES) * Math.PI * 2 + 0.05;
  const a1 = ((i + 1) / STONES) * Math.PI * 2 - 0.05;
  const am = (a0 + a1) / 2;
  const pt = (a: number, r: number, dy = 0) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r + dy).toFixed(2)}`;
  const inner = RIM - 5;
  const outer = RIM + 4;
  const top = `M ${pt(a0, inner)} Q ${pt(am, inner + 0.5)} ${pt(a1, inner)} L ${pt(a1, outer)} Q ${pt(am, outer + 0.8)} ${pt(a0, outer)} Z`;
  const front = `M ${pt(a0, outer)} Q ${pt(am, outer + 0.8)} ${pt(a1, outer)} L ${pt(a1, outer, 3)} Q ${pt(am, outer + 0.8, 3)} ${pt(a0, outer, 3)} Z`;
  // Stones on the top-left catch the light.
  const lit = Math.cos(am - (Math.PI * 5) / 4) > 0.3;
  const shapes: Shape[] = [
    path(front, { fill: 'rock-dark', outline: true }),
    path(top, { fill: lit ? 'rock-light' : 'rock', outline: true }),
  ];
  // Every other stone carries a carved rune, glowing faintly.
  if (i % 2 === 0) {
    const r = (inner + outer) / 2;
    const cx = Math.cos(am) * r;
    const cy = Math.sin(am) * r;
    const tx = -Math.sin(am) * 2.6;
    const ty = Math.cos(am) * 2.6;
    const rx = Math.cos(am) * 2;
    const ry = Math.sin(am) * 2;
    const rune = i % 4 === 0 ? [cx - tx - rx, cy - ty - ry, cx, cy + ry * 0.2, cx + tx - rx, cy + ty - ry] : [cx - tx + rx, cy - ty + ry, cx + tx - rx, cy + ty - ry];
    shapes.push({ ...line(rune, 0.9, 'cyan'), glow: { color: 'cyan', blur: 2 } });
  }
  return shapes;
}

const SPRING: Shape[] = [
  // Damp ground and a soft shade round the rim.
  ellipse(0, 3, RIM + 9, RIM + 8, flat({ id: 'ground-shade', alpha: 0.18 })),
  ellipse(0, 0, RIM + 1, RIM + 1, flat({ id: 'grass-dark', alpha: 0.5 })),
  // The pool: deep at the edge, glowing bright at the heart.
  ellipse(0, 0, POOL + 2, POOL + 2, flat('cyan-deep')),
  ellipse(0, 0, POOL, POOL, {
    fill: { radial: [-6, -8, POOL], stops: [{ at: 0, color: 'cyan-glow' }, { at: 0.45, color: 'cyan' }, { at: 1, color: 'cyan-deep' }] },
    glow: { color: 'cyan', blur: 8 },
  }),
  // Shade under the far (top) rim and a lit sheen near it.
  path(`M ${-POOL} 0 Q ${-POOL} ${-POOL} 0 ${-POOL} Q ${POOL} ${-POOL} ${POOL} 0 Q ${POOL * 0.7} ${-POOL * 0.62} 0 ${-POOL * 0.7} Q ${-POOL * 0.7} ${-POOL * 0.62} ${-POOL} 0 Z`, flat({ id: 'cyan-deep', alpha: 0.45 })),
  ellipse(-14, -18, 12, 4, flat({ id: 'foam', alpha: 0.45 })),
  ellipse(10, 14, 7, 2.2, flat({ id: 'cyan-glow', alpha: 0.5 })),
  ...Array.from({ length: STONES }, (_, i) => stone(i)).flat(),
];

/** A thin ring of light on the water, 10 px across before render scales it. */
const RIPPLE: Shape[] = [ellipse(0, 0, 10, 10, { stroke: { color: 'cyan-glow', width: 1.2 } })];

/** A healing mote: a four-point ley sparkle with a white heart, glowing so it reads on water, grass and stone. */
const MOTE: Shape[] = [
  path('M 0 -4 L 0.9 -0.9 L 4 0 L 0.9 0.9 L 0 4 L -0.9 0.9 L -4 0 L -0.9 -0.9 Z', { fill: 'cyan-glow', glow: { color: 'cyan', blur: 3 } }),
  ellipse(0, 0, 1, 1, flat('snow')),
];

/** The shimmer's ring on the floor (three-quarter view, so flattened), white so render can tint it. */
const RING: Shape[] = [ellipse(0, 0, 18, 9, { stroke: { color: 'snow', width: 2 }, glow: { color: 'snow', blur: 3 } })];

export const SPRING_SPRITES_VECTOR: readonly VectorSprite[] = [
  { key: SPRING_SPRITES.spring, size: [132, 136], anchor: [66, 66], frames: [SPRING] },
  { key: SPRING_SPRITES.ripple, size: [24, 24], anchor: [12, 12], frames: [RIPPLE] },
  { key: SPRING_SPRITES.mote, size: [12, 12], anchor: [6, 6], frames: [MOTE] },
  { key: SPRING_SPRITES.ring, size: [44, 26], anchor: [22, 13], frames: [RING] },
];
