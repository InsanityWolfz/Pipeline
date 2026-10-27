import { legacyRig, type EnemyPart, type EnemyRigDef } from './enemyRig';
import { ellipse, flat, line, path, rect, solid, trim } from './types';

// The bellows hound (061, draft for Shaun's review): a lean forge-hound construct of the old builders, an iron frame on
// four long thin legs, its chest a leather bellows between brass ribs that heaves as it runs, an iron muzzle with
// ember eyes and a brass vent at its throat, and a ley-cyan rivet on its shoulder (the builders' work). Its eyes and
// vent blaze as it plants for a dash. Light from the top left; world px round the feet.

const ground: EnemyPart = { id: 'shadow', role: 'ground', pivot: [0, 0], shapes: [ellipse(0, -1, 16, 3.5, { fill: { id: 'ground-shade', alpha: 0.3 } })] };

/** A long thin iron leg with a clawed foot, its top under the body. */
const legShapes = (x: number, fill: string) => [line([x, -15, x - 1.5, -7, x, -1], 3.2, fill, true), rect(x - 3, -2.5, 6, 2.5, 1, solid('iron-dark'))];
const legs = (id: string, role: 'leg-back' | 'leg-front', xs: readonly number[], fill: string): EnemyPart => ({
  id,
  role,
  pivot: [xs[0] ?? 0, -14],
  shapes: xs.flatMap((x) => legShapes(x, fill)),
});

const leather = { linear: [0, -28, 0, -14] as const, stops: [{ at: 0, color: 'leather' }, { at: 1, color: 'leather-dark' }] };

/** Side-on: an iron spine over a bellows chest (leather folds between brass ribs), a thin tail. */
const bodySide: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    line([-16, -24, -24, -30], 2, 'iron', true),
    path('M -16 -27 Q -18 -20 -14 -15 L 8 -14 Q 13 -20 9 -27 Z', { fill: leather, outline: true }),
    ...[-10, -4, 2].map((x) => path(`M ${x} -26 Q ${x - 1.5} -20 ${x} -15`, trim('leather-dark', 1))),
    rect(-13, -27, 2, 13, 0.8, solid('brass')),
    rect(5, -27, 2, 13, 0.8, solid('brass')),
    rect(-18, -30, 30, 4, 1.5, { fill: { linear: [0, -30, 0, -26], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron' }] }, outline: true }),
    ellipse(-6, -28, 1.4, 1.4, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
  ],
};

/** The head side-on: a long iron muzzle, low and forward, a brass vent under the jaw. */
const headSide: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [12, -26],
  shapes: [
    path('M 9 -32 L 18 -31 L 25 -27 L 24 -23 L 14 -22 Q 9 -25 9 -32 Z', { fill: { linear: [0, -32, 0, -22], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
    path('M 11 -33 L 13 -37 L 15 -32 Z', solid('iron')),
    ellipse(14, -22, 3, 1.6, solid('brass')),
  ],
};
/** Its eyes and throat vent: a glow part, blazing in the wind-up. */
const embersSide: EnemyPart = {
  id: 'eyes',
  role: 'glow',
  pivot: [17, -29],
  shapes: [ellipse(18, -29, 1.6, 1, { fill: 'cinder-light', glow: { color: 'cinder', blur: 4 } }), ellipse(14, -21.6, 1.8, 0.8, { fill: 'cinder', glow: { color: 'cinder', blur: 4 } })],
};

/** Face-on: the bellows chest between its forelegs, the muzzle over it. */
const bodyDown: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -20],
  shapes: [
    ellipse(0, -21, 10, 8, { fill: leather, outline: true }),
    ...[-4, 0, 4].map((x) => line([x, -27, x, -15], 1, 'leather-dark')),
    rect(-10, -23, 20, 2, 0.8, solid('brass')),
  ],
};
const headDown: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -30],
  shapes: [
    path('M -6 -38 L 6 -38 Q 7 -31 3 -27 L -3 -27 Q -7 -31 -6 -38 Z', { fill: { linear: [0, -38, 0, -27], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
    path('M -6 -38 L -8 -42 L -3 -38 Z', solid('iron')),
    path('M 6 -38 L 8 -42 L 3 -38 Z', solid('iron')),
    ellipse(0, -27, 2.6, 1.4, solid('brass')),
  ],
};
const embersDown: EnemyPart = {
  id: 'eyes',
  role: 'glow',
  pivot: [0, -33],
  shapes: [-3, 3].map((x) => ellipse(x, -33, 1.3, 1, { fill: 'cinder-light', glow: { color: 'cinder', blur: 4 } })),
};
/** From behind: its iron back plate over the bellows, the tail up. */
const bodyUp: EnemyPart = {
  id: 'body',
  role: 'body',
  pivot: [0, -22],
  shapes: [
    path('M -6 -38 L -8 -42 L -3 -38 Z', solid('iron')),
    path('M 6 -38 L 8 -42 L 3 -38 Z', solid('iron')),
    path('M -6 -38.5 L 6 -38.5 Q 7.5 -32 4 -28 L -4 -28 Q -7.5 -32 -6 -38.5 Z', { fill: { linear: [0, -38, 0, -28], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron' }] }, outline: true }),
    ellipse(0, -21, 10, 8, { fill: leather, outline: true }),
    rect(-9, -30, 18, 14, 3, { fill: { linear: [0, -30, 0, -16], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron' }] }, outline: true }),
    ellipse(0, -27, 1.4, 1.4, { fill: 'cyan', glow: { color: 'cyan', blur: 3 } }),
    line([0, -18, 0, -12], 2, 'iron', true),
    ellipse(-4, -29, 3, 1, flat('iron-light')),
  ],
};

export const BELLOWS_HOUND_RIG: EnemyRigDef = legacyRig({
  id: 'bellows-hound',
  scale: 1,
  box: { size: [68, 56], anchor: [32, 50] },
  hip: [0, -14],
  views: {
    side: [ground, legs('legs-far', 'leg-back', [-12, 7], 'iron-dark'), bodySide, headSide, embersSide, legs('legs-near', 'leg-front', [-9, 10], 'iron')],
    down: [ground, legs('legs-far', 'leg-back', [-6, 6], 'iron-dark'), bodyDown, legs('legs-near', 'leg-front', [-4, 4], 'iron'), headDown, embersDown],
    up: [ground, legs('legs-near', 'leg-front', [-6, 6], 'iron'), legs('legs-far', 'leg-back', [-4, 4], 'iron-dark'), bodyUp],
  },
  poses: {
    idle: [{ bob: 0, glow: 0.45 }],
    walk: [
      { step: 3, lift: 2, bob: -1, glow: 0.45 },
      { step: 0, bob: 0.5, glow: 0.45 },
      { step: -3, lift: 2, bob: -1, glow: 0.45 },
      { step: 0, bob: 0.5, glow: 0.45 },
    ],
    // Planted, the bellows drawing in: crouched low, eyes and vent blazing.
    windup: [
      { lean: 0.12, sink: 2, scaleY: 0.94, glow: 1 },
      { lean: 0.12, sink: 1, scaleY: 1, glow: 0.8 },
    ],
    // The dash: stretched flat out.
    swipe: [
      { lean: 0.22, step: 5, lift: 3, bob: -2, glow: 1 },
      { lean: 0.22, step: -5, lift: 3, bob: -2, glow: 1 },
    ],
    recover: [{ lean: -0.05, sink: 1, glow: 0.3 }],
    hit: [{ lean: -0.15, bob: 1, glow: 0.45 }],
  },
});
