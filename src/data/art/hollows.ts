import { FORUM_WALL_LOOK, HOLLOWS_SPRITES } from '../hollowsAssets';
import { MAP_ICONS } from '../landmarkAssets';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// Stonefall Hollows' standing things (034) in the 016/020 vector style: grey-blue quarry
// cliffs with a lit top edge and cyan veins, the aqueduct's pillars, standing arches and
// fallen spans, loose rubble, the ley-iron item, the forum's altar stone (dim, awake,
// summoning), the Bulwark's lobbed bomb and the minimap's aqueduct icon. World px round
// each anchor, which sits at the bottom centre of its tile; light from the top left.

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

const stoneFace = { linear: [0, -22, 0, 0] as const, stops: [{ at: 0, color: 'hollow' }, { at: 1, color: 'hollow-dark' }] };
const stoneTop = { linear: [-16, -38, 16, -22] as const, stops: [{ at: 0, color: 'hollow-pale' }, { at: 1, color: 'hollow-light' }] };

/** A glinting cyan vein in rock: a jagged crack with a bright core. */
const vein = (pts: readonly number[]): Shape[] => [line(pts, 1.6, { id: 'cyan-deep', alpha: 0.8 }), { ...line(pts, 0.7, 'vein'), glow: { color: 'vein', blur: 3 } }];

/** A cliff block: its lit top, the lit top edge, and a strata-lined face with a rust stain and (by variant) a vein. */
function cliff(variant: number): Shape[] {
  const stains: Shape[] = variant === 1 ? [path('M 4 -20 Q 6 -10 3 0 L 8 0 Q 9 -10 7 -20 Z', { fill: { id: 'iron-rust', alpha: 0.45 } })] : [];
  const veins = variant === 2 ? vein([-12, -6, -6, -11, -1, -9, 5, -14]) : variant === 0 ? vein([6, -3, 10, -8, 14, -7]) : [];
  return [
    rect(-17, -22, 34, 22, 1, { fill: stoneFace, outline: true }),
    line([-17, -14, 17, -15], 0.9, 'hollow-dark'),
    line([-17, -7, 17, -6], 0.9, 'hollow-dark'),
    line([-6, -22, -5, -14], 0.8, 'hollow-dark'),
    line([8, -15, 9, -7], 0.8, 'hollow-dark'),
    ...stains,
    ...veins,
    rect(-17, -38, 34, 17, 2, { fill: stoneTop, outline: true }),
    line([-16, -21.5, 16, -21.5], 1.4, 'hollow-pale'),
    ellipse(-8, -33, 4, 1.6, flat({ id: 'snow', alpha: 0.25 })),
  ];
}

/** The top of a cliff whose face is hidden by another cliff in front: one even plateau. */
const CLIFF_TOP: Shape[] = [rect(-17, -40, 34, 34, 2, { fill: stoneTop }), line([-12, -30, 2, -28], 0.7, { id: 'hollow', alpha: 0.6 })];

/** 059: a length of the forum's wall, shaped like the shrine's (RUIN_WALL): dark cut blocks, a lighter top, a lit edge, a vein. */
const W = FORUM_WALL_LOOK;
const joint = { id: W.joint, alpha: W.jointAlpha };
const FORUM_WALL: Shape[] = [
  shadow(16, 4, -1),
  rect(-16, -34, 32, 34, 2, solid(W.body)),
  rect(-16, -42, 32, 10, 2, solid(W.top)),
  line([-15, -41, 15, -41], 1, W.edge),
  line([-16, -18, 16, -18], 1, joint),
  line([0, -32, 0, -18], 1, joint),
  line([-8, -18, -8, 0], 1, joint),
  line([8, -18, 8, 0], 1, joint),
  ...vein([3, -6, 6, -11, 9, -10, 12, -14]),
];

/** An aqueduct pillar: stacked cut drums, a capital, a rust streak down from the old water channel. */
const PILLAR: Shape[] = [
  shadow(14, 4, -1),
  rect(-12, -8, 24, 8, 2, solid('hollow')),
  rect(-9, -62, 18, 55, 2, { fill: { linear: [-9, 0, 9, 0], stops: [{ at: 0, color: 'hollow-pale' }, { at: 0.5, color: 'hollow-light' }, { at: 1, color: 'hollow' }] }, outline: true }),
  ...[-50, -38, -26, -14].map((y) => line([-9, y, 9, y], 0.8, 'hollow-dark')),
  path('M 2 -62 Q 3 -44 1 -30 L 4 -30 Q 6 -46 5 -62 Z', { fill: { id: 'iron-rust', alpha: 0.4 } }),
  rect(-13, -70, 26, 9, 2, solid('hollow-light')),
  line([-12, -61.5, 12, -61.5], 1.2, 'hollow-pale'),
];

