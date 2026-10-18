import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid } from './types';

// The Pylon Warden (016, draft for Shaun's review): a mossy stone guardian with
// boulder fists, a ley rune on its chest and one cyan eye slit. It raises both
// fists overhead, slams, then stays crouched to recover.

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x + 4.5, -14],
  shapes: [rect(x, -15, 9, 15, 3, solid(fill))],
});
const arm = (id: string, role: 'arm-back' | 'arm-front', from: readonly [number, number], to: readonly [number, number], fill: string, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 7, fill, true), ellipse(to[0], to[1] + 2, 6, 5.5, solid(fill)), ellipse(to[0] - 1.5, to[1], 2, 1.5, flat('warden-light'))],
});
const torso = (front: boolean): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -28],
  shapes: [
    path('M -16 -42 Q -18 -26 -12 -14 L 12 -14 Q 18 -26 16 -42 Q 0 -48 -16 -42 Z', solid('warden')),
    path('M 8 -44 Q 16 -30 12 -14 L 12 -14 Q 18 -26 16 -42 Z', flat('warden-dark')),
    ellipse(-12, -43, 5, 2.5, flat('moss-tuft')),
    ellipse(11, -44, 4, 2, flat('moss-tuft')),
    ...(front ? [ellipse(0, -30, 6, 6, solid('warden-dark')), path('M -3.5 -33 L 0 -27 L 3.5 -33', { stroke: { color: 'cyan', width: 1.4 }, glow: { color: 'cyan', blur: 4 } })] : [path('M -8 -36 L 8 -24', { stroke: { color: 'warden-dark', width: 1.2 } })]),
  ],
});
const head: EnemyPart = { id: 'head', role: 'head', pivot: [0, -46], shapes: [rect(-6, -53, 12, 9, 3, solid('warden-light'))] };
const eye = (x: number): EnemyPart => ({
  id: 'eye',
  role: 'glow',
  pivot: [x, -49],
  shapes: [rect(x - 3.5, -50, 7, 2, 1, { fill: 'cyan', glow: { color: 'cyan', blur: 5 } })],
});

export const WARDEN_RIG: EnemyRigDef = {
  id: 'warden',
  scale: 0.95,
  box: { size: [80, 66], anchor: [40, 62] },
  hip: [0, -14],
  views: {
    side: [
      leg('leg-back', 'leg-back', -9, 'warden-dark'),
      arm('arm-back', 'arm-back', [-3, -38], [3, -22], 'warden-dark'),
      leg('leg-front', 'leg-front', 1, 'warden'),
      torso(false),
      head,
      eye(3),
      arm('arm-front', 'arm-front', [4, -37], [10, -21], 'warden'),
    ],
    down: [
      leg('leg-back', 'leg-back', -11, 'warden-dark'),
      leg('leg-front', 'leg-front', 2, 'warden'),
      arm('arm-back', 'arm-back', [-15, -38], [-19, -22], 'warden-dark'),
      torso(true),
      head,
      eye(0),
      arm('arm-front', 'arm-front', [15, -38], [19, -22], 'warden', true),
    ],
    up: [
      leg('leg-back', 'leg-back', -11, 'warden-dark'),
      leg('leg-front', 'leg-front', 2, 'warden'),
      torso(false),
      head,
      arm('arm-back', 'arm-back', [-15, -38], [-19, -22], 'warden-dark'),
      arm('arm-front', 'arm-front', [15, -38], [19, -22], 'warden', true),
    ],
  },
  poses: {
    idle: [{ bob: 0 }],
    walk: [
      { step: 3, lift: 2, bob: -1 },
      { step: 0, bob: 1, scaleY: 0.97 },
      { step: -3, lift: 2, bob: -1 },
      { step: 0, bob: 1, scaleY: 0.97 },
    ],
    // Both fists raised high: the slam's telegraph.
    windup: [{ armBack: 2.7, armFront: 2.7, lean: -0.12, bob: -2, glow: 1 }],
    swipe: [
      { armBack: -0.3, armFront: -0.3, lean: 0.15, sink: 3, glow: 1 },
      { armBack: -0.2, armFront: -0.2, lean: 0.2, sink: 5, scaleY: 0.92, glow: 1 },
    ],
    recover: [{ armBack: -0.35, armFront: -0.35, lean: 0.22, sink: 4, scaleY: 0.94, glow: 0.4 }],
    hit: [{ lean: -0.15, bob: 1 }],
    death: DEATH_POSES,
  },
};
