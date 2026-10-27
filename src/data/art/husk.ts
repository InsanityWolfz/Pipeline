import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { big, litPath, mossTuft, runeDisc, tone } from './enemyLook';
import { ellipse, flat, line, path, rect, solid } from './types';

// The Husk (016): a hunched bundle of straw bound with leather, stick arms with claws, and two ember eyes under a
// straw hood. Amber resin (018) oozes where the bindings pinch the straw: what it drops as husk resin.
// 076: the Mossbound ruins look: the straw shaded from the top left with a warm rim, moss creeping over the hood and
// shoulders, and a carved ruin-stone rune disc hanging from the upper binding. Wind-ups gather, coil and peak.

const STRAW = tone('straw-dark', 'straw', 'straw-light');
const HOOD = tone('straw-dark', 'straw-dark', 'straw');
const STICK = 'wood-dark';

const eye = (id: string, x: number): EnemyPart => ({
  id,
  role: 'glow',
  follows: 'head',
  pivot: [x, -33],
  shapes: [ellipse(x, -33, 1.7, 1.7, { fill: 'cinder', glow: { color: 'cinder', blur: 4 } }), ellipse(x - 0.4, -33.4, 0.6, 0.6, { fill: 'cinder-light' })],
});

/** A stick arm from the shoulder to a three-fingered claw. */
const arm = (id: string, role: 'arm-back' | 'arm-front', from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => {
  const dir = to[0] > from[0] ? 1 : -1;
  return {
    id,
    role,
    mirror,
    pivot: from,
    shapes: [
      line([from[0], from[1], to[0], to[1]], 2.3, STICK, true),
      line([from[0] + dir * 0.3, from[1] - 0.4, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 0.4], 0.7, 'wood-light'),
      // The claw: three curled talons.
      line([to[0], to[1], to[0] + dir * 3.4, to[1] - 1.6], 1.5, STICK, true),
      line([to[0], to[1], to[0] + dir * 3.2, to[1] + 0.8], 1.4, STICK, true),
      line([to[0], to[1], to[0] + dir * 1.2, to[1] + 2.6], 1.3, STICK, true),
    ],
  };
};

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number): EnemyPart => ({
  id,
  role,
  pivot: [x, -9],
  shapes: [line([x, -9, x + Math.sign(x), -1], 2.5, STICK, true), line([x + Math.sign(x), -1, x + Math.sign(x) * 2.8, -0.6], 1.6, STICK, true)],
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
  return [ellipse(x, y, 2.4, 1.8, solid('resin')), ellipse(x + 0.4, y + 2.2, 0.9, 1.3, solid('resin-dark')), ellipse(x - 0.6, y - 0.6, 0.8, 0.5, flat('resin-light'))];
}

/** Straw ends poking out past the bindings, so the bundle reads as straw. */
const straws = (side: number): ReturnType<typeof line>[] => [
  line([side * 9.5, -14, side * 12.5, -15.5], 0.8, 'straw-dark'),
  line([side * 10, -22, side * 13, -24.5], 0.8, 'straw-dark'),
  line([side * 8.5, -9, side * 10.5, -7.5], 0.8, 'straw-dark'),
];

/** The straw bundle: shaded body, combed strands, two bindings, the resin, and the rune disc on the upper binding (not from behind). */
const body = (shadeX: number, front: boolean): EnemyPart => ({
  id: 'body',
  role: 'body',
  pivot: [0, -19],
  shapes: [
    ...straws(-1),
    ...straws(1),
    ellipse(0, -19, 11, 14, big(STRAW, [-11, -33, 11, -5], 'ruin')),
    ellipse(shadeX, -17, 4.5, 10.5, { fill: { id: 'straw-dark', alpha: 0.55 } }),
    path('M -6 -30 Q -8 -19 -5 -8 M -1 -32 Q -2 -19 0 -6 M 4 -31 Q 6 -19 4 -7', { stroke: { color: { id: 'straw-dark', alpha: 0.6 }, width: 0.6 } }),
    ellipse(-4, -25, 2.6, 5.5, flat({ id: 'straw-light', alpha: 0.85 })),
    rect(-10.5, -12.4, 21, 2.6, 1, solid({ linear: [0, -12.4, 0, -9.8], stops: [{ at: 0, color: 'strap' }, { at: 1, color: 'leather' }] })),
    rect(-10.5, -24.4, 21, 2.6, 1, solid({ linear: [0, -24.4, 0, -21.8], stops: [{ at: 0, color: 'strap' }, { at: 1, color: 'leather' }] })),
    ...resin(RESIN.blob[0], RESIN.blob[1]),
    ...resin(-5, -22.6),
    // Moss creeping over the shoulders.
    ...mossTuft(-11, -4, -29.5, 2.4),
    ...mossTuft(5, 10.5, -28.5, 2),
    ...(front ? [line([1.5, -22, 1.5, -18.5], 0.6, 'leather-dark'), ...runeDisc(1.5, -16.4, 2.5)] : []),
  ],
});

const HOOD_D = 'M -10 -31 Q -6 -45 0 -47 Q 6 -45 10 -31 Q 0 -25.5 -10 -31 Z';
const HOOD_SIDE_D = 'M -9 -32 Q -4 -45 3 -47 Q 9 -44 11 -32 Q 1 -26 -9 -32 Z';

const hood = (front: boolean): EnemyPart => ({
  id: 'hood',
  role: 'head',
  pivot: [0, -32],
  shapes: [
    litPath(HOOD_D, HOOD, 'ruin'),
    ...(front ? [ellipse(0, -32.2, 6.4, 3.6, { fill: { radial: [0, -32, 6.4], stops: [{ at: 0, color: 'leather-dark' }, { at: 1, color: 'wood-dark' }] } })] : [path('M -4 -42 Q 0 -36 0 -28', { stroke: { color: 'straw', width: 1 } })]),
    path('M -7 -38 Q -3 -45 2 -45.5', { stroke: { color: { id: 'straw-light', alpha: 0.7 }, width: 0.7 } }),
    ...mossTuft(-8, 1, -40.5, 2.6),
  ],
});

const hoodSide: EnemyPart = {
  id: 'hood',
  role: 'head',
  pivot: [1, -32],
  shapes: [
    path(HOOD_SIDE_D, big(HOOD, [-9, -47, 11, -26], 'ruin')),
    ellipse(7, -32.6, 3.6, 3, { fill: { id: 'wood-dark', alpha: 0.85 } }),
    path('M -6 -38 Q -2 -45 3 -45.5', { stroke: { color: { id: 'straw-light', alpha: 0.7 }, width: 0.7 } }),
    ...mossTuft(-7, 2, -41, 2.6),
  ],
};


export const HUSK_RIG: EnemyRigDef = {
  id: 'husk',
  scale: 0.8,
  box: { size: [56, 60], anchor: [28, 48] },
  hip: [0, -10],
  views: {
    side: [leg('leg-back', 'leg-back', -3), arm('arm-back', 'arm-back', [5, -24], [14, -13]), leg('leg-front', 'leg-front', 3), body(4, true), hoodSide, eye('eye-near', 4), eye('eye-far', 8), arm('arm-front', 'arm-front', [-2, -23], [9, -11])],
    down: [leg('leg-back', 'leg-back', -4), leg('leg-front', 'leg-front', 4), arm('arm-back', 'arm-back', [-9, -23], [-15, -11], true), body(4, true), hood(true), eye('eye-left', -3), eye('eye-right', 3), arm('arm-front', 'arm-front', [9, -23], [15, -11])],
    up: [leg('leg-back', 'leg-back', -4), leg('leg-front', 'leg-front', 4), body(-4, false), hood(false), arm('arm-back', 'arm-back', [-9, -23], [-15, -11], true), arm('arm-front', 'arm-front', [9, -23], [15, -11])],
  },
  tells: { windup: { part: 'arm-front', at: { side: [9, -11], down: [15, -11], up: [15, -11] } } },
  poses: {
    idle: [{ bob: 0 }],
    walk: [
      { step: 3, lift: 1, bob: -1, lean: 0.04 },
      { step: 0, bob: 0, armFront: 0.15 },
      { step: -3, lift: 1, bob: -1, lean: 0.04 },
      { step: 0, bob: 0, armBack: 0.15 },
    ],
    // 076: gather (it crouches, the claw low and back), coil (rears far back, the claw high over the hood, the far
    // arm flung back, stretched), peak (the claw cocked further, eyes blazing; render trembles it).
    windup: [
      { squash: 0.12, bob: 1.5, lean: 0.15, armFront: 0.7, armBack: 0.4, head: 0.1, glow: 0.9 },
      { squash: -0.1, bob: -2, lean: -0.42, armFront: -2.5, armBack: -1.1, head: -0.25, headLift: -0.5, step: -1, glow: 1 },
      { squash: -0.14, bob: -2.6, lean: -0.52, armFront: -2.95, armBack: -1.35, head: -0.32, headLift: -0.8, step: -1.5, glow: 1 },
    ],
    // The swipe lunges through, stretched (render adds the release snap).
    swipe: [
      { lean: 0.42, armFront: 1.25, armBack: 0.55, step: 3, shift: 2.5, squash: -0.06, head: 0.15 },
      { lean: 0.3, armFront: 1.6, armBack: 0.6, step: 2, shift: 2, squash: 0.04 },
    ],
    // The hood snaps back and the arms fly up.
    hit: [{ lean: -0.3, bob: 1, armFront: -1.1, armBack: -1.2, head: -0.45, headLift: 0.5, glow: 0.6 }],
    // It reels back off one foot, straw flaring; then finds its feet.
    stagger: [
      { lean: -0.55, bob: -1, armFront: -1.9, armBack: -1.7, head: -0.55, step: -2, lift: 2.5, legFront: -0.55, glow: 0.5 },
      { lean: -0.2, bob: 0.5, armFront: -0.6, armBack: -0.5, head: -0.15, step: 1, squash: 0.06, glow: 0.8 },
    ],
    // Thrown back with the straw bursting at the bindings; the resin stops.
    death: [{ lean: -0.7, bob: -1.5, armFront: -2.3, armBack: -2, head: -0.5, headLift: -0.5, legFront: -0.6, step: -2, lift: 1.5, squash: -0.14, glow: 0.25 }],
  },
};

