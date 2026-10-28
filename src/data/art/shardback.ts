import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { glowLine, ironBand, litPath, litRect, LEY_IRON, SLATE, slateLips, tone, type Tone } from './enemyLook';
import { ellipse, flat, line, path, rect, trim, type Shape } from './types';

// The Shardback (035, draft for Shaun's review): the Bulwark's little cousin, a squat
// construct of grey-blue stone on short iron legs, hunched behind a shield plate studded
// with ley crystals, rust weeping from its rivets. Its runes flare (EnemyView adds the
// flare) as it winds up a bash; it plants the plate and shoves.
// 076: the Quarry constructs look: the shield plate is layered slate in a ley-iron rim with a cyan vein, its ley
// crystals kept; the body is slate plating, the legs banded in ley-iron. Its wind-up hunches behind the plate, draws it
// far back with the body twisted on a planted foot, and flares its crystals at the peak.

const FAR = tone('hollow-dark', 'hollow-dark', 'hollow');
const NEAR = tone('hollow', 'hollow-light', 'hollow-pale');

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 15, 4, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, t: Tone): EnemyPart => ({
  id,
  role,
  pivot: [x + 4, -10],
  shapes: [litRect(x, -11, 8, 11, 2.5, t, 'quarry'), ...ironBand(x, -7, x + 8, -7, 2), litRect(x - 0.5, -3, 9, 3, 1, tone('iron-dark', 'iron-dark', 'iron'), 'quarry')],
});

/** The squat body: a stone dome bound by one iron band, rust under a rivet. */
const torso = (shade: number): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    litPath('M -14 -31 Q -17 -19 -12 -9 L 12 -9 Q 17 -19 14 -31 Q 0 -37 -14 -31 Z', SLATE, 'quarry'),
    ...slateLips(-14, -34, 28, 24, 3),
    path(`M ${shade} -33 Q ${shade + 6} -20 ${shade + 3} -9 L 12 -9 Q 17 -19 14 -31 Z`, flat({ id: 'hollow-dark', alpha: 0.6 })),
    litRect(-15, -22, 30, 3.5, 1.2, LEY_IRON, 'quarry'),
    line([-15, -20.2, 15, -20.2], 1.2, 'iron-rust'),
    glowLine([-10, -20.4, 9, -20.4], 0.5, 'vein', 1.5),
    path('M -8 -19 Q -7 -15 -9 -12', trim({ id: 'iron-rust', alpha: 0.7 }, 1.3)),
    ellipse(-7, -32, 5, 1.8, flat('hollow-pale')),
  ],
});

const head: EnemyPart = { id: 'head', role: 'head', pivot: [0, -36], shapes: [litRect(-6, -41, 12, 8, 2.5, NEAR, 'quarry'), line([-4.5, -39.6, 4.5, -39.6], 0.6, 'hollow-pale')] };
const eye = (x: number, w: number): EnemyPart => ({ id: 'eye', role: 'glow', follows: 'head', pivot: [x, -38], shapes: [rect(x - w / 2, -38.5, w, 1.8, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } })] });

/** A ley crystal stud: a small cyan diamond with a glint. */
const crystal = (x: number, y: number, k = 1): Shape[] => [
  { ...path(`M ${x} ${y - 3.5 * k} L ${x + 2.2 * k} ${y} L ${x} ${y + 3.5 * k} L ${x - 2.2 * k} ${y} Z`, { fill: 'cyan', outline: true }), glow: { color: 'cyan', blur: 3 } },
  ellipse(x - 0.6 * k, y - 1.2 * k, 0.7 * k, 0.9 * k, flat('cyan-glow')),
];

/** The shield plate: cut stone in an iron frame studded with crystals; edge-on in the side view. */
function shield(face: boolean, x: number): EnemyPart {
  const w = face ? 32 : 9;
  const studs: Shape[] = face ? [...crystal(-8, -27), ...crystal(8, -27), ...crystal(0, -19, 1.2), ...crystal(-8, -12), ...crystal(8, -12)] : [...crystal(x + 3, -26, 0.8), ...crystal(x + 3, -14, 0.8)];
  return {
    id: 'shield',
    role: 'arm-front',
    pivot: [x, -22],
    shapes: [
      litRect(x - w / 2, -36, w, 32, 3.5, NEAR, 'quarry'),
      ...(face ? slateLips(x - w / 2 + 2, -36, w - 4, 32, 4) : slateLips(x - w / 2 + 1, -36, w - 2, 32, 4)),
      rect(x - w / 2, -36, w, 32, 3.5, trim('iron-rust', 2.4)),
      rect(x - w / 2 + 0.4, -35.6, w - 0.8, 31.2, 3.2, trim('iron', 0.9)),
      { ...rect(x - w / 2, -36, w, 32, 3.5, trim('vein', 0.5)), glow: { color: 'vein', blur: 1.5 }, alpha: 0.85 },
      ...(face ? [line([x - w / 2 + 3, -20, x + w / 2 - 3, -20], 1.6, 'iron-dark'), ellipse(x + 11, -7, 2.4, 1.6, flat('iron-rust'))] : []),
      ...studs,
    ],
  };
}

