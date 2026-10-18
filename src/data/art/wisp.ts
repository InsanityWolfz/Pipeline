import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, type Shape } from './types';

// The Wisp (016, draft for Shaun's review): a floating violet flame spirit behind a
// pale stone mask, with two drifting hands. It casts slow orbs that form between
// its hands. Violet keeps it apart from the player's ley cyan.

const FLAME = 'M 0 -41 Q 11 -31 9 -21 Q 7 -11 0 -8 Q -7 -11 -9 -21 Q -11 -31 0 -41 Z';
const flame: Shape = path(FLAME, {
  fill: { radial: [0, -22, 15], stops: [{ at: 0, color: 'wisp-light' }, { at: 0.55, color: 'wisp' }, { at: 1, color: 'wisp-dark' }] },
  outline: true,
  glow: { color: 'wisp', blur: 6 },
});
const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 7, 2.2, { fill: { id: 'ground-shade', alpha: 0.3 } })] };
const body: EnemyPart = { id: 'body', role: 'body', pivot: [0, -22], shapes: [flame, ellipse(0, -18, 4, 6, { fill: { id: 'wisp-light', alpha: 0.55 } })] };
const mask = (x: number, rx: number): EnemyPart => ({
  id: 'mask',
  role: 'head',
  pivot: [x, -25],
  shapes: [
    ellipse(x, -25, rx, 6.5, { fill: 'mask', outline: true }),
    line([x - rx * 0.55, -26, x - rx * 0.15, -25.2], 1.3, 'ink'),
    line([x + rx * 0.15, -25.2, x + rx * 0.55, -26], 1.3, 'ink'),
    line([x - 0.6, -21.5, x + 0.6, -21.5], 1, 'ink'),
  ],
});
const hand = (id: string, role: 'arm-back' | 'arm-front', x: number, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: [0, -22],
  shapes: [ellipse(x, -19, 2.6, 3.2, { fill: 'wisp-light', outline: true, glow: { color: 'wisp', blur: 3 } })],
});
const orb = (x: number): EnemyPart => ({
  id: 'orb',
  role: 'charge',
  pivot: [x, -21],
  shapes: [ellipse(x, -21, 4.5, 4.5, { fill: { radial: [x, -21, 4.5], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'wisp-light' }, { at: 1, color: 'wisp' }] }, glow: { color: 'wisp-light', blur: 8 } })],
});

export const WISP_RIG: EnemyRigDef = {
  id: 'wisp',
  scale: 0.9,
  box: { size: [48, 46], anchor: [24, 44] },
  hip: [0, -20],
  views: {
    side: [ground, hand('hand-back', 'arm-back', 8), body, mask(3, 4.2), orb(12), hand('hand-front', 'arm-front', 6)],
    down: [ground, body, mask(0, 5.5), orb(0), hand('hand-back', 'arm-back', -11), hand('hand-front', 'arm-front', 11, true)],
    up: [ground, orb(0), hand('hand-back', 'arm-back', -11), hand('hand-front', 'arm-front', 11, true), body],
  },
  poses: {
    idle: [{ bob: -3 }],
    walk: [{ bob: -4, lean: 0.1 }, { bob: -3, lean: 0.12, armFront: 0.1 }, { bob: -2, lean: 0.1 }, { bob: -3, lean: 0.08, armBack: 0.1 }],
    // Charging: the hands draw in and the orb swells; the cast flings it and recoils.
    windup: [{ bob: -4, armBack: -0.25, armFront: -0.25, charge: 0.7, glow: 1 }],
    swipe: [
      { bob: -3, lean: 0.2, armFront: 0.5, armBack: 0.3, charge: 1 },
      { bob: -4, lean: -0.15, armFront: -0.2, charge: 0 },
    ],
    hit: [{ bob: -2, lean: -0.3, scaleY: 0.92 }],
    death: DEATH_POSES,
  },
};
