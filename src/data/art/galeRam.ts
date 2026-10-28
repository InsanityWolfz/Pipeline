import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { glassInlay, rimOf, rivets, stormVein } from './enemyLook';
import { ellipse, line, path, rect } from './types';

// The gale ram (065, draft for Shaun's review): a heavy wind construct of the builders, a broad slate housing on four
// stout brass-shod legs, its whole face a great brass-ringed fan whose blades spin up as it winds up its gust (the
// blades are the arm role, turned per pose), a ley-cyan hub at its heart and curled ram's horns of brass to either side.
// Light from the top left; world px round the feet.
// 076: the Storm-works look: the slate housing rimmed in pale storm light, brass horns, rivets and shod legs,
// storm-glass blade tips, violet lightning in its seams; its hub stays cyan (a ley mark). Its wind-up rears back on its
// hind legs, drops its head as the fan spins up (two frames), and plants wide with the fan a blur at the peak.

const housing = { linear: [-16, -38, 16, -8] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.4, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 18, 4, { fill: { id: 'ground-shade', alpha: 0.32 } })] };

/** Stout legs with brass shoes. */
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [0, -8],
  shapes: xs.flatMap((x) => [rect(x - 3, -12, 6, 10, 2, { fill, outline: true }), rect(x - 3.5, -4, 7, 3.5, 1.2, { fill: 'brass-dark', outline: true })]),
});

/** A curled brass horn at (x, y), curling `dir` out. */
const horn = (x: number, y: number, dir: number) => path(`M ${x} ${y} Q ${x + dir * 9} ${y - 8} ${x + dir * 8} ${y + 2} Q ${x + dir * 6} ${y + 7} ${x + dir * 2} ${y + 4}`, { stroke: { color: 'brass', width: 3 }, outline: false });

/** The housing: a broad slate body banded in brass, with its horns (the side view's body runs back behind the fan). */
const body = (side: boolean): EnemyPart => ({
  id: 'housing',
  role: 'body',
  pivot: [0, -22],
  shapes: side
    ? [
        path('M -18 -10 L -18 -32 Q -10 -40 6 -38 L 12 -36 L 12 -10 Q -2 -6 -18 -10 Z', { fill: housing, outline: true, rim: rimOf('storm') }),
        line([-17, -16, 11, -16], 1.6, 'brass', false),
        ...rivets([[-14, -16], [-4, -16], [6, -16]], 0.7),
        ...stormVein([-14, -28, -10, -24, -12, -20], 0.5),
        horn(4, -36, -1),
        ellipse(-8, -32, 4, 1.4, { fill: { id: 'storm-pale', alpha: 0.6 } }),
      ]
    : [
        path('M -17 -10 L -17 -32 Q 0 -42 17 -32 L 17 -10 Q 0 -5 -17 -10 Z', { fill: housing, outline: true, rim: rimOf('storm') }),
        ...rivets([[-14, -12], [14, -12]], 0.7),
        horn(-14, -34, -1),
        horn(14, -34, 1),
        ellipse(-9, -33, 4, 1.4, { fill: { id: 'storm-pale', alpha: 0.6 } }),
      ],
});

/** The fan's ring (front: face on; side: edge on at its front). */
const ring = (side: boolean): EnemyPart => ({
  id: 'ring',
  role: 'head',
  pivot: [side ? 13 : 0, -22],
  shapes: side
    ? [ellipse(13, -22, 4.5, 13, { fill: 'brass-dark', outline: true }), ellipse(13.5, -22, 2.8, 11, { fill: 'ink' })]
    : [ellipse(0, -22, 13, 13, { fill: 'brass', outline: true }), ellipse(0, -22, 11, 11, { fill: 'ink' })],
});

