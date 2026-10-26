import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path } from './types';

// The static mite (065, draft for Shaun's review): a tiny spark-beetle of the builders' storm-works, a brass-rimmed
// slate shell split down its back with a cyan seam of charge, six wiry legs and two crackling antennae. Its spark
// (the charge part) swells as it winds up its zap. Light from the top left; world px round the feet.

const CY = -5;
const shell = { linear: [-5, CY - 4, 5, CY + 3] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.5, color: 'storm' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -0.5, 6, 1.6, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** Three wiry legs a side. */
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], color: string): EnemyPart => ({
  id,
  role,
  pivot: [0, -2],
  shapes: xs.map((x) => line([x * 0.5, CY + 1, x, -2.5, x * 1.15, -0.5], 0.9, color, false)),
});

/** The shell: brass-rimmed slate, a cyan seam down its back; its head and antennae ahead (side) or on top (front, back). */
const body = (side: boolean, front: boolean): EnemyPart => ({
  id: 'shell',
  role: 'body',
  pivot: [0, CY],
  shapes: [
    ellipse(0, CY, side ? 6 : 5, 4, { fill: shell, outline: true }),
    side ? line([-5, CY - 1, 4, CY - 3], 0.7, 'vein', false) : line([0, CY - 4, 0, CY + 3], 0.7, 'vein', false),
    path(side ? `M -6 ${CY + 1} Q 0 ${CY + 4.5} 6 ${CY + 1}` : `M -5 ${CY + 1} Q 0 ${CY + 4.5} 5 ${CY + 1}`, { stroke: { color: 'brass', width: 0.9 } }),
    ...(side
      ? [ellipse(6, CY + 0.5, 2.4, 2, { fill: 'iron-dark', outline: true }), line([7, CY - 1, 10, CY - 5, 11.5, CY - 4], 0.6, 'brass-light', false)]
      : [ellipse(0, front ? CY + 3 : CY - 3.5, 2.4, 1.8, { fill: 'iron-dark', outline: true }), line([-1, CY - 3, -3.5, CY - 7.5], 0.6, 'brass-light', false), line([1, CY - 3, 3.5, CY - 7.5], 0.6, 'brass-light', false)]),
    ellipse(-2, CY - 2, 2, 0.8, { fill: { id: 'storm-pale', alpha: 0.7 } }),
  ],
});

/** Its eyes and antenna tips: a glow part, sparking as it winds up. */
const eyes = (side: boolean): EnemyPart => ({
  id: 'eyes',
  role: 'glow',
  pivot: [0, CY],
  shapes: side
    ? [ellipse(7, CY, 0.7, 0.7, { fill: 'cyan', glow: { color: 'cyan', blur: 2 } }), ellipse(11.5, CY - 4, 0.8, 0.8, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 3 } })]
    : [ellipse(-3.5, CY - 7.5, 0.8, 0.8, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 3 } }), ellipse(3.5, CY - 7.5, 0.8, 0.8, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 3 } })],
});

/** Its spark: a ball of charge over its back, grown by the pose's `charge` as it winds up its zap. */
const spark: EnemyPart = {
  id: 'spark',
  role: 'charge',
  pivot: [0, CY - 3],
  shapes: [ellipse(0, CY - 3, 4, 4, { fill: { radial: [0, CY - 3, 4], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'cyan-glow' }, { at: 1, color: { id: 'cyan', alpha: 0 } }] }, glow: { color: 'cyan', blur: 5 } })],
};

export const STATIC_MITE_RIG: EnemyRigDef = {
  id: 'static-mite',
  scale: 1,
  box: { size: [32, 28], anchor: [16, 22] },
  hip: [0, CY],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-4, 0, 4], 'iron-dark'), body(true, false), legs('legs-near', 'leg-front', [-3, 1, 5], 'iron'), eyes(true), spark],
    down: [ground, legs('legs', 'leg-back', [-6, -5, -4, 4, 5, 6], 'iron'), body(false, true), eyes(false), spark],
    up: [ground, legs('legs', 'leg-back', [-6, -5, -4, 4, 5, 6], 'iron'), body(false, false), eyes(false), spark],
  },
  poses: {
    idle: [{ glow: 0.5 }],
    // A skittering run.
    walk: [
      { step: 1.2, lift: 0.8, bob: -0.5, glow: 0.6 },
      { step: 0, bob: 0, glow: 0.5 },
      { step: -1.2, lift: 0.8, bob: -0.5, glow: 0.6 },
      { step: 0, bob: 0, glow: 0.5 },
    ],
    // Its zap winding up: the spark flickers bigger and smaller as it buzzes.
    windup: [
      { sink: 0.5, charge: 0.8, glow: 1 },
      { sink: 0.5, charge: 1.1, glow: 0.7 },
    ],
    swipe: [
      { charge: 1.6, glow: 1, scaleY: 0.85 },
      { charge: 0.6, glow: 0.8 },
    ],
    // Backing off, skittering.
    recover: [{ lean: -0.2, step: 1, glow: 0.4 }],
    hit: [{ lean: -0.3, bob: -1, glow: 1 }],
    death: DEATH_POSES,
  },
};
