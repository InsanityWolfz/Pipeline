import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// The Bulwark (034, draft for Shaun's review): a hulking construct of grey-blue quarry
// stone bound in iron, hunched behind a tall rune-carved shield plate it turns slowly
// toward you. On its back a seam glows gold round the core it drops: the place to hit.
// Its free arm rears back to lob bombs; it plants the shield to pound the ground.

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x + 5, -16],
  shapes: [rect(x, -18, 11, 18, 3, solid(fill)), rect(x - 1, -4, 13, 4, 1.5, solid('iron-dark'))],
});

/** The lobbing arm: an iron-banded stone limb and a heavy fist, swinging about the shoulder. */
const arm = (id: string, from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id,
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [line([from[0], from[1], to[0], to[1]], 9, 'hollow', true), line([from[0], from[1] + 5, to[0], to[1] - 4], 2, 'iron-dark'), ellipse(to[0], to[1] + 2, 7, 6.5, solid('hollow-light'))],
});

/** The hulking body: a stone barrel bound by iron bands, rust bleeding from the rivets. */
const torso = (shadeX: number): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -36],
  shapes: [
    path('M -21 -56 Q -25 -34 -18 -16 L 18 -16 Q 25 -34 21 -56 Q 0 -63 -21 -56 Z', solid('hollow')),
    path(`M ${shadeX} -58 Q ${shadeX + 8} -36 ${shadeX + 5} -16 L 18 -16 Q 25 -34 21 -56 Z`, flat('hollow-dark')),
    rect(-22, -46, 44, 4, 1.5, solid('iron')),
    rect(-20, -27, 40, 4, 1.5, solid('iron')),
    path('M -12 -42 Q -11 -36 -13 -30', trim({ id: 'iron-rust', alpha: 0.7 }, 1.6)),
    ellipse(-12, -54, 7, 3, flat('hollow-light')),
  ],
});

const head: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -62],
  shapes: [rect(-8, -70, 16, 11, 3, solid('hollow-light')), rect(-8, -61, 16, 2, 1, flat('hollow-dark'))],
};

/** Its eye slit: one cyan line, glowing brighter as it winds up. */
const eye = (x: number, w: number): EnemyPart => ({
  id: 'eye',
  role: 'glow',
  pivot: [x, -65],
  shapes: [rect(x - w / 2, -66, w, 2.2, 1, { fill: 'cyan', glow: { color: 'cyan', blur: 5 } })],
});

/** The core seam down its back: a gold crack round the core, glowing. The target. */
export const BULWARK_SEAM = { at: [0, -40] as const, side: -20, halo: 12, haloColor: 'gold-trim', pulseMs: 900, rest: 0.25, peak: 0.6 } as const;
const seam = (x: number, wide: boolean): EnemyPart => ({
  id: 'seam',
  role: 'glow',
  pivot: [x, -40],
  shapes: [
    { ...path(`M ${x} -54 L ${x + (wide ? 3 : 1.5)} -46 L ${x - (wide ? 2 : 1)} -40 L ${x + (wide ? 2.5 : 1.2)} -32 L ${x} -22`, trim('gold-trim', wide ? 2.4 : 1.6)), glow: { color: 'gold-trim', blur: 6 } },
    ellipse(x, -40, wide ? 5.5 : 3, wide ? 6 : 4, { fill: { radial: [x, -40, 6], stops: [{ at: 0, color: 'gold-trim' }, { at: 1, color: 'gold-shade' }] }, outline: true, glow: { color: 'gold-trim', blur: 8 } }),
  ],
});

/**
 * The shield's ley runes (041 lights them red when it enrages): three chevrons down its face, `half` px wide either side
 * and `dip` deep, at `face` heights; edge-on in the side view, one line `side.dx` px past the shield's middle.
 */
export const BULWARK_RUNES = { face: [-46, -34, -22] as const, half: 6, dip: 6, side: { x: 22, dx: 2, y0: -50, y1: -20 } } as const;

