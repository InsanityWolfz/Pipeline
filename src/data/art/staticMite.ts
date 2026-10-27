import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { glassInlay, rimOf, stormVein } from './enemyLook';
import { ellipse, line, path } from './types';

// The static mite (065, draft for Shaun's review): a tiny spark-beetle of the builders' storm-works, a brass-rimmed
// slate shell split down its back with a cyan seam of charge, six wiry legs and two crackling antennae. Its spark
// (the charge part) swells as it winds up its zap. Light from the top left; world px round the feet.
// 076: the Storm-works look: a slate shell with a pale storm rim and storm-glass flecks, its seam and spark violet
// lightning (its eyes stay ley cyan). Its wind-up hunkers, raises its antennae as the spark swells (two frames), and at
// the peak splits its shell wide round a white-violet spark.

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
    ellipse(0, CY, side ? 6 : 5, 4, { fill: shell, outline: true, rim: rimOf('storm') }),
    ...(side ? stormVein([-5, CY - 1, 4, CY - 3], 0.6) : stormVein([0, CY - 4, 0, CY + 3], 0.6)),
    ...glassInlay(side ? -2.5 : -2.6, CY + 0.8, 0.9),
    ...glassInlay(side ? 2 : 2.6, CY + 1.2, 0.8),
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
    ? [ellipse(7, CY, 0.7, 0.7, { fill: 'cyan', glow: { color: 'cyan', blur: 2 } }), ellipse(11.5, CY - 4, 0.9, 0.9, { fill: 'snow', glow: { color: 'storm-glow', blur: 3 } })]
    : [ellipse(-3.5, CY - 7.5, 0.9, 0.9, { fill: 'snow', glow: { color: 'storm-glow', blur: 3 } }), ellipse(3.5, CY - 7.5, 0.9, 0.9, { fill: 'snow', glow: { color: 'storm-glow', blur: 3 } })],
});

/** Its spark: a ball of charge over its back, grown by the pose's `charge` as it winds up its zap. */
const spark: EnemyPart = {
  id: 'spark',
  role: 'charge',
  pivot: [0, CY - 3],
  shapes: [ellipse(0, CY - 3, 4, 4, { fill: { radial: [0, CY - 3, 4], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'storm-pale' }, { at: 1, color: { id: 'storm-glow', alpha: 0 } }] }, glow: { color: 'storm-glow', blur: 5 } })],
};

export const STATIC_MITE_RIG: EnemyRigDef = {
  id: 'static-mite',
  scale: 1,
  box: { size: [32, 28], anchor: [16, 22] },
  hip: [0, CY],
  tells: { windup: { part: 'shell', at: { side: [11.5, CY - 4], down: [3.5, CY - 7.5], up: [3.5, CY - 7.5] } } },
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
    // 076: gather (it hunkers), coil (antennae up, the spark swelling over two frames), peak (the shell split wide, the
    // spark white-violet; render trembles it).
    windup: [
      { sink: 1, squash: 0.18, charge: 0.2, glow: 0.7 },
      { bob: -3, lean: -0.25, squash: -0.12, charge: 0.85, glow: 1 },
      { bob: -3, lean: -0.25, squash: -0.1, charge: 1.1, glow: 0.7 },
      { bob: -5.5, lean: -0.34, squash: 0.04, charge: 1.45, glow: 1 },
    ],
    swipe: [
      { charge: 1.6, glow: 1, squash: 0.15 },
      { charge: 0.6, glow: 0.8 },
    ],
    // Backing off, skittering.
    recover: [{ lean: -0.2, step: 1, glow: 0.4 }],
    // Its shell rattles.
    hit: [{ lean: -0.3, tilt: 0.15, bob: -1, squash: 0.1, glow: 1 }],
    // Flipped half over; then righted.
    stagger: [
      { tilt: -1.1, bob: -2, legFront: -0.6, legBack: 0.6, glow: 0.6 },
      { tilt: -0.3, bob: -1, squash: 0.1, glow: 0.7 },
    ],
    // Killed, it discharges (the bolts as before), then a small dissolve.
    death: [{ charge: 1.2, squash: 0.2, tilt: -0.4, glow: 1 }],
  },
};