/** A standing arch over a walkable bay: the channel's deck high up, its curved soffit, rust where water ran. */
const ARCH: Shape[] = [
  path('M -17 -58 L 17 -58 L 17 -52 Q 0 -40 -17 -52 Z', { fill: { linear: [0, -58, 0, -44], stops: [{ at: 0, color: 'hollow-light' }, { at: 1, color: 'hollow' }] }, outline: true }),
  rect(-17, -70, 34, 13, 1, solid('hollow-light')),
  line([-17, -64, 17, -64], 0.8, 'hollow-dark'),
  rect(-17, -73, 34, 4, 1, flat('hollow-pale')),
  path('M -6 -57 Q 0 -54 6 -57', trim({ id: 'iron-rust', alpha: 0.6 }, 1.2)),
];

/** A fallen span: broken channel blocks and a toppled drum heaped where they fell. */
function fallen(flip: boolean): Shape[] {
  const s = flip ? -1 : 1;
  return [
    shadow(16, 4.5, -1),
    path(`M ${-16 * s} 0 L ${-15 * s} -12 L ${-4 * s} -16 L ${-2 * s} 0 Z`, solid('hollow')),
    path(`M ${-15 * s} -12 L ${-10 * s} -18 L ${1 * s} -21 L ${-4 * s} -16 Z`, solid('hollow-light')),
    ellipse(7 * s, -9, 9, 9, solid('hollow-light')),
    ellipse(7 * s, -9, 5.5, 5.5, trim('hollow-dark', 0.9)),
    path(`M ${2 * s} 0 L ${16 * s} 0 L ${15 * s} -6 L ${4 * s} -5 Z`, solid('hollow-dark')),
    line([-12 * s, -8, -6 * s, -10], 0.8, 'hollow-dark'),
    ...vein([-13 * s, -4, -9 * s, -7, -6 * s, -5]),
  ];
}

/** Loose rubble: a few grey-blue chunks. */
function rubble(k: number): Shape[] {
  return [
    shadow(13 * k, 3.5 * k, -1),
    path(`M ${-12 * k} 0 L ${-11 * k} ${-8 * k} L ${-3 * k} ${-12 * k} L ${4 * k} ${-9 * k} L ${3 * k} 0 Z`, solid('hollow')),
    path(`M ${-11 * k} ${-8 * k} L ${-3 * k} ${-12 * k} L ${1 * k} ${-10 * k} L ${-6 * k} ${-6 * k} Z`, flat('hollow-light')),
    path(`M ${2 * k} 0 L ${4 * k} ${-7 * k} L ${11 * k} ${-6 * k} L ${12 * k} 0 Z`, solid('hollow-dark')),
    ellipse(9 * k, -6.5 * k, 2.5 * k, 1.2 * k, flat('hollow-light')),
  ];
}

