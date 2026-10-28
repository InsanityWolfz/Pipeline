import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { ironBand, litEllipse, litPath, litRect, SLATE, slateLips, tone, type Tone } from './enemyLook';
import { ellipse, flat, line, path, rect, trim, type Shape } from './types';

// The Bulwark (034, draft for Shaun's review): a hulking construct of grey-blue quarry
// stone bound in iron, hunched behind a tall rune-carved shield plate it turns slowly
// toward you. On its back a seam glows gold round the core it drops: the place to hit.
// Its free arm rears back to lob bombs; it plants the shield to pound the ground.
// 076: the Quarry constructs look: quarry stone layered in slate, bound in rusted ley-iron with cyan veins through it,
// the rune-carved shield in a ley-iron rim, the gold seam kept. Each attack is a strip: the pound lifts the shield
// and sinks, raises it high, trembles; the lob reaches back, raises the arm high leaning far back, trembles; the
// stomp's brace puts its weight on the shield, lifts the back foot high, trembles.

const FAR = tone('hollow-dark', 'hollow-dark', 'hollow');
const NEAR = tone('hollow', 'hollow-light', 'hollow-pale');
const PALE = tone('hollow-light', 'hollow-pale', 'snow');

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, t: Tone): EnemyPart => ({
  id,
  role,
  pivot: [x + 5, -16],
  shapes: [litRect(x, -18, 11, 18, 3, t, 'quarry'), ...slateLips(x + 1, -18, 9, 12, 1), ...ironBand(x, -9, x + 11, -9, 2.6), litRect(x - 1, -4, 13, 4, 1.5, tone('iron-dark', 'iron-dark', 'iron'), 'quarry')],
});

/** The lobbing arm: an iron-banded stone limb and a heavy fist, swinging about the shoulder. */
const arm = (id: string, from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id,
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [
    line([from[0], from[1], to[0], to[1]], 9, 'hollow', true),
    line([from[0] - 2, from[1], to[0] - 2, to[1]], 2.2, { id: 'hollow-light', alpha: 0.7 }),
    ...ironBand(from[0] + (to[0] - from[0]) * 0.45 - 4, from[1] + (to[1] - from[1]) * 0.45, from[0] + (to[0] - from[0]) * 0.45 + 4, from[1] + (to[1] - from[1]) * 0.45 + 1, 2.4),
    litEllipse(to[0], to[1] + 2, 7, 6.5, NEAR, 'quarry'),
    line([to[0] - 3, to[1] + 4, to[0] + 3, to[1] + 4], 0.8, { id: 'hollow-dark', alpha: 0.6 }),
  ],
});

/** The hulking body: a stone barrel bound by iron bands, rust bleeding from the rivets. */
const torso = (shadeX: number): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -36],
  shapes: [
    litPath('M -21 -56 Q -25 -34 -18 -16 L 18 -16 Q 25 -34 21 -56 Q 0 -63 -21 -56 Z', SLATE, 'quarry'),
    ...slateLips(-20, -60, 40, 44, 5),
    path(`M ${shadeX} -58 Q ${shadeX + 8} -36 ${shadeX + 5} -16 L 18 -16 Q 25 -34 21 -56 Z`, flat({ id: 'hollow-dark', alpha: 0.55 })),
    ...ironBand(-22, -44, 22, -44, 4),
    ...ironBand(-20, -25, 20, -25, 4),
    path('M -12 -42 Q -11 -36 -13 -30', trim({ id: 'iron-rust', alpha: 0.7 }, 1.6)),
    ellipse(-12, -54, 7, 3, flat({ id: 'hollow-pale', alpha: 0.8 })),
  ],
});

const head: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -62],
  shapes: [litRect(-8, -70, 16, 11, 3, NEAR, 'quarry'), rect(-8, -61, 16, 2, 1, flat('hollow-dark')), line([-6, -68.5, 6, -68.5], 0.7, 'hollow-pale')],
};

/** Its eye slit: one cyan line, glowing brighter as it winds up. */
const eye = (x: number, w: number): EnemyPart => ({
  id: 'eye',
  role: 'glow',
  follows: 'head',
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
      litRect(x - w / 2, -62, w, 54, 4, PALE, 'quarry'),
      ...slateLips(x - w / 2 + 2, -62, w - 4, 54, 6),
      rect(x - w / 2, -62, w, 54, 4, trim('iron-rust', 3)),
      rect(x - w / 2 + 0.6, -61.4, w - 1.2, 52.8, 3.6, trim('iron', 1)),
      { ...rect(x - w / 2, -62, w, 54, 4, trim('vein', 0.6)), glow: { color: 'vein', blur: 2 }, alpha: 0.8 },
      ...(face ? [line([x - w / 2 + 3, -35, x + w / 2 - 3, -35], 2, 'iron-dark'), ellipse(x - 14, -12, 3, 2, flat('iron-rust'))] : []),
      ...runes,
    ],
  };
}

