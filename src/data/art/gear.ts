import { GEAR_SPRITES } from '../gearAssets';
import { RARITIES } from '../gear';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// Gear (036) in the 016 vector style: the helm, boots and trinket slot icons (the body
// keeps 010's light and heavy armor icons), a rounded frame per rarity in its colour,
// the four relics' icons, and their effects: the Wardstone's ready shimmer, Last Ember's
// flash and a relic's flare at the bench. Icons are 16x16 round the centre; light from
// the top left.

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

const glowDot = (x: number, y: number, r: number, color: string): Shape => ellipse(x, y, r, r, { fill: color, glow: { color, blur: 3 } });

/** A carved ley rune: a short zig-zag. */
const rune = (x: number, y: number, color: string, w = 0.7): Shape => ({
  ...path(`M ${x - 1.2} ${y - 1.4} L ${x + 0.5} ${y - 0.2} L ${x - 0.7} ${y + 0.4} L ${x + 1.2} ${y + 1.6}`, trim(color, w)),
  glow: { color, blur: 1.5 },
});

// A rounded steel helm with a brass brow band and a cyan rune on the brow.
const HELM: Shape[] = [
  path('M -6 3 Q -6.6 -6.2 0 -6.6 Q 6.6 -6.2 6 3 L 4 3 L 3.6 0.6 L -3.6 0.6 L -4 3 Z', {
    fill: { linear: [-5, -6, 5, 3], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 1, color: 'rock' }] },
    outline: true,
  }),
  rect(-6.4, -0.6, 12.8, 2.2, 1, solid('brass')),
  path('M -1 -6.4 Q 0 -3 -0.6 0', trim('rock', 0.6)),
  rune(2.6, -3.2, 'cyan'),
  path('M -4 3 L -4 5.6 L -2.2 6 L -2.4 3 Z', solid('rock')),
  path('M 4 3 L 4 5.6 L 2.2 6 L 2.4 3 Z', solid('rock')),
];

// A leather boot, side on, with a sole, a brass buckle and a turned-down cuff.
const BOOTS: Shape[] = [
  path('M -3.6 -6.4 L 2.4 -6.4 L 2.6 1.6 L 6.6 3 Q 7.2 4.4 6.4 5.4 L -4 5.4 Q -4.6 5.4 -4.4 4 Z', {
    fill: { linear: [0, -6.4, 0, 5.4], stops: [{ at: 0, color: 'leather' }, { at: 1, color: 'leather-dark' }] },
    outline: true,
  }),
  rect(-4.4, 4.4, 11.2, 1.8, 0.8, solid('wood-dark')),
  rect(-4, -6.8, 6.8, 2.2, 0.8, solid('strap')),
  rect(-1.4, -1.4, 2.8, 2.2, 0.5, solid('brass')),
  line([-4, -0.3, 2.5, -0.3], 0.6, 'strap'),
];