/** Its free arm, a stub with a stone fist. */
const arm = (from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id: 'arm',
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 6, 'hollow', true), ...ironBand(from[0] + (to[0] - from[0]) * 0.4 - 2.5, from[1] + (to[1] - from[1]) * 0.4, from[0] + (to[0] - from[0]) * 0.4 + 2.5, from[1] + (to[1] - from[1]) * 0.4, 1.6), litPath(`M ${to[0] - 4.5} ${to[1] + 1.5} Q ${to[0] - 4.5} ${to[1] - 2.5} ${to[0]} ${to[1] - 2.5} Q ${to[0] + 4.5} ${to[1] - 2.5} ${to[0] + 4.5} ${to[1] + 1.5} Q ${to[0] + 4.5} ${to[1] + 5.5} ${to[0]} ${to[1] + 5.5} Q ${to[0] - 4.5} ${to[1] + 5.5} ${to[0] - 4.5} ${to[1] + 1.5} Z`, NEAR, 'quarry')],
});

export const SHARDBACK_RIG: EnemyRigDef = {
  id: 'shardback',
  scale: 1,
  box: { size: [72, 62], anchor: [36, 54] },
  hip: [0, -10],
  tells: { windup: { part: 'shield', at: { side: [15, -36], down: [0, -36], up: [0, -36] } } },
  views: {
    side: [ground, leg('leg-back', 'leg-back', -10, FAR), arm([-4, -28], [-10, -16]), leg('leg-front', 'leg-front', 1, NEAR), torso(4), head, eye(4, 4), shield(false, 15)],
    down: [ground, leg('leg-back', 'leg-back', -12, FAR), leg('leg-front', 'leg-front', 4, NEAR), arm([-13, -28], [-18, -16]), torso(6), head, eye(0, 7), shield(true, 0)],
    up: [ground, shield(true, 0), leg('leg-back', 'leg-back', -12, FAR), leg('leg-front', 'leg-front', 4, NEAR), torso(6), head, arm([13, -28], [18, -16], true)],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.6 }],
    walk: [
      { step: 2, lift: 1.5, bob: -0.5, glow: 0.6 },
      { step: 0, bob: 0.5, scaleY: 0.985, glow: 0.6 },
      { step: -2, lift: 1.5, bob: -0.5, glow: 0.6 },
      { step: 0, bob: 0.5, scaleY: 0.985, glow: 0.6 },
    ],
    turn: [
      { step: 1, lean: -0.05, glow: 0.6 },
      { step: -1, lean: 0.05, glow: 0.6 },
    ],
    // 076: gather (it hunches behind the plate), coil (the plate drawn far back, the body twisted back on a planted
    // foot), peak (the crystals flaring; render trembles it). The bash thrusts it through.
    windup: [
      { armFront: 0.05, squash: 0.12, sink: 1.5, head: 0.15, headLift: 2, glow: 0.8 },
      { armFront: -0.65, spread: -4, lean: -0.3, step: -2, squash: -0.05, head: -0.15, glow: 1 },
      { armFront: -0.8, spread: -6, lean: -0.38, step: -2.5, squash: -0.08, head: -0.2, glow: 1 },
    ],
    swipe: [
      { armFront: 0.3, spread: 4, lean: 0.3, step: 3, shift: 3, squash: -0.06, glow: 1 },
      { armFront: 0.3, spread: 3, lean: 0.25, step: 3, shift: 2, glow: 1 },
    ],
    // Overextended: the plate low and forward, its back open.
    recover: [{ armFront: 0.35, lean: 0.18, sink: 2, squash: 0.05, glow: 0.3 }],
    // Rocked back behind the plate.
    hit: [{ lean: -0.2, head: -0.3, bob: 1, squash: 0.08, armFront: -0.12, glow: 0.6 }],
    // The plate lifted, its front open; then set down again.
    stagger: [
      { armFront: -1.15, spread: -3, lean: -0.35, head: -0.35, step: -2, lift: 2, legFront: -0.35, glow: 0.4 },
      { armFront: -0.3, lean: -0.1, squash: 0.06, glow: 0.5 },
    ],
    block: [{ armFront: -0.15, lean: -0.08, glow: 1 }],
    // It sinks behind the plate.
    death: [{ sink: 4, squash: 0.18, head: 0.4, headLift: 4, armFront: 0.15, lean: 0.1, glow: 0.1 }],
  },
};
