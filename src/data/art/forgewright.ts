import { FORGE_INTRO } from './bossIntroPoses';
import { FORGE_SPRITES } from '../forgewrightAssets';
import type { EnemyPart, EnemyRigDef } from './enemyRig';
import { BRASS, cinderSeam, litRect, rimOf, rivets, soot, tone } from './enemyLook';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// The Forgewright (060, draft for Shaun's review): a hulking smith construct of the lost builders, riveted iron plates
// over a forge-hot core, a great hammer in its right hand and an ember-eyed helm. A seam of cyan ley runs down its
// plates (it's the builders' work). Its two bellows (leather folds on an iron frame, a brass nozzle) stand off its
// sides as their own sprites, joined to it by brass hoses render draws; they show whole, broken (torn, slack) and
// patching (the tears stitched with glowing brass). Light from the top left; world px round the feet.
// 076: the Forge constructs look: riveted iron with an ember rim over its forge core, soot creeping up its lower
// plates, brass fittings, cinder glowing in its seams; the ember-eyed helm and the cyan seam kept. The bellows take the
// same look. Each attack is a strip: the slam draws the hammer down and back, raises it high leaning back, trembles;
// the spray drops it low, draws it back to the side with the body twisted, trembles; the flood squats with both
// hands on the haft, raises it high overhead arched and stretched, and trembles through the longest hold.

const FAR = tone('iron-dark', 'iron-dark', 'iron');
const NEAR = tone('iron-dark', 'iron', 'iron-light');

const plate = { linear: [-24, -78, 24, -18] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 0.45, color: 'iron' }, { at: 1, color: 'iron-dark' }] };
const RIM = rimOf('forge');
const glowCore = { radial: [0, -46, 9] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.5, color: 'cinder' }, { at: 1, color: 'flame-dark' }] };

const leg = (id: string, role: 'leg-back' | 'leg-front', x: number, fill: string): EnemyPart => ({
  id,
  role,
  pivot: [x + 6, -18],
  shapes: [litRect(x, -22, 13, 22, 3, fill === 'iron' ? NEAR : FAR, 'forge'), soot(x, -14, 13, 9), litRect(x - 1.5, -5, 16, 5, 1.5, FAR, 'forge'), ...rivets([[x + 6.5, -14]], 1.6), ...cinderSeam([x + 2, -19, x + 2, -16], 0.5)],
});