/** The ley-iron item: a rust-skinned lump of grey metal with a cyan vein through it. */
const LEY_IRON: Shape[] = [
  path('M -6.5 3.5 L -6 -2 L -2.5 -5.5 L 3 -5 L 6.5 -1.5 L 5.5 4 L 0 5.5 Z', { fill: { linear: [-5, -5, 5, 5], stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
  path('M 0.5 5.2 L 5.5 4 L 6.3 0 L 3 2 Z', flat('iron-rust')),
  path('M -6 -2 L -2.5 -5.5 L -1 -3.5 L -4.5 -0.5 Z', flat({ id: 'snow', alpha: 0.35 })),
  { ...path('M -4.5 2.5 L -1.5 0 L 1 0.8 L 4 -2.5', trim('vein', 0.8)), glow: { color: 'vein', blur: 2 } },
];

/**
 * The altar stone: a squat carved block with a basin and three runes, dim (cold stone, the runes dark), awake (the
 * runes lit cyan, a glow in the basin) or summoning (blazing danger red).
 */
function altar(state: 'dim' | 'awake' | 'summoning'): Shape[] {
  const light = state === 'dim' ? null : state === 'awake' ? 'cyan' : 'danger';
  const rune = (x: number): Shape => (light ? { ...path(`M ${x - 2} -20 L ${x} -15 L ${x + 2} -20`, trim(light, 1.2)), glow: { color: light, blur: 4 } } : path(`M ${x - 2} -20 L ${x} -15 L ${x + 2} -20`, trim('hollow-dark', 1)));
  return [
    shadow(17, 4.5, -1),
    rect(-15, -10, 30, 10, 2, solid('hollow-dark')),
    rect(-12, -26, 24, 17, 2, { fill: { linear: [-12, 0, 12, 0], stops: [{ at: 0, color: 'hollow-light' }, { at: 1, color: 'hollow' }] }, outline: true }),
    rect(-15, -31, 30, 7, 2, solid('hollow-light')),
    ellipse(0, -30.5, 9, 2.6, solid('hollow-dark')),
    ...(light ? [ellipse(0, -30.5, 7, 1.8, { fill: light, glow: { color: light, blur: 6 }, alpha: state === 'summoning' ? 1 : 0.8 })] : []),
    rune(-7),
    rune(0),
    rune(7),
  ];
}

/** The Bulwark's lobbed bomb: a riveted stone shell, its fuse glowing danger red. */
const ENEMY_BOMB: Shape[] = [
  ellipse(0, 0, 6, 6, { fill: { radial: [-2, -2, 7], stops: [{ at: 0, color: 'hollow-light' }, { at: 1, color: 'hollow-dark' }] }, outline: true }),
  line([-6, 0, 6, 0], 0.8, 'iron-dark'),
  ellipse(-3, -0.5, 0.8, 0.8, flat('iron-light')),
  ellipse(3, -0.5, 0.8, 0.8, flat('iron-light')),
  ellipse(1.5, -6.5, 1.8, 1.8, { fill: 'danger', glow: { color: 'danger', blur: 4 } }),
];

/** The minimap's aqueduct: three pillars under a span. */
const ICON_AQUEDUCT: Shape[] = [rect(-5, -4, 10, 2, 0.5, solid('hollow-pale')), ...[-4, 0, 4].map((x) => rect(x - 0.9, -2, 1.8, 6, 0.3, solid('hollow-light')))];

/** Every Hollows sprite, for the vector catalog. */
export const HOLLOWS_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...HOLLOWS_SPRITES.cliffs.map((key, i) => one(key, [36, 44], [18, 40], cliff(i))),
  one(HOLLOWS_SPRITES.cliffTop, [36, 44], [18, 40], CLIFF_TOP),
  one(HOLLOWS_SPRITES.forumWall, [34, 52], [17, 48], FORUM_WALL),
  one(HOLLOWS_SPRITES.pillar, [30, 76], [15, 72], PILLAR),
  one(HOLLOWS_SPRITES.arch, [36, 78], [18, 74], ARCH),
  ...HOLLOWS_SPRITES.fallen.map((key, i) => one(key, [36, 28], [18, 25], fallen(i === 1))),
  ...HOLLOWS_SPRITES.rubble.map((key, i) => one(key, [32, 20], [16, 17], rubble(i === 0 ? 1.1 : 0.85))),
  one(HOLLOWS_SPRITES.itemLeyIron, [16, 16], [8, 8], LEY_IRON),
  one(HOLLOWS_SPRITES.altar.dim, [36, 40], [18, 36], altar('dim')),
  one(HOLLOWS_SPRITES.altar.awake, [36, 40], [18, 36], altar('awake')),
  one(HOLLOWS_SPRITES.altar.summoning, [36, 40], [18, 36], altar('summoning')),
  one(HOLLOWS_SPRITES.enemyBomb, [16, 18], [8, 10], ENEMY_BOMB),
  one(MAP_ICONS.aqueduct, [12, 10], [6, 5], ICON_AQUEDUCT),
];

// Ley-iron seams (034): a rust-skinned iron lode pushing out of the cliff's foot, cyan veins glinting in it;
// smaller as chunks are broken off, then a bare scar that slowly fills with metal again.
const scar: Shape[] = [shadow(13, 3, -1), path('M -13 0 Q -11 -7 -4 -8 Q 3 -9 9 -7 Q 13 -5 13 0 Z', solid('hollow-dark'))];
const lode = (k: number, lit: number): Shape[] => [
  path(`M ${-10 * k} 0 L ${-9 * k} ${-9 * k} L ${-3 * k} ${-14 * k} L ${5 * k} ${-12 * k} L ${10 * k} ${-6 * k} L ${9 * k} 0 Z`, {
    fill: { linear: [-8 * k, -14 * k, 8 * k, 0], stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'iron-dark' }] },
    outline: true,
  }),
  path(`M ${3 * k} 0 L ${9 * k} 0 L ${10 * k} ${-6 * k} L ${6 * k} ${-4 * k} Z`, flat('iron-rust')),
  path(`M ${-9 * k} ${-9 * k} L ${-3 * k} ${-14 * k} L ${-2 * k} ${-11 * k} L ${-6 * k} ${-7 * k} Z`, flat({ id: 'snow', alpha: 0.3 })),
  ...(lit > 0 ? [{ ...path(`M ${-7 * k} ${-3 * k} L ${-3 * k} ${-7 * k} L ${1 * k} ${-6 * k} L ${5 * k} ${-10 * k}`, trim('vein', 0.9)), glow: { color: 'vein', blur: 3 * lit }, alpha: lit }] : []),
];
export const LEY_IRON_SEAM = {
  size: [36, 30] as const,
  anchor: [18, 26] as const,
  uses: [
    [...scar, ...lode(0.6, 1)],
    [...scar, ...lode(0.8, 1)],
    [...scar, ...lode(1, 1)],
  ],
  regrow: [scar, [...scar, ...lode(0.3, 0)], [...scar, ...lode(0.45, 0.4)], [...scar, ...lode(0.55, 0.8)]],
};
