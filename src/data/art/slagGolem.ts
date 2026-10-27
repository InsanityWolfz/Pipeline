import { legacyRig, type EnemyPart, type EnemyPose, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path } from './types';

// The slag golem and its whelps (061, drafts for Shaun's review). The golem: a hunched lump of cooling slag, dark crust
// over lit seams of molten cinder, a glowing core in its chest, short thick legs and long heavy fists. Its slam heaves
// both fists up and down; as it dies it slumps and cracks apart (its split: two whelps rise from it). A whelp: a small
// blob of the same slag, ember eyes and a lit crack, waddling on two nubs. Light from the top left; world px round the feet.

const crust = { linear: [-10, -46, 12, -8] as const, stops: [{ at: 0, color: 'ash-light' }, { at: 0.5, color: 'ash' }, { at: 1, color: 'ash-dark' }] };
const molten = { radial: [0, -26, 7] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.55, color: 'cinder' }, { at: 1, color: 'flame-dark' }] };

const shadow = (rx: number): EnemyPart => ({ id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, rx, rx / 4, { fill: { id: 'ground-shade', alpha: 0.32 } })] });

/** A short thick slag leg. */
const leg = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -10],
  shapes: xs.map((x) => ellipse(x, -6, 5.5, 7, { fill, outline: true })),
});

/** A long heavy arm of slag ending in a fist. */
const fist = (id: string, role: 'arm-back' | 'arm-front', x: number, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: [x, -34],
  shapes: [line([x, -34, x + Math.sign(x) * 3, -18], 8, 'ash-dark', true), ellipse(x + Math.sign(x) * 3, -14, 6.5, 6, { fill: crust, outline: true }), line([x + Math.sign(x) * 1, -15, x + Math.sign(x) * 5, -12], 1, 'cinder')],
});

/** The hunched body: the crust, lit seams across it, a dark brow over two ember eyes. */
const body = (front: boolean): EnemyPart => ({
  id: 'body',
  role: 'body',
  pivot: [0, -26],
  shapes: [
    path('M -17 -14 Q -21 -34 -10 -44 Q 2 -50 13 -42 Q 21 -32 17 -14 Q 0 -9 -17 -14 Z', { fill: crust, outline: true }),
    line([-12, -36, -6, -32, -9, -24], 1.2, 'cinder'),
    line([8, -40, 11, -33, 7, -27], 1.2, 'cinder'),
    line([-4, -18, 3, -16, 9, -19], 1.2, 'cinder'),
    ...(front ? [path('M -9 -41 Q 0 -45 9 -41 L 8 -38 Q 0 -41 -8 -38 Z', { fill: 'ash-dark' })] : []),
    ellipse(-6, -44, 5, 1.6, { fill: { id: 'ash-pale', alpha: 0.6 } }),
  ],
});

/** The core in its chest and its eyes: a glow part, blazing in the wind-up (the core's hidden from behind). */
const core = (front: boolean, x = 0): EnemyPart => ({
  id: 'core',
  role: 'glow',
  pivot: [x, -26],
  shapes: [
    ...(front ? [ellipse(x, -27, 6, 6, { fill: molten, glow: { color: 'cinder', blur: 7 } })] : [line([-6, -30, 0, -26, 6, -31], 1.6, 'cinder-light')]),
    ...(front ? [ellipse(x - 4, -38, 1.5, 1, { fill: 'cinder-light', glow: { color: 'cinder', blur: 3 } }), ellipse(x + 4, -38, 1.5, 1, { fill: 'cinder-light', glow: { color: 'cinder', blur: 3 } })] : []),
  ],
});

/** It slumps and cracks apart as it splits, its core going dark. */
const SPLIT_DEATH: readonly EnemyPose[] = [
  { sink: 2, scaleY: 0.9, glow: 1 },
  { sink: 4, scaleY: 0.75, glow: 0.7, tilt: 0.05 },
  { sink: 6, scaleY: 0.58, glow: 0.35, alpha: 0.7 },
  { sink: 8, scaleY: 0.45, glow: 0, alpha: 0.35 },
];

