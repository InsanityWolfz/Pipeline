import { DEATH_POSES, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, line, path, rect } from './types';

// The gale ram (065, draft for Shaun's review): a heavy wind construct of the builders, a broad slate housing on four
// stout brass-shod legs, its whole face a great brass-ringed fan whose blades spin up as it winds up its gust (the
// blades are the arm role, turned per pose), a ley-cyan hub at its heart and curled ram's horns of brass to either side.
// Light from the top left; world px round the feet.

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
        path('M -18 -10 L -18 -32 Q -10 -40 6 -38 L 12 -36 L 12 -10 Q -2 -6 -18 -10 Z', { fill: housing, outline: true }),
        line([-17, -16, 11, -16], 1.6, 'brass', false),
        horn(4, -36, -1),
        ellipse(-8, -32, 4, 1.4, { fill: { id: 'storm-pale', alpha: 0.6 } }),
      ]
    : [
        path('M -17 -10 L -17 -32 Q 0 -42 17 -32 L 17 -10 Q 0 -5 -17 -10 Z', { fill: housing, outline: true }),
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
        return path(`M ${(ca * 2).toFixed(2)} ${(-22 + sa * 2).toFixed(2)} Q ${pt(7, 0.5)} ${pt(10.5, 0.15)} L ${pt(10, -0.25)} Z`, { fill: 'rock-light', outline: true });
      }),
});

/** Its hub: a ley-cyan eye at the fan's heart, glowing harder as it gusts. */
const hub = (side: boolean): EnemyPart => ({
  id: 'hub',
  role: 'glow',
  pivot: [side ? 14 : 0, -22],
  shapes: [ellipse(side ? 14 : 0, -22, side ? 1.2 : 2.4, 2.4, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 5 } })],
});

export const GALE_RAM_RIG: EnemyRigDef = {
  id: 'gale-ram',
  scale: 1,
  box: { size: [60, 56], anchor: [30, 50] },
  hip: [0, -10],
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
    // Winding up its gust: it plants and leans in, its fan spinning up.
    windup: [
      { sink: 1, lean: 0.08, armFront: 0.3, glow: 0.8 },
      { sink: 1, lean: 0.08, armFront: 1.1, glow: 1 },
    ],
    // The gust: thrust back on its heels, the fan a blur.
    swipe: [
      { lean: -0.12, armFront: 0.6, glow: 1 },
      { lean: -0.1, armFront: 1.4, glow: 0.9 },
    ],
    recover: [{ sink: 0.5, armFront: 0.2, glow: 0.3 }],
    hit: [{ lean: -0.15, bob: 1, armFront: 0.5, glow: 0.7 }],
    death: DEATH_POSES,
  },
};