/** The shield plate: tall cut stone in an iron frame, three ley runes down it; turned edge-on in the side view. */
function shield(face: boolean, x: number): EnemyPart {
  const w = face ? 46 : 12;
  const R = BULWARK_RUNES;
  const runes: Shape[] = face
    ? R.face.map((y) => ({ ...path(`M ${-R.half} ${y} L 0 ${y + R.dip} L ${R.half} ${y}`, trim('cyan', 1.4)), glow: { color: 'cyan', blur: 3 } }))
    : [line([x + R.side.dx, R.side.y0, x + R.side.dx, R.side.y1], 1.2, { id: 'cyan', alpha: 0.8 })];
  return {
    id: 'shield',
    role: 'arm-front',
    pivot: [x, -44],
    shapes: [
      rect(x - w / 2, -62, w, 54, 4, { fill: { linear: [x - w / 2, -62, x + w / 2, -8], stops: [{ at: 0, color: 'hollow-pale' }, { at: 0.5, color: 'hollow-light' }, { at: 1, color: 'hollow' }] }, outline: true }),
      rect(x - w / 2, -62, w, 54, 4, trim('iron', 2.4)),
      ...(face ? [line([x - w / 2 + 3, -35, x + w / 2 - 3, -35], 2, 'iron-dark'), ellipse(x - 14, -12, 3, 2, flat('iron-rust'))] : []),
      ...runes,
    ],
  };
}

export const BULWARK_RIG: EnemyRigDef = legacyRig({
  id: 'bulwark',
  scale: 1,
  box: { size: [112, 104], anchor: [56, 94] },
  hip: [0, -18],
  views: {
    // Facing right: the shield edge-on in front, the throwing arm behind, the seam glowing on its back.
    side: [
      leg('leg-back', 'leg-back', -13, 'hollow-dark'),
      arm('arm', [-6, -52], [-14, -30]),
      leg('leg-front', 'leg-front', 2, 'hollow'),
      torso(6),
      seam(BULWARK_SEAM.side, false),
      head,
      eye(5, 6),
      shield(false, BULWARK_RUNES.side.x),
    ],
    // Facing the camera: the shield's face covers the body; the eye shows over its top.
    down: [
      leg('leg-back', 'leg-back', -16, 'hollow-dark'),
      leg('leg-front', 'leg-front', 5, 'hollow'),
      arm('arm', [-20, -52], [-28, -32]),
      torso(8),
      head,
      eye(0, 9),
      shield(true, 0),
    ],
    // Its back to the camera: the shield behind it, the core seam the target.
    up: [
      shield(true, 0),
      leg('leg-back', 'leg-back', -16, 'hollow-dark'),
      leg('leg-front', 'leg-front', 5, 'hollow'),
      torso(8),
      seam(0, true),
      head,
      arm('arm', [20, -52], [28, -32], true),
    ],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.7 }],
    walk: [
      { step: 3, lift: 2, bob: -1 },
      { step: 0, bob: 1, scaleY: 0.98 },
      { step: -3, lift: 2, bob: -1 },
      { step: 0, bob: 1, scaleY: 0.98 },
    ],
    // Shuffling round on the spot behind the shield.
    turn: [
      { step: 1.5, lean: -0.05 },
      { step: -1.5, lean: 0.05 },
    ],
    // Rearing back, the arm raised high with a bomb.
    lob: [{ armBack: 2.6, lean: -0.22, bob: -2, glow: 1 }],
    throw: [{ armBack: -0.7, lean: 0.18, glow: 0.9 }],
    // The pound: the shield planted, then slammed down.
    windup: [{ armFront: -0.25, armBack: 1.2, sink: 2, lean: 0.08, glow: 1 }],
    swipe: [
      { armFront: 0.2, armBack: -0.4, sink: 5, scaleY: 0.9, glow: 1 },
      { armFront: 0.25, armBack: -0.5, sink: 6, scaleY: 0.88, glow: 1 },
    ],
    recover: [{ armFront: 0.25, armBack: -0.4, sink: 4, scaleY: 0.92, lean: 0.12, glow: 0.35 }],
    hit: [{ lean: -0.1, bob: 1 }],
    // A shot rings off the shield: it rocks back behind it.
    block: [{ armFront: -0.18, lean: -0.08, glow: 1 }],
    // 041 (draft for Shaun's eye): the enrage's roar, head thrown back and shaking; the stomp's brace, its weight
    // rocked forward onto the shield with a back foot raised; the stamp down behind it.
    roar: [
      { lean: -0.2, bob: -3, armBack: 1.4, armFront: -0.2, glow: 1 },
      { lean: -0.24, bob: -2, armBack: 1.6, armFront: -0.24, glow: 1 },
    ],
    brace: [{ lean: 0.16, step: -4, lift: 6, armBack: 0.6, sink: 1, glow: 1 }],
    stomp: [{ lean: 0.07, step: -2, sink: 5, scaleY: 0.9, glow: 1 }],
  },
});