export const BULWARK_RIG: EnemyRigDef = {
  id: 'bulwark',
  scale: 1,
  box: { size: [120, 122], anchor: [60, 112] },
  hip: [0, -18],
  tells: {
    windup: { part: 'shield', at: { side: [22, -62], down: [0, -62], up: [0, -62] } },
    lob: { part: 'arm', at: { side: [-14, -28], down: [-28, -30], up: [28, -30] } },
    brace: { part: 'leg-back', at: { side: [-8, -2], down: [-11, -2], up: [-11, -2] } },
  },
  views: {
    // Facing right: the shield edge-on in front, the throwing arm behind, the seam glowing on its back.
    side: [
      leg('leg-back', 'leg-back', -13, FAR),
      arm('arm', [-6, -52], [-14, -30]),
      leg('leg-front', 'leg-front', 2, NEAR),
      torso(6),
      seam(BULWARK_SEAM.side, false),
      head,
      eye(5, 6),
      shield(false, BULWARK_RUNES.side.x),
    ],
    // Facing the camera: the shield's face covers the body; the eye shows over its top.
    down: [
      leg('leg-back', 'leg-back', -16, FAR),
      leg('leg-front', 'leg-front', 5, NEAR),
      arm('arm', [-20, -52], [-28, -32]),
      torso(8),
      head,
      eye(0, 9),
      shield(true, 0),
    ],
    // Its back to the camera: the shield behind it, the core seam the target.
    up: [
      shield(true, 0),
      leg('leg-back', 'leg-back', -16, FAR),
      leg('leg-front', 'leg-front', 5, NEAR),
      torso(8),
      seam(0, true),
      head,
      arm('arm', [20, -52], [28, -32], true),
    ],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.7 }],
    walk: [
      { step: 3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
      { step: -3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
    ],
    // Shuffling round on the spot behind the shield.
    turn: [
      { step: 1.5, lean: -0.05 },
      { step: -1.5, lean: 0.05 },
    ],
    // 076: the lob: reaching back, then the arm high with the bomb leaning far back, trembling; the throw stretches.
    lob: [
      { armBack: -0.7, lean: 0.12, squash: 0.08, sink: 1, glow: 0.8 },
      { armBack: 2.75, lean: -0.34, bob: -2, squash: -0.08, head: -0.2, glow: 1 },
      { armBack: 3.05, lean: -0.42, bob: -2.5, squash: -0.11, head: -0.25, glow: 1 },
    ],
    throw: [{ armBack: -0.9, lean: 0.26, shift: 2, squash: -0.08, glow: 0.9 }],
    // The pound: the shield lifts and it sinks; the shield raised high, stretched; trembling. Then slammed down.
    windup: [
      { raise: 2, armFront: 0.12, armBack: 0.5, sink: 3, squash: 0.12, glow: 0.9 },
      { raise: 9, armFront: -0.2, armBack: 2.3, lean: -0.2, bob: -1, squash: -0.1, head: -0.2, glow: 1 },
      { raise: 11, armFront: -0.26, armBack: 2.6, lean: -0.26, bob: -1.5, squash: -0.13, head: -0.25, glow: 1 },
    ],
    swipe: [
      { raise: -2, armFront: 0.22, armBack: -0.4, sink: 5, squash: 0.18, glow: 1 },
      { raise: -2, armFront: 0.25, armBack: -0.5, sink: 6, squash: 0.18, glow: 1 },
    ],
    recover: [{ armFront: 0.25, armBack: -0.4, sink: 4, squash: 0.08, lean: 0.12, glow: 0.35 }],
    // Flinch only: a snap of the head.
    hit: [{ lean: -0.1, head: -0.3, bob: 1, squash: 0.05 }],
    // A shot rings off the shield: it rocks back behind it.
    block: [{ armFront: -0.18, lean: -0.08, glow: 1 }],
    // 041: the enrage's roar, head thrown back and shaking (080 redraws it).
    roar: [
      { lean: -0.2, head: -0.3, bob: -3, armBack: 1.4, armFront: -0.2, glow: 1 },
      { lean: -0.24, head: -0.4, bob: -2, armBack: 1.6, armFront: -0.24, glow: 1 },
    ],
    // 076: the stomp's brace: its weight onto the shield, the back foot lifted high, trembling; the stamp squashes.
    brace: [
      { lean: 0.12, armFront: 0.12, sink: 1.5, squash: 0.06, glow: 0.9 },
      { lean: 0.2, step: -4, lift: 9, legBack: -0.45, armBack: 0.6, armFront: 0.1, glow: 1 },
      { lean: 0.25, step: -5, lift: 11, legBack: -0.6, armBack: 0.7, armFront: 0.12, squash: -0.05, glow: 1 },
    ],
    stomp: [{ lean: 0.07, step: -2, sink: 5, squash: 0.16, glow: 1 }],
    // It drops to one knee behind its shield; the seam's halo fades with it (the dissolve's).
    death: [{ sink: 6, squash: 0.1, lean: 0.15, legFront: 0.55, step: 2, raise: -3, armFront: 0.15, armBack: -0.6, head: 0.35, glow: 0.25 }],
  },
};
