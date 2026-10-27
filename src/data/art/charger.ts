import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { BRASS, big, ironBand, litEllipse, litPath, litRect, slateLips, SLATE, tone } from './enemyLook';
import { ellipse, path, trim } from './types';

// The Charger (035): a horned ram-construct of grey-blue quarry stone on four stubby legs, bound in brass bands with
// rust bleeding from the rivets. Its curled horns carry cyan ley runes that blaze as it paws the ground before a charge.
// 076: the Quarry constructs look: its body is layered slate plates (each with a lit lip), its legs are banded in
// ley-iron with a cyan vein through the rust; the brass bands stay. Its wind-up rears its head, paws head-down (two
// frames, deeper), and coils low on its haunches with its horns blazing.

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 17, 4, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

const FAR = tone('hollow-dark', 'hollow-dark', 'hollow');
const NEAR = tone('hollow', 'hollow-light', 'hollow-pale');
const HEAD = tone('hollow', 'hollow-light', 'hollow-pale');

/** A stubby slate leg with a ley-iron band and an iron hoof, its top at the body's underside. */
const legShapes = (x: number, t: typeof NEAR) => [
  litRect(x - 3.5, -14, 7, 14, 2.5, t, 'quarry'),
  ...ironBand(x - 3.6, -8, x + 3.6, -8, 2.2),
  litRect(x - 4, -3.5, 8, 3.5, 1.2, tone('iron-dark', 'iron-dark', 'iron'), 'quarry'),
];
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], t: typeof NEAR): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -12],
  shapes: xs.flatMap((x) => legShapes(x, t)),
});

/** A brass band with rivets. */
const band = (x: number, y: number, h: number) => [litRect(x, y, 4, h, 1.2, BRASS, 'quarry'), ellipse(x + 2, y + 3, 0.8, 0.8, { fill: 'brass-light' }), ellipse(x + 2, y + h - 3, 0.8, 0.8, { fill: 'brass-light' })];

/** The body seen side-on: a slate barrel of stacked plates, two brass bands, rust under the rivets. */
const bodySide: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    litPath('M -19 -28 Q -23 -18 -18 -10 L 13 -10 Q 18 -20 13 -30 Q -4 -34 -19 -28 Z', SLATE, 'quarry'),
    ...slateLips(-19, -31, 32, 20, 3),
    path('M -18 -12 L 13 -12 L 13 -10 L -18 -10 Z', { fill: { id: 'hollow-dark', alpha: 0.8 } }),
    ...band(-9, -32, 22),
    ...band(4, -32, 22),
    path('M -7 -22 Q -6 -17 -8 -13', trim({ id: 'iron-rust', alpha: 0.75 }, 1.4)),
    path('M 6 -24 Q 7 -19 5 -14', trim({ id: 'iron-rust', alpha: 0.6 }, 1.2)),
  ],
};

/** The head side-on: a blunt slate wedge with a cyan eye slit, lowered a little. */
const headSide: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [15, -24],
  shapes: [litPath('M 11 -30 L 24 -26 Q 27 -20 24 -15 L 12 -15 Z', HEAD, 'quarry'), path('M 13 -26 L 23 -23.5', { stroke: { color: 'hollow-pale', width: 0.7 } }), ellipse(24.5, -17.5, 1, 0.8, { fill: 'hollow-dark' })],
};
const eyeSide: EnemyPart = { id: 'eye', role: 'glow', follows: 'head', pivot: [19, -24], shapes: [{ kind: 'rect', x: 17, y: -25, w: 5, h: 1.8, r: 0.8, fill: 'cyan', glow: { color: 'cyan', blur: 4 } }] };

/** A curled ram horn round a centre, slate with a brass tip. */
const hornD = (cx: number, cy: number, flip: number) => `M ${cx} ${cy - 6} Q ${cx - 9 * flip} ${cy - 8} ${cx - 9 * flip} ${cy} Q ${cx - 8 * flip} ${cy + 7} ${cx - 1 * flip} ${cy + 5}`;
const horn = (cx: number, cy: number, flip: number) => [path(hornD(cx, cy, flip), trim('ink', 6.2)), path(hornD(cx, cy, flip), trim('hollow-light', 4.5)), path(hornD(cx, cy, flip), trim('hollow-pale', 1.6)), ellipse(cx - 1 * flip, cy + 5, 1.6, 1.4, { fill: 'brass', outline: true })];
/** The runes along a horn: a glow part riding the head, so they blaze in the wind-up. */
const runes = (id: string, cx: number, cy: number, flip: number): EnemyPart => ({
  id,
  role: 'glow',
  follows: 'head',
  pivot: [cx, cy],
  shapes: [{ ...path(`M ${cx - 3 * flip} ${cy - 6} Q ${cx - 8 * flip} ${cy - 5} ${cx - 8 * flip} ${cy}`, trim('vein', 1.6)), glow: { color: 'cyan', blur: 5 } }],
});

const hornsSide: EnemyPart = { id: 'horns', role: 'head', pivot: [15, -24], shapes: [...horn(16, -27, 1), ellipse(14, -21, 2, 1.6, { fill: 'brass', outline: true })] };

