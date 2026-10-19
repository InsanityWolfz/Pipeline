import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, path, rect, solid, trim } from './types';

// The Charger (035, draft for Shaun's review): a horned ram-construct of grey-blue quarry
// stone on four stubby legs, bound in brass bands with rust bleeding from the rivets. Its
// curled horns carry cyan ley runes that blaze as it paws the ground before a charge.

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 17, 4, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** A stubby stone leg with an iron hoof, its top at the body's underside. */
const legShapes = (x: number, fill: string) => [rect(x - 3.5, -14, 7, 14, 2.5, solid(fill)), rect(x - 4, -3.5, 8, 3.5, 1.2, solid('iron-dark'))];
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -12],
  shapes: xs.flatMap((x) => legShapes(x, fill)),
});

/** The body seen side-on: a stone barrel, two brass bands, rust under the rivets and a lit top. */
const bodySide: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    path('M -19 -28 Q -23 -18 -18 -10 L 13 -10 Q 18 -20 13 -30 Q -4 -34 -19 -28 Z', solid('hollow')),
    path('M -18 -12 L 13 -12 L 13 -10 L -18 -10 Z', flat('hollow-dark')),
    rect(-9, -32, 4, 22, 1.2, solid('brass')),
    rect(4, -32, 4, 22, 1.2, solid('brass')),
    ellipse(-10, -29, 7, 2, flat('hollow-pale')),
    path('M -7 -22 Q -6 -17 -8 -13', trim({ id: 'iron-rust', alpha: 0.75 }, 1.4)),
    path('M 6 -24 Q 7 -19 5 -14', trim({ id: 'iron-rust', alpha: 0.6 }, 1.2)),
  ],
};

/** The head side-on: a blunt stone wedge with a cyan eye slit, lowered a little. */
const headSide: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [15, -24],
  shapes: [path('M 11 -30 L 24 -26 Q 27 -20 24 -15 L 12 -15 Z', solid('hollow-light')), rect(17, -25, 5, 1.8, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } })],
};

/** A curled ram horn round a centre, stone with a brass tip. */
const horn = (cx: number, cy: number, flip: number) =>
  path(`M ${cx} ${cy - 6} Q ${cx - 9 * flip} ${cy - 8} ${cx - 9 * flip} ${cy} Q ${cx - 8 * flip} ${cy + 7} ${cx - 1 * flip} ${cy + 5}`, trim('hollow-pale', 4.5));
const hornOutline = (cx: number, cy: number, flip: number) =>
  path(`M ${cx} ${cy - 6} Q ${cx - 9 * flip} ${cy - 8} ${cx - 9 * flip} ${cy} Q ${cx - 8 * flip} ${cy + 7} ${cx - 1 * flip} ${cy + 5}`, trim('ink', 6.2));
/** The runes along a horn: a glow part, so they blaze in the wind-up. */
const runes = (id: string, cx: number, cy: number, flip: number): EnemyPart => ({
  id,
  role: 'glow',
  pivot: [cx, cy],
  shapes: [{ ...path(`M ${cx - 3 * flip} ${cy - 6} Q ${cx - 8 * flip} ${cy - 5} ${cx - 8 * flip} ${cy}`, trim('vein', 1.6)), glow: { color: 'cyan', blur: 5 } }],
});

const hornsSide: EnemyPart = { id: 'horns', role: 'head', pivot: [15, -28], shapes: [hornOutline(16, -27, 1), horn(16, -27, 1), ellipse(14, -21, 2, 1.6, solid('brass'))] };

/** Face-on: the wedge's blunt front, horns curling out either side. */
const headDown: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -18],
  shapes: [
    path('M -8 -26 L 8 -26 Q 10 -17 6 -12 L -6 -12 Q -10 -17 -8 -26 Z', solid('hollow-light')),
    rect(-6, -21, 4, 1.8, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } }),
    rect(2, -21, 4, 1.8, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } }),
    hornOutline(-7, -24, 1),
    horn(-7, -24, 1),
    hornOutline(7, -24, -1),
    horn(7, -24, -1),
  ],
};
const bodyFront: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [ellipse(0, -21, 15, 11, solid('hollow')), rect(-15, -24, 30, 3.5, 1.2, solid('brass')), ellipse(-5, -29, 6, 2, flat('hollow-pale'))],
};
/** From behind: the rump, a brass band, a stub of a tail, and the horns over its shoulders. */
const bodyBack: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    hornOutline(-6, -30, 1),
    horn(-6, -30, 1),
    hornOutline(6, -30, -1),
    horn(6, -30, -1),
    ellipse(0, -20, 15, 11, solid('hollow')),
    rect(-15, -22, 30, 3.5, 1.2, solid('brass')),
    ellipse(0, -13, 3, 2.5, solid('hollow-dark')),
    path('M -6 -17 Q -5 -13 -7 -10', trim({ id: 'iron-rust', alpha: 0.7 }, 1.3)),
  ],
};

export const CHARGER_RIG: EnemyRigDef = {
  id: 'charger',
  scale: 1,
  box: { size: [72, 56], anchor: [34, 48] },
  hip: [0, -12],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-13, 9], 'hollow-dark'), bodySide, headSide, hornsSide, runes('runes', 16, -27, 1), legs('legs-near', 'leg-front', [-10, 12], 'hollow-light')],
    down: [ground, legs('legs-far', 'leg-back', [-9, 9], 'hollow-dark'), bodyFront, legs('legs-near', 'leg-front', [-6, 6], 'hollow-light'), headDown, runes('runes-l', -7, -24, 1), runes('runes-r', 7, -24, -1)],
    up: [ground, legs('legs-near', 'leg-front', [-9, 9], 'hollow-light'), legs('legs-far', 'leg-back', [-6, 6], 'hollow-dark'), bodyBack],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.35 }],
    walk: [
      { step: 3, lift: 2, bob: -1, glow: 0.35 },
      { step: 0, bob: 0.5, glow: 0.35 },
      { step: -3, lift: 2, bob: -1, glow: 0.35 },
      { step: 0, bob: 0.5, glow: 0.35 },
    ],
    // Head down, pawing: a front hoof scrapes back and forth, the horns blazing.
    windup: [
      { lean: 0.14, step: 3, lift: 2, sink: 1, glow: 1 },
      { lean: 0.14, step: -1, sink: 1, glow: 0.85 },
    ],
    // The charge: stretched low at full gallop.
    swipe: [
      { lean: 0.2, step: 4, lift: 3, bob: -1, glow: 1 },
      { lean: 0.2, step: -4, lift: 3, bob: -1, glow: 1 },
    ],
    recover: [{ lean: 0.05, sink: 1, glow: 0.3 }],
    // Reeling off a wall: rocking, its runes dark.
    stun: [
      { lean: -0.18, tilt: -0.06, sink: 2, scaleY: 0.95, glow: 0 },
      { lean: -0.1, tilt: 0.06, sink: 2, scaleY: 0.95, glow: 0.1 },
    ],
    hit: [{ lean: -0.12, bob: 1, glow: 0.35 }],
    death: DEATH_POSES,
  },
};
