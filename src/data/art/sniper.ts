import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, trim } from './types';

// The Sniper construct (035, draft for Shaun's review): a tall, spindly tripod of iron legs
// under a grey-blue stone housing, a brass collar, and one great ley lens that glows as it
// sights (EnemyView draws the laser from it, at HOLLOWS_ENEMY_LOOK.lens).

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 12, 3, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** Thin iron legs from the hip down to splayed feet. */
const legs = (id: string, role: 'leg-back' | 'leg-front', feet: readonly number[], color: string): EnemyPart => ({
  id,
  role,
  pivot: [0, -22],
  shapes: feet.flatMap((x) => [line([0, -22, x, -1], 2.6, color, true), ellipse(x, -1.2, 2.4, 1.3, solid('iron-dark'))]),
});

/** The housing: a tall stone capsule with a brass collar and rust weeping under a rivet. */
const housing: EnemyPart = {
  id: 'housing',
  role: 'body',
  pivot: [0, -32],
  shapes: [
    rect(-7, -46, 14, 24, 6, solid('hollow')),
    rect(2, -46, 5, 24, 4, flat('hollow-dark')),
    rect(-8, -26, 16, 4, 1.5, solid('brass')),
    ellipse(-3, -44, 3, 1.5, flat('hollow-pale')),
    path('M -4 -36 Q -3 -32 -5 -29', trim({ id: 'iron-rust', alpha: 0.7 }, 1.2)),
  ],
};

/** The lens side-on: a brass barrel out front with the cyan lens at its mouth. */
const lensSide: EnemyPart = { id: 'barrel', role: 'head', pivot: [2, -40], shapes: [rect(0, -43, 7, 6, 1.5, solid('brass')), rect(5.5, -43.5, 2, 7, 1, solid('brass-dark'))] };
const glowSide: EnemyPart = { id: 'lens', role: 'glow', pivot: [7, -40], shapes: [ellipse(7.5, -40, 1.6, 3, { fill: 'cyan', glow: { color: 'cyan', blur: 6 } })] };

/** Face-on: the great round lens in a brass ring, staring out. */
const lensFront: EnemyPart = { id: 'barrel', role: 'head', pivot: [0, -38], shapes: [ellipse(0, -38, 6, 6, solid('brass')), ellipse(0, -38, 4.4, 4.4, trim('brass-dark', 1))] };
const glowFront: EnemyPart = {
  id: 'lens',
  role: 'glow',
  pivot: [0, -38],
  shapes: [ellipse(0, -38, 3.6, 3.6, { fill: { radial: [-1, -39, 4], stops: [{ at: 0, color: 'cyan-glow' }, { at: 1, color: 'cyan' }] }, glow: { color: 'cyan', blur: 6 } }), ellipse(-1.2, -39.2, 1, 1, flat('snow'))],
};

/** From behind: a vent grille on its back. */
const vents: EnemyPart = { id: 'vents', role: 'body', pivot: [0, -36], shapes: [0, 1, 2].map((i) => line([-3.5, -40 + i * 3, 3.5, -40 + i * 3], 1.2, 'hollow-dark'))};

export const SNIPER_RIG: EnemyRigDef = {
  id: 'sniper',
  scale: 1,
  box: { size: [48, 64], anchor: [24, 58] },
  hip: [0, -22],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-9, 7], 'iron-dark'), housing, lensSide, glowSide, legs('legs-near', 'leg-front', [2], 'iron')],
    down: [ground, legs('legs-far', 'leg-back', [0], 'iron-dark'), legs('legs-near', 'leg-front', [-9, 9], 'iron'), housing, lensFront, glowFront],
    up: [ground, legs('legs-near', 'leg-front', [0], 'iron'), legs('legs-far', 'leg-back', [-9, 9], 'iron-dark'), housing, vents],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.5 }],
    walk: [
      { step: 2, lift: 1.5, bob: -1, glow: 0.5 },
      { step: 0, bob: 0.5, glow: 0.5 },
      { step: -2, lift: 1.5, bob: -1, glow: 0.5 },
      { step: 0, bob: 0.5, glow: 0.5 },
    ],
    // Stepping out of cover: a quick sidelong shuffle, the lens already lit.
    step: [
      { step: 3, lift: 2, lean: 0.06, glow: 0.8 },
      { step: -3, lift: 2, lean: -0.06, glow: 0.8 },
    ],
    // Sighting: braced low on its legs, leaning into the aim, the lens blazing.
    windup: [{ sink: 2, scaleY: 0.96, lean: 0.06, glow: 1 }],
    // The shot's recoil.
    swipe: [
      { lean: -0.18, bob: -1, glow: 1 },
      { lean: -0.08, glow: 0.7 },
    ],
    recover: [{ lean: -0.04, glow: 0.4 }],
    hit: [{ lean: -0.14, bob: 1, glow: 0.5 }],
    death: DEATH_POSES,
  },
};
