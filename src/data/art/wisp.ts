import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { glowLine, litEllipse, mossTuft, rimOf, tone } from './enemyLook';
import { ellipse, line, path, type Shape } from './types';

// The Wisp (016): a floating violet flame spirit behind a stone mask, with two drifting hands. It casts slow orbs that
// form between its hands. Violet keeps it apart from the player's ley cyan.
// 076: the Mossbound ruins look: the mask is weathered ruin stone with a hairline crack, moss in it and a cyan rune
// on its brow; the flame keeps its violet, shaded and rimmed. Its wind-up dips, rises with its hands wide as the orb
// grows, and snaps its hands round the full orb.

const MASK = tone('rock', 'rock-light', 'rock-pale');

const FLAME = 'M 0 -41 Q 11 -31 9 -21 Q 7 -11 0 -8 Q -7 -11 -9 -21 Q -11 -31 0 -41 Z';
const flame: Shape = path(FLAME, {
  fill: { radial: [-2, -24, 16], stops: [{ at: 0, color: 'wisp-light' }, { at: 0.5, color: 'wisp' }, { at: 1, color: 'wisp-dark' }] },
  outline: true,
  glow: { color: 'wisp', blur: 6 },
  rim: rimOf('ruin'),
});
/** The flame's inner tongues, flickering up from its heart. */
const tongues: Shape[] = [
  path('M 0 -35 Q 5 -28 4 -21 Q 2 -16 0 -15 Q -3 -18 -3 -24 Q -3 -30 0 -35 Z', { fill: { id: 'wisp-light', alpha: 0.55 } }),
  path('M -4 -33 Q -6 -30 -6 -26', { stroke: { color: { id: 'snow', alpha: 0.5 }, width: 0.8 } }),
];
const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 7, 2.2, { fill: { id: 'ground-shade', alpha: 0.3 } })] };
const body: EnemyPart = { id: 'body', role: 'body', pivot: [0, -22], shapes: [flame, ...tongues] };

/** The ruin-stone mask: shaded, cracked, mossed, the rune on its brow. */
const mask = (x: number, rx: number): EnemyPart => ({
  id: 'mask',
  role: 'head',
  pivot: [x, -25],
  shapes: [
    litEllipse(x, -25, rx, 6.5, MASK, 'ruin'),
    // The hairline crack from the brow down to the cheek.
    path(`M ${x + rx * 0.2} -31.2 L ${x + rx * 0.35} -28 L ${x + rx * 0.1} -26.5 L ${x + rx * 0.45} -23`, { stroke: { color: 'rock-dark', width: 0.55 } }),
    ...mossTuft(x - rx * 0.85, x - rx * 0.05, -30.4, 1.5),
    // The eye slits and mouth, carved.
    line([x - rx * 0.6, -25.6, x - rx * 0.15, -25], 1.4, 'ink'),
    line([x + rx * 0.15, -25, x + rx * 0.6, -25.6], 1.4, 'ink'),
    line([x - 0.7, -21.6, x + 0.7, -21.6], 1, 'ink'),
    // The brow's cyan rune.
    glowLine([x - 1.2, -29.2, x, -27.8, x + 1.2, -29.2], 0.6, 'cyan', 2),
  ],
});
const hand = (id: string, role: 'arm-back' | 'arm-front', x: number, mirror = false): EnemyPart => ({
  id,
  role,
  mirror,
  pivot: [0, -22],
  shapes: [
    ellipse(x, -19, 2.7, 3.3, { fill: { radial: [x - 0.8, -20.2, 3.4], stops: [{ at: 0, color: 'snow' }, { at: 0.4, color: 'wisp-light' }, { at: 1, color: 'wisp' }] }, outline: true, glow: { color: 'wisp', blur: 3 } }),
    line([x - 1, -21.4, x - 1.4, -23], 0.9, 'wisp-light'),
    line([x + 0.6, -21.6, x + 0.8, -23.2], 0.9, 'wisp-light'),
  ],
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
  box: { size: [56, 64], anchor: [28, 54] },
  hip: [0, -20],
  views: {
    side: [ground, hand('hand-back', 'arm-back', 8), body, mask(3, 4.2), orb(12), hand('hand-front', 'arm-front', 6)],
    down: [ground, body, mask(0, 5.5), orb(0), hand('hand-back', 'arm-back', -11), hand('hand-front', 'arm-front', 11, true)],
    up: [ground, hand('hand-back', 'arm-back', -11), hand('hand-front', 'arm-front', 11, true), body, orb(0)],
  },
  tells: { windup: { part: 'hand-front', at: { side: [6, -19], down: [11, -19], up: [11, -19] } } },
  poses: {
    idle: [{ bob: -3 }],
    walk: [{ bob: -4, lean: 0.1 }, { bob: -3, lean: 0.12, armFront: 0.1 }, { bob: -2, lean: 0.1 }, { bob: -3, lean: 0.08, armBack: 0.1 }],
    // 076: gather (the flame dips and narrows, hands down), coil (rising tall, hands wide apart, the orb growing),
    // peak (the hands snap round the full orb, the flame flaring; render trembles it).
    windup: [
      { bob: -0.5, squash: -0.08, armFront: -0.45, armBack: -0.45, spread: -1, glow: 0.9, charge: 0.15 },
      { bob: -7, squash: -0.14, armFront: 0.5, armBack: 0.5, spread: 5, lean: -0.1, charge: 0.6, glow: 1 },
      { bob: -7.5, squash: -0.18, armFront: 0.05, armBack: 0.05, spread: -3.5, lean: -0.12, charge: 1.15, glow: 1 },
    ],
    swipe: [
      { bob: -3, lean: 0.3, armFront: 0.5, armBack: 0.3, spread: 2, charge: 1, shift: 2 },
      { bob: -4, lean: -0.15, armFront: -0.2, charge: 0, squash: 0.06 },
    ],
    // The mask is knocked aside and the flame gutters short.
    hit: [{ bob: -2, lean: -0.3, squash: 0.16, head: -0.45, headLift: 0.5, glow: 0.6 }],
    // The flame blown sideways and the hands scattering; then gathering itself.
    stagger: [
      { bob: -2, lean: -0.6, squash: 0.12, head: -0.6, armFront: 0.7, armBack: -0.7, spread: 5, glow: 0.5 },
      { bob: -3, lean: -0.15, squash: -0.04, head: -0.15, spread: 1, glow: 0.8 },
    ],
    // The flame gutters out sideways and the mask cracks; the mask fades last.
    death: [{ bob: -1, lean: -0.7, squash: 0.25, head: -0.55, headLift: 2, armFront: -0.8, armBack: -0.8, spread: 3, glow: 0.2 }],
  },
};