/** Face-on: the wedge's blunt front, horns curling out either side. */
const headDown: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -18],
  shapes: [litPath('M -8 -26 L 8 -26 Q 10 -17 6 -12 L -6 -12 Q -10 -17 -8 -26 Z', HEAD, 'quarry'), path('M -6 -24 L 6 -24', { stroke: { color: 'hollow-pale', width: 0.7 } }), ...horn(-7, -24, 1), ...horn(7, -24, -1)],
};
const eyesDown: EnemyPart = {
  id: 'eyes',
  role: 'glow',
  follows: 'head',
  pivot: [0, -20],
  shapes: [
    { kind: 'rect', x: -6, y: -21, w: 4, h: 1.8, r: 0.8, fill: 'cyan', glow: { color: 'cyan', blur: 4 } },
    { kind: 'rect', x: 2, y: -21, w: 4, h: 1.8, r: 0.8, fill: 'cyan', glow: { color: 'cyan', blur: 4 } },
  ],
};
const bodyFront: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [litEllipse(0, -21, 15, 11, SLATE, 'quarry'), ...slateLips(-13, -31, 26, 18, 2), litRect(-15, -24, 30, 3.5, 1.2, BRASS, 'quarry')],
};
/** From behind, the horns over its shoulders: they drop as its head goes down. */
const hornsBack: EnemyPart = { id: 'horns', role: 'head', pivot: [0, -26], shapes: [...horn(-6, -30, 1), ...horn(6, -30, -1)] };
/** From behind: the rump, a brass band, a stub of a tail, and the horns over its shoulders. */
const bodyBack: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    ellipse(0, -20, 15, 11, big(SLATE, [-15, -31, 15, -9], 'quarry')),
    ...slateLips(-13, -30, 26, 18, 2),
    litRect(-15, -22, 30, 3.5, 1.2, BRASS, 'quarry'),
    ellipse(0, -13, 3, 2.5, { fill: 'hollow-dark', outline: true }),
    path('M -6 -17 Q -5 -13 -7 -10', trim({ id: 'iron-rust', alpha: 0.7 }, 1.3)),
  ],
};

export const CHARGER_RIG: EnemyRigDef = {
  id: 'charger',
  scale: 1,
  box: { size: [80, 64], anchor: [38, 54] },
  hip: [0, -12],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-13, 9], FAR), bodySide, headSide, hornsSide, eyeSide, runes('runes', 16, -27, 1), legs('legs-near', 'leg-front', [-10, 12], NEAR)],
    down: [ground, legs('legs-far', 'leg-back', [-9, 9], FAR), bodyFront, legs('legs-near', 'leg-front', [-6, 6], NEAR), headDown, eyesDown, runes('runes-l', -7, -24, 1), runes('runes-r', 7, -24, -1)],
    up: [ground, legs('legs-near', 'leg-front', [-9, 9], NEAR), legs('legs-far', 'leg-back', [-6, 6], FAR), hornsBack, bodyBack],
  },
  tells: { windup: { part: { side: 'head', down: 'head', up: 'horns' }, at: { side: [24, -20], down: [-16, -24], up: [-14, -30] } } },
  poses: {
    idle: [{ bob: 0, glow: 0.35 }],
    walk: [
      { step: 3, lift: 2, bob: -1, glow: 0.35 },
      { step: 0, bob: 0.5, glow: 0.35 },
      { step: -3, lift: 2, bob: -1, glow: 0.35 },
      { step: 0, bob: 0.5, glow: 0.35 },
    ],
    // 076: gather (the head rears up and back), coil (head down, horns forward, pawing over two frames, deeper than
    // before), peak (haunches coiled low, horns blazing; render trembles it).
    windup: [
      { lean: -0.22, head: -0.4, headLift: -2, bob: -1.5, squash: -0.06, glow: 0.6 },
      { lean: 0.26, head: 0.32, headLift: 3.5, step: 4, lift: 3.5, sink: 2, squash: 0.08, glow: 1 },
      { lean: 0.26, head: 0.32, headLift: 3.5, step: -2.5, sink: 2.5, squash: 0.1, glow: 0.85 },
      { lean: 0.32, head: 0.42, headLift: 4, step: -1, sink: 3, squash: 0.16, glow: 1 },
    ],
    // The charge: stretched low at full gallop.
    swipe: [
      { lean: 0.22, head: 0.25, step: 5, lift: 3, bob: -1, squash: -0.1, glow: 1 },
      { lean: 0.22, head: 0.25, step: -5, lift: 3, bob: -1, squash: -0.06, glow: 1 },
    ],
    recover: [{ lean: 0.05, sink: 1, glow: 0.3 }],
    // Reeling off a wall: rocking, its runes dark.
    stun: [
      { lean: -0.2, head: -0.3, tilt: -0.06, sink: 2, squash: 0.06, glow: 0 },
      { lean: -0.1, head: 0.15, tilt: 0.06, sink: 2, squash: 0.06, glow: 0.1 },
    ],
    // Its head jerks back.
    hit: [{ lean: -0.12, head: -0.4, bob: 1, squash: 0.05, glow: 0.35 }],
    // It rears onto its hind legs, forelegs kicking; then drops back down.
    stagger: [
      { tilt: -0.32, lean: -0.15, head: -0.35, legFront: -0.5, step: 2, glow: 0.2 },
      { tilt: -0.08, head: -0.1, sink: 1, squash: 0.08, glow: 0.3 },
    ],
    // Its legs buckle and the horn runes go dark.
    death: [{ sink: 4, squash: 0.2, lean: 0.12, head: 0.35, legFront: 0.3, legBack: -0.3, glow: 0 }],
  },
};
