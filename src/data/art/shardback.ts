import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// The Shardback (035, draft for Shaun's review): the Bulwark's little cousin, a squat
// construct of grey-blue stone on short iron legs, hunched behind a shield plate studded
// with ley crystals, rust weeping from its rivets. Its runes flare (EnemyView adds the
// flare) as it winds up a bash; it plants the plate and shoves.

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 15, 4, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x + 4, -10],
  shapes: [rect(x, -11, 8, 11, 2.5, solid(fill)), rect(x - 0.5, -3, 9, 3, 1, solid('iron-dark'))],
});

/** The squat body: a stone dome bound by one iron band, rust under a rivet. */
const torso = (shade: number): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    path('M -14 -31 Q -17 -19 -12 -9 L 12 -9 Q 17 -19 14 -31 Q 0 -37 -14 -31 Z', solid('hollow')),
    path(`M ${shade} -33 Q ${shade + 6} -20 ${shade + 3} -9 L 12 -9 Q 17 -19 14 -31 Z`, flat('hollow-dark')),
    rect(-15, -22, 30, 3.5, 1.2, solid('iron')),
    path('M -8 -19 Q -7 -15 -9 -12', trim({ id: 'iron-rust', alpha: 0.7 }, 1.3)),
    ellipse(-7, -32, 5, 1.8, flat('hollow-pale')),
  ],
});

const head: EnemyPart = { id: 'head', role: 'head', pivot: [0, -36], shapes: [rect(-6, -41, 12, 8, 2.5, solid('hollow-light'))] };
const eye = (x: number, w: number): EnemyPart => ({ id: 'eye', role: 'glow', pivot: [x, -38], shapes: [rect(x - w / 2, -38.5, w, 1.8, 0.8, { fill: 'cyan', glow: { color: 'cyan', blur: 4 } })] });

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
      rect(x - w / 2, -36, w, 32, 3.5, { fill: { linear: [x - w / 2, -36, x + w / 2, -4], stops: [{ at: 0, color: 'hollow-pale' }, { at: 0.5, color: 'hollow-light' }, { at: 1, color: 'hollow' }] }, outline: true }),
      rect(x - w / 2, -36, w, 32, 3.5, trim('iron', 2)),
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
  shapes: [line([from[0], from[1], to[0], to[1]], 6, 'hollow', true), ellipse(to[0], to[1] + 1.5, 4.5, 4, solid('hollow-light'))],
});

export const SHARDBACK_RIG: EnemyRigDef = legacyRig({
  id: 'shardback',
  scale: 1,
  box: { size: [64, 60], anchor: [32, 52] },
  hip: [0, -10],
  views: {
    side: [ground, leg('leg-back', 'leg-back', -10, 'hollow-dark'), arm([-4, -28], [-10, -16]), leg('leg-front', 'leg-front', 1, 'hollow'), torso(4), head, eye(4, 4), shield(false, 15)],
    down: [ground, leg('leg-back', 'leg-back', -12, 'hollow-dark'), leg('leg-front', 'leg-front', 4, 'hollow'), arm([-13, -28], [-18, -16]), torso(6), head, eye(0, 7), shield(true, 0)],
    up: [ground, shield(true, 0), leg('leg-back', 'leg-back', -12, 'hollow-dark'), leg('leg-front', 'leg-front', 4, 'hollow'), torso(6), head, arm([13, -28], [18, -16], true)],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.6 }],
    walk: [
      { step: 2, lift: 1.5, bob: -1, glow: 0.6 },
      { step: 0, bob: 0.5, scaleY: 0.97, glow: 0.6 },
      { step: -2, lift: 1.5, bob: -1, glow: 0.6 },
      { step: 0, bob: 0.5, scaleY: 0.97, glow: 0.6 },
    ],
    turn: [
      { step: 1, lean: -0.05, glow: 0.6 },
      { step: -1, lean: 0.05, glow: 0.6 },
    ],
    // Drawing the plate back to shove, crouched.
    windup: [{ armFront: -0.3, lean: -0.12, sink: 2, glow: 1 }],
    // The bash: plate thrust forward, leaning into it.
    swipe: [
      { armFront: 0.25, lean: 0.22, step: 3, glow: 1 },
      { armFront: 0.3, lean: 0.25, step: 3, glow: 1 },
    ],
    // Overextended: the plate low and forward, its back open.
    recover: [{ armFront: 0.35, lean: 0.18, sink: 2, scaleY: 0.95, glow: 0.3 }],
    hit: [{ lean: -0.1, bob: 1, glow: 0.6 }],
    block: [{ armFront: -0.15, lean: -0.08, glow: 1 }],
  },
});