/** The blades: four swept vanes round the hub, turned by the pose's `armFront` (edge on, from the side, they don't turn). */
const blades = (side: boolean): EnemyPart => ({
  id: 'blades',
  role: side ? 'head' : 'arm-front',
  pivot: [side ? 13.5 : 0, -22],
  shapes: side
    ? [line([13.5, -32, 13.5, -12], 1.6, 'rock-light', false), line([12.8, -27, 14.2, -17], 1.2, 'rock-pale', false)]
    : [0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const pt = (r: number, off: number) => `${(Math.cos(a + off) * r).toFixed(2)} ${(-22 + Math.sin(a + off) * r).toFixed(2)}`;
        return path(`M ${(ca * 2).toFixed(2)} ${(-22 + sa * 2).toFixed(2)} Q ${pt(7, 0.5)} ${pt(10.5, 0.15)} L ${pt(10, -0.25)} Z`, { fill: { linear: [-10, -32, 10, -12], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 0.85, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] }, outline: true });
      }).concat([0, 1, 2, 3].flatMap((i) => glassInlay(Math.cos((i * Math.PI) / 2 + 0.1) * 9.2, -22 + Math.sin((i * Math.PI) / 2 + 0.1) * 9.2, 1.1))),
});

/** Its hub: a ley-cyan eye at the fan's heart, glowing harder as it gusts. */
const hub = (side: boolean): EnemyPart => ({
  id: 'hub',
  role: 'glow',
  follows: 'head',
  pivot: [side ? 14 : 0, -22],
  shapes: [ellipse(side ? 14 : 0, -22, side ? 1.2 : 2.4, 2.4, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 5 } })],
});

export const GALE_RAM_RIG: EnemyRigDef = {
  id: 'gale-ram',
  scale: 1,
  box: { size: [72, 62], anchor: [36, 54] },
  hip: [0, -10],
  tells: { windup: { part: 'ring', at: { side: [13, -35], down: [0, -35], up: [0, -35] } } },
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-12, 4], 'iron-dark'), body(true), ring(true), blades(true), hub(true), legs('legs-near', 'leg-front', [-8, 8], 'iron')],
    down: [ground, legs('legs', 'leg-back', [-11, 11], 'iron'), body(false), ring(false), blades(false), hub(false)],
    up: [ground, legs('legs', 'leg-back', [-11, 11], 'iron'), ring(false), body(false)],
  },
  poses: {
    idle: [{ armFront: 0, glow: 0.4 }],
    // A heavy stride, the fan idling round.
    walk: [
      { step: 2, lift: 1.5, bob: -0.5, armFront: 0, glow: 0.4 },
      { step: 0, bob: 0, armFront: 0.4, glow: 0.4 },
      { step: -2, lift: 1.5, bob: -0.5, armFront: 0.8, glow: 0.4 },
      { step: 0, bob: 0, armFront: 1.2, glow: 0.4 },
    ],
    // 076: gather (rearing back on its hind legs), coil (head down, the fan spinning up over two frames), peak (planted
    // wide, the fan a blur; render trembles it). The gust recoils with a squash.
    windup: [
      { tilt: -0.14, lean: -0.15, armFront: 0.2, glow: 0.6 },
      { lean: 0.18, sink: 4, squash: 0.08, armFront: 1.1, glow: 0.9 },
      { lean: 0.18, sink: 4, squash: 0.08, armFront: 1.9, glow: 1 },
      { lean: 0.2, sink: 5, squash: 0.14, step: 2.5, armFront: 2.6, glow: 1 },
    ],
    // The gust: thrust back on its heels, squashed, the fan a blur.
    swipe: [
      { lean: -0.16, squash: 0.1, armFront: 0.6, glow: 1 },
      { lean: -0.1, armFront: 1.4, glow: 0.9 },
    ],
    recover: [{ sink: 0.5, armFront: 0.2, glow: 0.3 }],
    // Knocked sideways, its fan wobbling.
    hit: [{ lean: -0.15, tilt: 0.08, bob: 1, armFront: 0.5, squash: 0.05, glow: 0.7 }],
    // The same, harder, a foreleg up; then planted again.
    stagger: [
      { tilt: -0.22, lean: -0.2, legFront: -0.55, step: 2, lift: 2, armFront: 0.9, glow: 0.5 },
      { tilt: -0.05, squash: 0.08, armFront: 0.3, glow: 0.5 },
    ],
    // The fan winds down.
    death: [{ sink: 2, squash: 0.16, lean: 0.1, armFront: 0.1, glow: 0 }],
  },
};