export const SLAG_GOLEM_RIG: EnemyRigDef = legacyRig({
  id: 'slag-golem',
  scale: 1,
  box: { size: [64, 64], anchor: [32, 58] },
  hip: [0, -12],
  views: {
    side: [shadow(18), leg('legs-far', 'leg-back', [-5], 'ash-dark'), fist('fist-back', 'arm-back', -10), body(true), core(true, 4), leg('legs-near', 'leg-front', [6], 'ash'), fist('fist-front', 'arm-front', 12)],
    down: [shadow(18), leg('legs', 'leg-back', [-8, 8], 'ash'), body(true), core(true), fist('fist-l', 'arm-back', -16), fist('fist-r', 'arm-front', 16, true)],
    up: [shadow(18), leg('legs', 'leg-back', [-8, 8], 'ash'), fist('fist-l', 'arm-back', -16), fist('fist-r', 'arm-front', 16, true), body(false), core(false)],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.55 }],
    walk: [
      { step: 2, lift: 1, bob: -0.5, lean: 0.05, glow: 0.55 },
      { step: 0, bob: 0.5, glow: 0.55 },
      { step: -2, lift: 1, bob: -0.5, lean: 0.05, glow: 0.55 },
      { step: 0, bob: 0.5, glow: 0.55 },
    ],
    // Both fists heaved high, the core blazing.
    windup: [{ armBack: -2.2, armFront: -2.2, lean: -0.1, bob: -2, glow: 1 }],
    swipe: [
      { armBack: 0.5, armFront: 0.5, lean: 0.2, sink: 2, scaleY: 0.92, glow: 1 },
      { armBack: 0.4, armFront: 0.4, lean: 0.15, sink: 1, glow: 0.8 },
    ],
    recover: [{ armBack: 0.3, armFront: 0.3, lean: 0.12, sink: 1, glow: 0.35 }],
    hit: [{ lean: -0.1, bob: 1, glow: 0.8 }],
    death: SPLIT_DEATH,
  },
});

const blob: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -7],
  shapes: [path('M -7 -2 Q -9 -10 -3 -13 Q 3 -15 7 -10 Q 9 -4 6 -2 Q 0 0 -7 -2 Z', { fill: crust, outline: true }), line([-4, -8, -1, -6, 2, -9], 1, 'cinder'), ellipse(-3, -12, 2.5, 0.9, { fill: { id: 'ash-pale', alpha: 0.6 } })],
};
const nubs: EnemyPart = { id: 'nubs', role: 'leg-front', pivot: [0, -2], shapes: [ellipse(-4, -1.5, 2.5, 1.8, { fill: 'ash-dark', outline: true }), ellipse(4, -1.5, 2.5, 1.8, { fill: 'ash-dark', outline: true })] };
const eyes = (xs: readonly number[]): EnemyPart => ({ id: 'eyes', role: 'glow', pivot: [0, -9], shapes: xs.map((x) => ellipse(x, -9.5, 1.1, 0.9, { fill: 'cinder-light', glow: { color: 'cinder', blur: 3 } })) });

export const SLAG_WHELP_RIG: EnemyRigDef = legacyRig({
  id: 'slag-whelp',
  scale: 1,
  box: { size: [32, 28], anchor: [16, 24] },
  hip: [0, -4],
  views: {
    side: [shadow(8), nubs, blob, eyes([3, 6])],
    down: [shadow(8), nubs, blob, eyes([-2.5, 2.5])],
    up: [shadow(8), nubs, blob],
  },
  poses: {
    idle: [{ glow: 0.7 }],
    walk: [
      { step: 1.5, lift: 1, bob: -1, scaleY: 1.05, glow: 0.7 },
      { step: 0, bob: 0, scaleY: 0.95, glow: 0.7 },
      { step: -1.5, lift: 1, bob: -1, scaleY: 1.05, glow: 0.7 },
      { step: 0, bob: 0, scaleY: 0.95, glow: 0.7 },
    ],
    // Drawn back, eyes blazing; then the bite, lunging.
    windup: [{ lean: -0.2, scaleY: 0.88, glow: 1 }],
    swipe: [
      { lean: 0.35, bob: -1, scaleY: 1.1, glow: 1 },
      { lean: 0.2, glow: 0.8 },
    ],
    hit: [{ lean: -0.25, scaleY: 0.85, glow: 0.7 }],
  },
});
