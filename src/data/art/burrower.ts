import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// The Burrower (035, draft for Shaun's review): a segmented quarry-borer of grey-blue
// stone plates on stubby iron claws, a brass drill snout grooved like a screw, and cyan ley
// light leaking between its plates. Underground it shows only as its ripple: a moving
// mound of cracked earth (the sprite below; EnemyView adds the dust).

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 14, 3.5, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** A pair of stubby iron claws. */
const claws = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -6],
  shapes: xs.flatMap((x) => [path(`M ${x - 2} -8 L ${x + 2} -8 L ${x + 3} -1 L ${x - 3} -1 Z`, solid(fill))]),
});

/** A stone body plate, its lit top and a brass rivet. */
const plate = (x: number, y: number, rx: number, ry: number): Shape[] => [
  ellipse(x, y, rx, ry, solid('hollow')),
  ellipse(x - rx * 0.2, y - ry * 0.45, rx * 0.6, ry * 0.3, flat('hollow-pale')),
  ellipse(x, y + ry * 0.35, 1.2, 1.2, flat('brass')),
];

/** The drill snout, pointing along +x side-on: a brass cone with screw grooves and an iron collar. */
const snoutSide: Shape[] = [
  rect(7, -17, 4, 12, 1.2, solid('iron')),
  path('M 10 -18 L 24 -11 L 10 -4 Z', { fill: { linear: [10, -18, 10, -4], stops: [{ at: 0, color: 'brass-light' }, { at: 0.5, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  line([13, -16, 15, -6], 1, 'brass-dark'),
  line([17, -14, 19, -8], 1, 'brass-dark'),
];

/** Ley light between its plates: a glow part. */
const seams = (pts: readonly (readonly [number, number])[]): EnemyPart => ({
  id: 'seams',
  role: 'glow',
  pivot: [0, -10],
  shapes: pts.map(([x, y]) => ({ ...line([x, y - 3, x, y + 3], 1.4, 'vein'), glow: { color: 'cyan', blur: 4 } })),
});

const bodySide: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -10],
  shapes: [...plate(-12, -9, 7, 6), ...plate(-3, -11, 8, 7.5), ...plate(5, -11, 6.5, 7)],
};
const snout: EnemyPart = { id: 'snout', role: 'head', pivot: [10, -11], shapes: snoutSide };
const eye: EnemyPart = { id: 'eye', role: 'glow', pivot: [7, -14], shapes: [ellipse(7, -14, 1.4, 1.4, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } })] };

/** Face-on: its snout's round face, a ring of brass grooves round the drill point, the plates behind. */
const front: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -11],
  shapes: [
    ...plate(0, -13, 10, 8),
    ellipse(0, -10, 7, 7, solid('brass')),
    ellipse(0, -10, 4.5, 4.5, trim('brass-dark', 1)),
    ellipse(0, -10, 1.8, 1.8, solid('brass-light')),
    rect(-10, -9, 3, 2, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } }),
    rect(7, -9, 3, 2, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } }),
  ],
};
/** From behind: the tail plates stacked, tapering. */
const back: EnemyPart = { id: 'body', role: 'body', pivot: [0, -11], shapes: [...plate(0, -12, 10, 8), ...plate(0, -8, 7, 5.5), path('M -2 -4 L 2 -4 L 0 -1 Z', solid('iron'))] };

export const BURROWER_RIG: EnemyRigDef = legacyRig({
  id: 'burrower',
  scale: 1,
  box: { size: [60, 44], anchor: [28, 36] },
  hip: [0, -6],
  views: {
    side: [ground, claws('claws-far', 'leg-back', [-11, 3], 'iron-dark'), bodySide, seams([[-7.5, -10], [1.5, -11]]), snout, eye, claws('claws-near', 'leg-front', [-8, 6], 'iron')],
    down: [ground, claws('claws-far', 'leg-back', [-8, 8], 'iron-dark'), front, claws('claws-near', 'leg-front', [-5, 5], 'iron')],
    up: [ground, claws('claws-near', 'leg-front', [-8, 8], 'iron'), claws('claws-far', 'leg-back', [-5, 5], 'iron-dark'), back, seams([[-5, -12], [5, -12]])],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.5 }],
    walk: [
      { step: 2, lift: 1, bob: -0.5, glow: 0.5 },
      { step: 0, bob: 0.5, scaleY: 0.96, glow: 0.5 },
      { step: -2, lift: 1, bob: -0.5, glow: 0.5 },
      { step: 0, bob: 0.5, scaleY: 0.96, glow: 0.5 },
    ],
    // Nose-down, drilling: sinking into the ground (its wind-up is spent underground, so it shares this).
    dig: [
      { lean: 0.5, sink: 4, scaleY: 0.85, glow: 0.9 },
      { lean: 0.6, sink: 7, scaleY: 0.75, glow: 1 },
    ],
    windup: [{ lean: 0.5, sink: 6, scaleY: 0.8, glow: 1 }],
    // The eruption: bursting up, snout high.
    swipe: [
      { lean: -0.55, bob: -8, glow: 1 },
      { lean: -0.35, bob: -4, glow: 1 },
    ],
    // Dazed on the surface: slumped flat, its light low.
    recover: [{ lean: 0.1, sink: 2, scaleY: 0.86, tilt: 0.12, glow: 0.15 }],
    hit: [{ lean: -0.15, bob: 1, glow: 0.5 }],
  },
});

/** The ripple underground: a mound of cracked earth with pebbles, two frames that EnemyView alternates as it moves. */
const mound = (shift: number): Shape[] => [
  ellipse(0, -3, 17, 6, { fill: { id: 'ground-shade', alpha: 0.4 } }),
  path(`M -16 -2 Q -8 ${-13 - shift} 0 -12 Q 9 ${-13 + shift} 16 -2 Z`, solid('hollow')),
  path(`M -11 -5 Q -4 ${-12 - shift} 3 -11`, flat('hollow-light')),
  path('M -5 -11 L -1 -7 L -4 -3', trim('hollow-dark', 1.4)),
  path('M 5 -11 L 2 -7 L 6 -3', trim('hollow-dark', 1.4)),
  path('M -10 -6 L -7 -4', trim('hollow-dark', 1.2)),
  ellipse(-13 + shift, -1, 2, 1.5, solid('hollow-light')),
  ellipse(12 - shift, -1.5, 1.7, 1.3, solid('hollow-pale')),
  ellipse(2, 0, 1.4, 1, solid('hollow-dark')),
];

export const BURROWER_SPRITES_VECTOR: readonly VectorSprite[] = [{ key: 'burrower-ripple', size: [40, 22], anchor: [20, 17], frames: [mound(0), mound(1.5)] }];
