import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid } from './types';

// The Husk (016): a hunched bundle of straw bound with leather, stick arms with
// claws, and two ember eyes under a straw hood. From the style test. Amber resin
// (018) oozes where the bindings pinch the straw: what it drops as husk resin.

const eye = (id: string, x: number): EnemyPart => ({
  id,
  role: 'glow',
  pivot: [x, -33],
  shapes: [ellipse(x, -33, 1.6, 1.6, { fill: 'cinder', glow: { color: 'cinder', blur: 4 } })],
});
const arm = (id: string, role: 'arm-back' | 'arm-front', from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 2.2, 'wood-dark', true), line([to[0], to[1], to[0] + (to[0] > from[0] ? 3 : -3), to[1] - 1.5], 1.6, 'wood-dark', true)],
});
const leg = (id: string, role: 'leg-back' | 'leg-front', x: number): EnemyPart => ({
  id,
  role,
  pivot: [x, -9],
  shapes: [line([x, -9, x + Math.sign(x), -1], 2.4, 'wood-dark', true)],
});
const body = (shadeX: number): EnemyPart => ({
  id: 'body',
  role: 'body',
  pivot: [0, -19],
  shapes: [
    ellipse(0, -19, 11, 14, solid('straw')),
    ellipse(shadeX, -18, 5, 11, flat('straw-dark')),
    ellipse(-4, -24, 3, 6, flat('straw-light')),
    rect(-10, -12, 20, 2.4, 1, flat('strap')),
    rect(-10, -24, 20, 2.4, 1, flat('strap')),
    ...resin(RESIN.blob[0], RESIN.blob[1]),
    ...resin(-5, -22.6),
  ],
});

/**
 * Where the resin oozes from the lower binding, and its slow drip and glint (drawn over the baked frames by EnemyView).
 * Rig px from the bead; ms. `phase` stuns each Husk's timing by its id, so they never drip in step.
 */
export const RESIN = {
  enemyId: 'husk',
  blob: [6, -10.6] as const,
  dripMs: 2600,
  fallMs: 700,
  fallPx: 7,
  glintMs: 1700,
  phase: { glint: 311, drip: 977 },
  glint: { at: [-0.6, -0.6] as const, r: 0.6, color: 'snow', alpha: 0.9 },
  drop: { at: [0.4, 2.6] as const, size: [1.4, 2] as const, color: 'resin' },
} as const;

/** A bead of amber resin at a binding, with a hanging drop. */
function resin(x: number, y: number) {
  return [
    ellipse(x, y, 2.4, 1.8, solid('resin')),
    ellipse(x + 0.4, y + 2.2, 0.9, 1.3, solid('resin-dark')),
    ellipse(x - 0.6, y - 0.6, 0.8, 0.5, flat('resin-light')),
  ];
}

const hood = (front: boolean): EnemyPart => ({
  id: 'hood',
  role: 'head',
  pivot: [1, -32],
  shapes: front
    ? [path('M -10 -31 Q 0 -49 10 -31 Q 0 -25 -10 -31 Z', solid('straw-dark')), ellipse(0, -32, 6, 3.5, flat('wood-dark'))]
    : [path('M -10 -31 Q 0 -49 10 -31 Q 0 -25 -10 -31 Z', solid('straw-dark')), path('M -4 -42 Q 0 -36 0 -28', { stroke: { color: 'straw', width: 1 } })],
});

export const HUSK_RIG: EnemyRigDef = {
  id: 'husk',
  scale: 0.8,
  box: { size: [48, 54], anchor: [24, 44] },
  hip: [0, -10],
  views: {
    side: [
      leg('leg-back', 'leg-back', -3),
      arm('arm-back', 'arm-back', [5, -24], [14, -13]),
      leg('leg-front', 'leg-front', 3),
      body(4),
      { id: 'hood', role: 'head', pivot: [1, -32], shapes: [path('M -9 -32 Q 1 -48 11 -32 Q 1 -26 -9 -32 Z', solid('straw-dark'))] },
      eye('eye-near', 4),
      eye('eye-far', 8),
      arm('arm-front', 'arm-front', [-2, -23], [9, -11]),
    ],
    down: [leg('leg-back', 'leg-back', -4), leg('leg-front', 'leg-front', 4), arm('arm-back', 'arm-back', [-9, -23], [-15, -11]), body(4), hood(true), eye('eye-left', -3), eye('eye-right', 3), arm('arm-front', 'arm-front', [9, -23], [15, -11])],
    up: [leg('leg-back', 'leg-back', -4), leg('leg-front', 'leg-front', 4), body(-4), hood(false), arm('arm-back', 'arm-back', [-9, -23], [-15, -11]), arm('arm-front', 'arm-front', [9, -23], [15, -11])],
  },
  poses: {
    idle: [{ bob: 0 }],
    walk: [
      { step: 3, lift: 1, bob: -1 },
      { step: 0, bob: 0, armFront: 0.15 },
      { step: -3, lift: 1, bob: -1 },
      { step: 0, bob: 0, armBack: 0.15 },
    ],
    // The wind-up rears back with the claw raised; the swipe lunges through.
    windup: [{ lean: -0.2, armFront: -1.7, armBack: -0.4, bob: -1, glow: 1 }],
    swipe: [
      { lean: 0.25, armFront: 0.9, armBack: 0.3, step: 2 },
      { lean: 0.18, armFront: 1.4, armBack: 0.4, step: 2 },
    ],
    hit: [{ lean: -0.25, bob: 1, armFront: -0.4, armBack: -0.3 }],
    death: DEATH_POSES,
  },
};
