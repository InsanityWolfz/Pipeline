import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { BRASS, glowLine, litRect, SLATE, slateLips } from './enemyLook';
import { ellipse, flat, line, path, rect, solid, trim } from './types';

// The Sniper construct (035, draft for Shaun's review): a tall, spindly tripod of iron legs
// under a grey-blue stone housing, a brass collar, and one great ley lens that glows as it
// sights (EnemyView draws the laser from it, at HOLLOWS_ENEMY_LOOK.lens).
// 076: the Quarry constructs look: tripod legs of rusted ley-iron with a cyan vein, a layered slate housing, the
// brass collar and the great lens. Its wind-up splays its legs and drops low, leans into the aim through the tracking
// with the lens brightening, and from the sim's lock braces wide with the lens blazing. The recoil is bigger.

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 12, 3, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** Thin iron legs from the hip down to splayed feet. */
const legs = (id: string, role: 'leg-back' | 'leg-front', feet: readonly number[], color: string): EnemyPart => ({
  id,
  role,
  pivot: [0, -22],
  shapes: feet.flatMap((x) => [
    line([0, -22, x, -1], 2.8, color, true),
    line([x * 0.25, -16.5, x * 0.7, -7], 1.3, 'iron-rust'),
    glowLine([x * 0.3, -15.5, x * 0.6, -9], 0.5, 'vein', 1.5),
    ellipse(x, -1.2, 2.6, 1.4, { fill: 'iron-dark', outline: true }),
  ]),
});

/** The housing: a tall stone capsule with a brass collar and rust weeping under a rivet. */
const housing: EnemyPart = {
  id: 'housing',
  role: 'body',
  pivot: [0, -32],
  shapes: [
    litRect(-7, -46, 14, 24, 6, SLATE, 'quarry'),
    ...slateLips(-6, -46, 12, 20, 3),
    rect(2, -46, 5, 24, 4, flat({ id: 'hollow-dark', alpha: 0.6 })),
    litRect(-8, -26, 16, 4, 1.5, BRASS, 'quarry'),
    ellipse(-5, -24, 0.8, 0.8, { fill: 'brass-light' }),
    ellipse(5, -24, 0.8, 0.8, { fill: 'brass-light' }),
    ellipse(-3, -44, 3, 1.5, flat('hollow-pale')),
    path('M -4 -36 Q -3 -32 -5 -29', trim({ id: 'iron-rust', alpha: 0.7 }, 1.2)),
  ],
};

/** The lens side-on: a brass barrel out front with the cyan lens at its mouth. */
const lensSide: EnemyPart = { id: 'barrel', role: 'head', pivot: [2, -40], shapes: [litRect(0, -43, 7, 6, 1.5, BRASS, 'quarry'), rect(5.5, -43.5, 2, 7, 1, solid('brass-dark'))] };
const glowSide: EnemyPart = { id: 'lens', role: 'glow', follows: 'head', pivot: [7, -40], shapes: [ellipse(7.5, -40, 1.6, 3, { fill: 'cyan', glow: { color: 'cyan', blur: 6 } })] };

/** Face-on: the great round lens in a brass ring, staring out. */
const lensFront: EnemyPart = { id: 'barrel', role: 'head', pivot: [0, -38], shapes: [ellipse(0, -38, 6, 6, { fill: { linear: [-6, -44, 6, -32], stops: [{ at: 0, color: 'brass-light' }, { at: 0.45, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true, rim: { color: { id: 'hollow-pale', alpha: 0.5 }, width: 1, offset: 1 } }), ellipse(0, -38, 4.4, 4.4, trim('brass-dark', 1))] };
const glowFront: EnemyPart = {
  id: 'lens',
  role: 'glow',
  follows: 'head',
  pivot: [0, -38],
  shapes: [ellipse(0, -38, 3.6, 3.6, { fill: { radial: [-1, -39, 4], stops: [{ at: 0, color: 'cyan-glow' }, { at: 1, color: 'cyan' }] }, glow: { color: 'cyan', blur: 6 } }), ellipse(-1.2, -39.2, 1, 1, flat('snow'))],
};

/** From behind: a vent grille on its back. */
const vents: EnemyPart = { id: 'vents', role: 'body', pivot: [0, -36], shapes: [0, 1, 2].map((i) => line([-3.5, -40 + i * 3, 3.5, -40 + i * 3], 1.2, 'hollow-dark'))};

export const SNIPER_RIG: EnemyRigDef = {
  id: 'sniper',
  scale: 1,
  box: { size: [56, 68], anchor: [28, 60] },
  hip: [0, -22],
  tells: { windup: { part: { side: 'barrel', down: 'barrel', up: 'housing' }, at: { side: [7, -40], down: [0, -38], up: [0, -46] } } },
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-9, 7], 'iron-dark'), housing, lensSide, glowSide, legs('legs-near', 'leg-front', [2], 'iron')],
    down: [ground, legs('legs-far', 'leg-back', [0], 'iron-dark'), legs('legs-near', 'leg-front', [-9, 9], 'iron'), housing, lensFront, glowFront],
    up: [ground, legs('legs-near', 'leg-front', [0], 'iron'), legs('legs-far', 'leg-back', [-9, 9], 'iron-dark'), housing, vents],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.5 }],
    walk: [
      { step: 2, lift: 1.5, bob: -0.5, glow: 0.5 },
      { step: 0, bob: 0.5, glow: 0.5 },
      { step: -2, lift: 1.5, bob: -0.5, glow: 0.5 },
      { step: 0, bob: 0.5, glow: 0.5 },
    ],
    // Stepping out of cover: a quick sidelong shuffle, the lens already lit.
    step: [
      { step: 3, lift: 2, lean: 0.06, glow: 0.8 },
      { step: -3, lift: 2, lean: -0.06, glow: 0.8 },
    ],
    // 076: gather (legs splay and it drops low), coil (leaning into the aim through the tracking, the lens
    // brightening), peak (from the sim's lock: legs braced wide, the lens blazing; render trembles it).
    windup: [
      { squash: 0.16, sink: 2.5, step: 2.5, glow: 0.6 },
      { lean: 0.2, head: 0.12, sink: 2, squash: 0.08, step: 1.5, glow: 0.85 },
      { lean: 0.26, head: 0.16, sink: 3, squash: 0.12, step: 3.5, glow: 1 },
    ],
    // The shot's recoil, bigger.
    swipe: [
      { lean: -0.38, head: -0.2, shift: -3, bob: -1, squash: -0.08, glow: 1 },
      { lean: -0.14, shift: -1, glow: 0.7 },
    ],
    recover: [{ lean: -0.04, glow: 0.4 }],
    // The tripod wobbles.
    hit: [{ lean: -0.18, tilt: 0.06, head: -0.25, bob: 1, glow: 0.5 }],
    // A leg kicks up; then it settles back onto three.
    stagger: [
      { tilt: -0.2, lean: -0.3, head: -0.3, legFront: -0.65, step: 2, glow: 0.4 },
      { tilt: -0.05, lean: -0.08, squash: 0.06, glow: 0.5 },
    ],
    // Its legs fold; the lens fades last.
    death: [{ sink: 6, squash: 0.24, legFront: 0.6, legBack: -0.6, lean: 0.15, head: 0.3, glow: 0.5 }],
  },
};