/** Its free arm: a riveted iron limb ending in a heavy gauntlet. */
const arm = (id: string, from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => ({
  id,
  role: 'arm-back',
  mirror,
  pivot: from,
  shapes: [
    line([from[0], from[1], to[0], to[1]], 10, 'iron', true),
    line([from[0] - 2, from[1], to[0] - 2, to[1]], 2.2, { id: 'iron-light', alpha: 0.6 }),
    line([from[0], from[1] + 6, to[0], to[1] - 4], 2, 'iron-dark'),
    ellipse(to[0], to[1] + 2, 7.5, 7, { fill: { linear: [to[0] - 7.5, to[1] - 5, to[0] + 7.5, to[1] + 9], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true, rim: RIM }),
    ...rivets([[to[0] - 3, to[1] + 4], [to[0] + 3, to[1] + 4]], 0.9),
  ],
});

/** The hammer arm: limb, gauntlet and the great hammer held up along it, its head an iron block banded in brass. */
const hammer = (from: readonly [number, number], to: readonly [number, number], mirror = false): EnemyPart => {
  const [hx, hy] = to;
  return {
    id: 'hammer',
    role: 'arm-front',
    mirror,
    pivot: from,
    shapes: [
      line([from[0], from[1], hx, hy], 10, 'iron', true),
      line([from[0] - 2, from[1], hx - 2, hy], 2.2, { id: 'iron-light', alpha: 0.6 }),
      line([hx, hy + 6, hx, hy - 30], 3.2, 'wood-dark', true),
      line([hx - 0.8, hy + 4, hx - 0.8, hy - 28], 0.8, 'wood-light'),
      litRect(hx - 12, hy - 44, 24, 16, 3, NEAR, 'forge'),
      soot(hx - 12, hy - 34, 24, 6),
      litRect(hx - 12, hy - 39, 24, 4, 1, BRASS, 'forge'),
      ...rivets([[hx - 9, hy - 37], [hx + 9, hy - 37]], 0.8),
      ...cinderSeam([hx + 4, hy - 44, hx + 6, hy - 40], 0.6),
      ellipse(hx - 7, hy - 42, 3, 1.2, flat({ id: 'snow', alpha: 0.4 })),
      ellipse(hx, hy + 2, 7.5, 7, { fill: { linear: [hx - 7.5, hy - 5, hx + 7.5, hy + 9], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true, rim: RIM }),
    ],
  };
};

/** The plated body: iron plates riveted in brass, a cyan ley seam down them, the core's dark grille on its chest. */
const torso = (shadeX: number, grille: boolean): EnemyPart => ({
  id: 'torso',
  role: 'body',
  pivot: [0, -44],
  shapes: [
    path('M -26 -72 Q -30 -44 -21 -18 L 21 -18 Q 30 -44 26 -72 Q 0 -80 -26 -72 Z', { fill: plate, outline: true, rim: RIM }),
    path(`M ${shadeX} -74 Q ${shadeX + 9} -46 ${shadeX + 6} -18 L 21 -18 Q 30 -44 26 -72 Z`, flat({ id: 'iron-dark', alpha: 0.55 })),
    soot(-25, -40, 50, 22),
    rect(-27, -60, 54, 4, 1.5, solid('iron-dark')),
    rect(-24, -32, 48, 4, 1.5, solid('iron-dark')),
    ...cinderSeam([-25, -56.6, 25, -56.6], 0.6),
    ...cinderSeam([-22, -28.6, 22, -28.6], 0.6),
    ...rivets([-20, -8, 8, 20].map((x) => [x, -58] as const), 1.5),
    ...rivets([-18, 18].map((x) => [x, -30] as const), 1.5),
    path('M -14 -52 Q -12 -44 -15 -36', trim({ id: 'iron-rust', alpha: 0.75 }, 1.6)),
    { ...line([-22, -68, -22, -22], 1, { id: 'cyan', alpha: 0.75 }), glow: { color: 'cyan', blur: 3 } },
    ...(grille ? [rect(-8, -53, 16, 14, 2, { fill: glowCore, outline: true }), ...[-4, 0, 4].map((x) => line([x, -52, x, -40], 1.4, 'iron-dark'))] : []),
    ellipse(-14, -70, 8, 3, flat({ id: 'iron-light', alpha: 0.8 })),
  ],
});

const head: EnemyPart = {
  id: 'head',
  role: 'head',
  pivot: [0, -80],
  shapes: [path('M -10 -76 L -10 -86 Q 0 -94 10 -86 L 10 -76 Z', { fill: plate, outline: true, rim: RIM }), litRect(-11, -78, 22, 3, 1, BRASS, 'forge'), ...rivets([[-8, -76.5], [8, -76.5]], 0.7)],
};

/** Its eye slit: ember light that brightens as it winds up. */
const eye = (x: number, w: number): EnemyPart => ({
  id: 'eye',
  role: 'glow',
  follows: 'head',
  pivot: [x, -83],
  shapes: [rect(x - w / 2, -84, w, 2.4, 1, { fill: 'cinder-light', glow: { color: 'cinder', blur: 5 } })],
});

export const FORGEWRIGHT_RIG: EnemyRigDef = {
  id: 'forgewright',
  scale: 1,
  box: { size: [152, 150], anchor: [76, 140] },
  hip: [0, -20],
  tells: {
    windup: { part: 'hammer', at: { side: [20, -80], down: [-32, -82], up: [32, -82] } },
    spray: { part: 'hammer', at: { side: [20, -80], down: [-32, -82], up: [32, -82] } },
    flood: { part: 'hammer', at: { side: [20, -80], down: [-32, -82], up: [32, -82] } },
  },
  views: {
    // Facing right: the hammer in front, the free arm behind.
    side: [leg('leg-back', 'leg-back', -15, 'iron-dark'), arm('arm', [-6, -66], [-14, -40]), leg('leg-front', 'leg-front', 2, 'iron'), torso(6, false), head, eye(6, 7), hammer([12, -64], [20, -40])],
    // Facing the camera: the grille on its chest, the hammer in its right hand (screen left).
    down: [leg('leg-back', 'leg-back', -18, 'iron-dark'), leg('leg-front', 'leg-front', 5, 'iron'), arm('arm', [24, -66], [32, -42], true), torso(8, true), head, eye(0, 10), hammer([-24, -66], [-32, -42])],
    // Its back: the hammer over its other shoulder.
    up: [hammer([24, -66], [32, -42], true), leg('leg-back', 'leg-back', -18, 'iron-dark'), leg('leg-front', 'leg-front', 5, 'iron'), torso(8, false), head, arm('arm', [-24, -66], [-32, -42])],
  },
  poses: {
    idle: [{ glow: 0.6 }],
    walk: [
      { step: 3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
      { step: -3, lift: 2, bob: -0.5 },
      { step: 0, bob: 0.5, scaleY: 0.985 },
    ],
    // 076: the slam: the hammer drawn down and back; raised high, leaning back; trembling. Brought down squashed.
    windup: [
      { armFront: 0.65, armBack: 0.2, sink: 2, squash: 0.1, lean: 0.08, glow: 0.8 },
      { armFront: -2.45, armBack: -0.4, lean: -0.2, bob: -1, squash: -0.1, head: -0.15, glow: 1 },
      { armFront: -2.75, armBack: -0.5, lean: -0.26, bob: -1.5, squash: -0.13, head: -0.2, glow: 1 },
    ],
    swipe: [
      { armFront: 1, lean: 0.22, sink: 4, squash: 0.16, glow: 1 },
      { armFront: 1.1, lean: 0.22, sink: 5, squash: 0.18, glow: 1 },
    ],
    recover: [{ armFront: 0.8, lean: 0.14, sink: 3, squash: 0.06, glow: 0.4 }],
    // Flinch only: a snap of the helm.
    hit: [{ lean: -0.08, head: -0.3, bob: 1, squash: 0.04 }],
    // A hit rings off its plating: it rocks a little.
    block: [{ lean: -0.06, armFront: -0.12, glow: 1 }],
    // The spray: the hammer low; drawn back to the side, the body twisted, its head glowing; trembling.
    spray: [
      { armFront: 0.55, sink: 1.5, squash: 0.08, lean: 0.06, glow: 0.8 },
      { armFront: -1.5, armBack: 0.6, lean: -0.2, head: 0.12, squash: -0.04, glow: 1 },
      { armFront: -1.75, armBack: 0.7, lean: -0.26, head: 0.15, squash: -0.06, glow: 1 },
    ],
    // The flood: both hands on the haft, squatting; raised high overhead, arched and stretched; trembling.
    flood: [
      { armFront: 0.35, armBack: 0.4, sink: 4, squash: 0.15, lean: 0.1, glow: 0.8 },
      { armFront: -2.9, armBack: -2.6, lean: -0.24, bob: -2, squash: -0.12, head: -0.2, glow: 1 },
      { armFront: -3.1, armBack: -2.8, lean: -0.3, bob: -2.5, squash: -0.15, head: -0.25, glow: 1 },
    ],
    // The vent: plating open, it sags and staggers from side to side.
    vent: [
      { sink: 3, lean: 0.22, tilt: 0.07, armFront: 0.6, armBack: 0.5, squash: 0.06, glow: 0.2 },
      { sink: 4, lean: 0.18, tilt: -0.06, armFront: 0.5, armBack: 0.6, squash: 0.08, glow: 0.15 },
    ],
    // 080: its intro.
    ...FORGE_INTRO,
    // The hammer drops and the helm sags; its bellows dissolve with it.
    death: [{ armFront: 1.25, armBack: 0.6, head: 0.4, headLift: 3, sink: 3, squash: 0.1, lean: 0.1, glow: 0.2 }],
  },
};

/** A bellows' iron frame and brass nozzle, with `folds` (leather) between its boards. */
function bellows(folds: readonly Shape[], nozzle: Shape): Shape[] {
  return [
    ellipse(0, 0, 14, 4, flat({ id: 'ink', alpha: 0.25 })),
    rect(-3, -6, 6, 6, 1, solid('iron-dark')),
    ...folds,
    nozzle,
    litRect(-13, -36, 26, 5, 1.5, NEAR, 'forge'),
    litRect(-13, -15, 26, 5, 1.5, FAR, 'forge'),
    soot(-13, -14, 26, 4),
    ...cinderSeam([-11, -31.4, 11, -31.4], 0.4),
    ...rivets([-9, 9].map((x) => [x, -33.5] as const), 1.2),
    ...rivets([-9, 9].map((x) => [x, -12.5] as const), 1),
  ];
}

const leather = { linear: [-12, -31, 12, -15] as const, stops: [{ at: 0, color: 'wood-light' }, { at: 0.5, color: 'leather' }, { at: 1, color: 'leather-dark' }] };
const nozzle = (lit: boolean): Shape => ({ ...path('M 11 -25 L 17 -23.5 L 17 -21.5 L 11 -20 Z', { fill: 'brass', outline: true }), ...(lit ? { glow: { color: 'cinder', blur: 4 } } : {}) });

const WHOLE: Shape[] = bellows(
  [path('M -12 -31 L 12 -31 L 13 -27 L -13 -27 L 12 -23 L -12 -23 L 13 -19 L -13 -19 L 12 -15 L -12 -15 Z', { fill: leather, outline: true }), ...[-27, -23, -19].map((y) => line([-12, y, 12, y], 0.8, 'leather-dark'))],
  nozzle(true),
);

/** Torn: the leather slack and ripped, a dark gash across it, the top board sagging. */
const BROKEN: Shape[] = bellows(
  [
    path('M -12 -31 L 12 -29 L 10 -24 L 13 -19 L 11 -15 L -12 -15 L -10 -21 L -13 -26 Z', { fill: leather, outline: true }),
    path('M -9 -26 L -3 -22 L 1 -25 L 6 -20 L 9 -23', trim('ink', 1.6)),
    ellipse(-2, -21, 2.5, 1.2, flat({ id: 'ink', alpha: 0.7 })),
  ],
  nozzle(false),
);

/** Patching: the tears stitched shut with glowing brass staples. */
const PATCHING: Shape[] = [
  ...BROKEN,
  ...[-7, -1, 5].map((x) => ({ ...line([x, -27, x + 1, -19], 1.2, 'brass-light'), glow: { color: 'brass', blur: 3 } })),
];

/** An ember in flight: a hot coal with a short trail along +x. */
const EMBER: Shape[] = [
  { ...line([-9, 0, -2, 0], 2.4, { id: 'cinder', alpha: 0.55 }), glow: { color: 'cinder', blur: 4 } },
  ellipse(0, 0, 3.4, 3, { fill: { radial: [-0.6, -0.6, 3.4], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.6, color: 'cinder' }, { at: 1, color: 'flame-dark' }] }, outline: true, glow: { color: 'cinder', blur: 5 } }),
];

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

/** The Forgewright's sprites, for the vector catalog. */
export const FORGE_SPRITES_VECTOR: readonly VectorSprite[] = [
  one(FORGE_SPRITES.bellows.whole, [40, 44], [20, 40], WHOLE),
  one(FORGE_SPRITES.bellows.broken, [40, 44], [20, 40], BROKEN),
  one(FORGE_SPRITES.bellows.patching, [40, 44], [20, 40], PATCHING),
  one(FORGE_SPRITES.ember, [22, 10], [12, 5], EMBER),
  one(FORGE_SPRITES.emberShadow, [10, 6], [5, 3], [ellipse(0, 0, 4, 1.6, { fill: { id: 'ground-shade', alpha: 0.35 } })]),
];