// An amulet: a brass ring on a cord, a cyan ley crystal set in it.
const TRINKET: Shape[] = [
  path('M -5 -6.4 Q 0 -1.6 5 -6.4', trim('leather', 1)),
  ellipse(0, 1.6, 4.6, 4.6, { fill: { linear: [-4, -3, 4, 6], stops: [{ at: 0, color: 'brass-light' }, { at: 0.5, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  path('M 0 -1.6 L 2.2 1.6 L 0 4.8 L -2.2 1.6 Z', { fill: { linear: [0, -1.6, 0, 4.8], stops: [{ at: 0, color: 'cyan-glow' }, { at: 1, color: 'cyan-deep' }] }, outline: true, glow: { color: 'cyan', blur: 2 } }),
  ellipse(-0.7, 0.4, 0.6, 0.9, flat('snow')),
];

// Rollbreaker Greaves: iron greaves with a violet shock across the shin, its knee a brass boss.
const ROLLBREAKER: Shape[] = [
  path('M -3.8 -6.6 L 2.8 -6.6 L 3 1.2 L 6.8 2.8 Q 7.4 4.4 6.4 5.6 L -4.2 5.6 Q -4.8 5.4 -4.6 4 Z', {
    fill: { linear: [-4, -6.6, 6, 5.6], stops: [{ at: 0, color: 'iron-light' }, { at: 0.55, color: 'iron' }, { at: 1, color: 'iron-dark' }] },
    outline: true,
  }),
  ellipse(-0.6, -3.6, 1.8, 1.6, solid('brass')),
  { ...path('M -4 1.6 L -1.6 0.2 L -0.4 1.8 L 2.2 0', trim('wisp-light', 0.9)), glow: { color: 'wisp', blur: 2.5 } },
  rect(-4.6, 4.6, 11.4, 1.6, 0.8, solid('iron-dark')),
];

// Wardstone Circlet: a thin gold band seen from the front, a violet wardstone set at its brow.
const WARDSTONE: Shape[] = [
  ellipse(0, 1.4, 6.8, 3.6, { stroke: { color: 'gold-shade', width: 2.6 } }),
  ellipse(0, 1.4, 6.8, 3.6, { stroke: { color: 'gold-trim', width: 1.4 } }),
  ellipse(-3.6, -0.6, 0.6, 0.5, flat('snow')),
  path('M 0 -5.4 L 2.6 -1.6 L 0 2 L -2.6 -1.6 Z', { fill: { linear: [0, -5.4, 0, 2], stops: [{ at: 0, color: 'wisp-light' }, { at: 1, color: 'wisp-dark' }] }, outline: true, glow: { color: 'wisp', blur: 3 } }),
  ellipse(-0.8, -2.8, 0.6, 1, flat('snow')),
];

// Featherplate: a pale cuirass light as a feather, a violet-white feather laid across it.
const FEATHERPLATE: Shape[] = [
  path('M -6.6 -4.6 L -3 -6.4 Q 0 -5 3 -6.4 L 6.6 -4.6 L 6 1.6 Q 3.6 6.4 0 6.6 Q -3.6 6.4 -6 1.6 Z', {
    fill: { linear: [-6, -6, 6, 6], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] },
    outline: true,
  }),
  rect(-6.8, -5.4, 3.4, 2.6, 1, solid('brass')),
  rect(3.4, -5.4, 3.4, 2.6, 1, solid('brass')),
  path('M -3.6 4.6 Q 0 0 4.4 -3.4 Q 1.6 3 -3.6 4.6 Z', { fill: { linear: [-3, 4, 4, -3], stops: [{ at: 0, color: 'wisp' }, { at: 1, color: 'wisp-light' }] }, glow: { color: 'wisp-light', blur: 2 } }),
  line([-4.4, 5.4, 3.4, -2.6], 0.5, 'wisp-dark'),
];

// Last Ember: a coal still glowing in a brass cage on a cord.
const EMBER: Shape[] = [
  path('M -4.6 -6.6 Q 0 -2.8 4.6 -6.6', trim('leather', 1)),
  ellipse(0, 1.8, 4.4, 4.6, { fill: { radial: [-1, 0.6, 5], stops: [{ at: 0, color: 'cinder-light' }, { at: 0.45, color: 'cinder' }, { at: 1, color: 'flame-dark' }] }, glow: { color: 'cinder', blur: 4 } }),
  ...[-2.8, 2.8].map((x) => line([x * 0.8, -2.4, x * 1.15, 5.4], 0.6, 'brass-dark')),
  rect(-3.4, -3.6, 6.8, 1.6, 0.6, solid('brass')),
  glowDot(-1, 1.2, 0.9, 'cinder-light'),
];

/** A rounded square frame round an icon, 20x20, in a rarity's colour; Fine and up glow, a relic's more, with corner studs. */
function frame(key: string, color: string, glow: number, studs: boolean): VectorSprite {
  const shapes: Shape[] = [
    rect(-9, -9, 18, 18, 3, { fill: { id: 'ink', alpha: 0.45 } }),
    rect(-9, -9, 18, 18, 3, { stroke: { color, width: 1.4 }, ...(glow > 0 ? { glow: { color, blur: glow } } : {}) }),
    ...(studs ? [[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([x, y]) => ellipse(x ?? 0, y ?? 0, 1.4, 1.4, { fill: color, outline: true, glow: { color, blur: 2 } })) : []),
  ];
  return { key, size: [22, 22], anchor: [11, 11], frames: [shapes] };
}

// The Wardstone's shimmer: a flat violet ring of light round the feet, with a few motes on it.
const SHIMMER: VectorSprite = {
  key: GEAR_SPRITES.wardShimmer,
  size: [44, 24],
  anchor: [22, 12],
  frames: [
    [
      ellipse(0, 0, 17, 8, { fill: { radial: [0, 0, 17], stops: [{ at: 0, color: { id: 'wisp-light', alpha: 0 } }, { at: 0.75, color: { id: 'wisp-light', alpha: 0.12 } }, { at: 1, color: { id: 'wisp-light', alpha: 0.35 } }] } }),
      ellipse(0, 0, 17, 8, { stroke: { color: 'wisp-light', width: 1.2 }, glow: { color: 'wisp', blur: 3 } }),
      ...[[-12, -5], [10, -6], [15, 3], [-15, 3], [2, 8]].map(([x, y]) => glowDot(x ?? 0, y ?? 0, 0.9, 'snow')),
    ],
  ],
};

// 050 (A.16): the ward's ready sign, a small violet shield with a pale rim, standing on the ring's front edge.
const WARD_SHIELD: VectorSprite = {
  key: GEAR_SPRITES.wardShield,
  size: [12, 12],
  anchor: [6, 6],
  frames: [
    [
      { ...path('M 0 -4.5 L 3.8 -3 Q 3.8 2 0 4.5 Q -3.8 2 -3.8 -3 Z', { fill: { linear: [0, -4.5, 0, 4.5], stops: [{ at: 0, color: 'wisp-light' }, { at: 1, color: 'wisp' }] }, outline: true }), glow: { color: 'wisp', blur: 2 } },
      path('M 0 -3 L 0 3', trim({ id: 'snow', alpha: 0.7 }, 0.8)),
    ],
  ],
};

// Last Ember's flash: a burst of flame and rays round a white-hot heart.
const EMBER_FLASH: VectorSprite = {
  key: GEAR_SPRITES.emberFlash,
  size: [40, 40],
  anchor: [20, 20],
  frames: [
    [
      ellipse(0, 0, 14, 14, { fill: { radial: [0, 0, 14], stops: [{ at: 0, color: { id: 'cinder-light', alpha: 0.9 } }, { at: 0.5, color: { id: 'cinder', alpha: 0.5 } }, { at: 1, color: { id: 'flame-dark', alpha: 0 } }] } }),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r0 = 6;
        const r1 = i % 2 === 0 ? 17 : 12;
        return { ...line([Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1], 1.4, 'cinder-light'), glow: { color: 'cinder', blur: 3 } };
      }),
      glowDot(0, 0, 3, 'snow'),
    ],
  ],
};

// A relic's flare over the bench: a tall violet star of light.
const RELIC_FLARE: VectorSprite = {
  key: GEAR_SPRITES.relicFlare,
  size: [36, 48],
  anchor: [18, 30],
  frames: [
    [
      ellipse(0, 0, 13, 13, { fill: { radial: [0, 0, 13], stops: [{ at: 0, color: { id: 'wisp-light', alpha: 0.8 } }, { at: 1, color: { id: 'wisp', alpha: 0 } }] } }),
      { ...path('M 0 -28 L 2 -3 L 15 0 L 2 3 L 0 15 L -2 3 L -15 0 L -2 -3 Z', { fill: { id: 'wisp-light', alpha: 0.85 } }), glow: { color: 'wisp', blur: 4 } },
      glowDot(0, 0, 2.6, 'snow'),
    ],
  ],
};

export const GEAR_SPRITES_VECTOR: readonly VectorSprite[] = [
  icon(GEAR_SPRITES.helm, HELM),
  icon(GEAR_SPRITES.boots, BOOTS),
  icon(GEAR_SPRITES.trinket, TRINKET),
  icon(GEAR_SPRITES.relicRollbreaker, ROLLBREAKER),
  icon(GEAR_SPRITES.relicWardstone, WARDSTONE),
  icon(GEAR_SPRITES.relicFeatherplate, FEATHERPLATE),
  icon(GEAR_SPRITES.relicEmber, EMBER),
  frame(GEAR_SPRITES.frameCommon, RARITIES.common.color, 0, false),
  frame(GEAR_SPRITES.frameFine, RARITIES.fine.color, 2, false),
  frame(GEAR_SPRITES.frameRare, RARITIES.rare.color, 2.5, false),
  frame(GEAR_SPRITES.frameRelic, RARITIES.relic.color, 3.5, true),
  SHIMMER,
  WARD_SHIELD,
  EMBER_FLASH,
  RELIC_FLARE,
];
