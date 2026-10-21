import { FOUNDRY_MAP_ICONS, LANDMARK_LOOK, LANDMARK_SPRITES, MAP_ICONS } from '../landmarkAssets';
import { canopy, shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// 032's art in the 016 style: the Quarry's cut blocks of the lost civilisation, the Old
// Grove's old trees, the marsh's reeds and lilies, the grotto hollows' lip slabs (one
// frost-rimed), the Ruined Cache's reliquary (sealed, opening, empty), the minimap's
// landmark icons and the champion's glow. World px round each anchor, light from the top left.

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });
const rune = (x: number, y: number, s: number): Shape => ({ ...path(`M ${x - s} ${y - s} L ${x} ${y + s * 0.4} L ${x + s} ${y - s}`, trim('cyan', 1)), glow: { color: 'cyan', blur: 2 } });

/** A cut block: squared on every face, chisel lines on its lit top, a carved rune, a drill-hole row where it was split. */
function cutBlock(w: number, h: number, tilt: number): Shape[] {
  const x = -w / 2;
  return [
    shadow(w / 2 + 2, 4, -1),
    path(`M ${x} 0 L ${x} ${-h} L ${x + w} ${-h + tilt} L ${x + w} 0 Z`, solid('rock')),
    path(`M ${x} ${-h} L ${x + 6} ${-h - 7} L ${x + w + 6} ${-h - 7 + tilt} L ${x + w} ${-h + tilt} Z`, solid('rock-light')),
    path(`M ${x + w} 0 L ${x + w} ${-h + tilt} L ${x + w + 6} ${-h - 7 + tilt} L ${x + w + 6} ${-7} Z`, solid('rock-dark')),
    ...[0.3, 0.55, 0.8].map((k) => line([x + 4 + w * k, -h - 5 + tilt * k, x + 2 + w * k, -h - 1 + tilt * k], 0.7, 'rock')),
    ...[0.2, 0.4, 0.6, 0.8].map((k) => ellipse(x + w * k, -h * 0.25, 0.9, 1.3, flat('rock-dark'))),
    rune(x + w * 0.45, -h * 0.6, 3),
  ];
}

/** An old tree: a broad, twisted trunk on spreading roots, moss on its bark, a wide sunlit crown. */
function oldTree(flip: number): Shape[] {
  const s = flip;
  return [
    shadow(24, 6.5),
    path(`M ${-16 * s} 0 Q ${-9 * s} -4 ${-8 * s} -12 L ${-6 * s} -30 L ${7 * s} -30 L ${8 * s} -12 Q ${10 * s} -3 ${18 * s} 0 Z`, solid('wood-dark')),
    path(`M ${-5 * s} -2 Q ${-4 * s} -18 ${-2 * s} -30 L ${4 * s} -30 Q ${3 * s} -14 ${5 * s} -2 Z`, flat('wood')),
    path(`M ${-22 * s} 1 Q ${-14 * s} -2 ${-9 * s} -6`, trim('wood-dark', 3)),
    path(`M ${22 * s} 1 Q ${14 * s} -2 ${9 * s} -7`, trim('wood-dark', 3)),
    line([-3 * s, -8, -1 * s, -24], 1.2, 'wood-light'),
    ellipse(-7 * s, -16, 3.2, 5, flat('moss-tuft')),
    ellipse(6 * s, -22, 2.4, 3.2, flat('moss-tuft')),
    ...canopy([
      [0, -50, 22],
      [-20 * s, -42, 15],
      [19 * s, -44, 14],
      [-12 * s, -62, 15],
      [12 * s, -64, 14],
      [0, -72, 12],
    ]),
  ];
}

/** Reeds and two cattails in a clump at a pond's rim. */
const MARSH_TUFT: Shape[] = [
  ellipse(0, -1, 9, 2.6, { fill: { id: 'ground-shade', alpha: 0.25 } }),
  ...[-6, -3, 0, 3, 6].map((x, i) => path(`M ${x} 0 Q ${x + (i % 2 ? 2 : -2)} -8 ${x + (i - 2) * 1.6} ${-13 - (i % 3) * 2}`, trim(i % 2 ? 'leaf' : 'leaf-dark', 1.3))),
  ...[-2.5, 3.5].map((x) => rect(x - 1.3, -19, 2.6, 6, 1.3, solid('wood-dark'))),
  ...[-2.5, 3.5].map((x) => line([x, -19, x, -22], 0.7, 'leaf-dark')),
];

/** A lily pad with its notch, floating on the water. */
const LILY: Shape[] = [
  path('M 0 0 L 6 -1.5 Q 6 3.5 0 3.6 Q -6.5 3.6 -6.5 0 Q -6.5 -3.6 0 -3.6 Q 4.5 -3.6 6 -2.6 Z', solid('leaf')),
  ellipse(-2, -1, 2.2, 1, flat('leaf-light')),
  ellipse(-3.5, 1.4, 1.2, 1.2, flat('flag-light')),
];

/** A low slab on a hollow's lip; frosted, its top is rime-white with an icicle or two. */
function lip(frost: boolean): Shape[] {
  return [
    ellipse(0, 0, 13, 3.5, { fill: { id: 'ground-shade', alpha: 0.3 } }),
    path('M -12 0 L -11 -6 L -4 -8 L 6 -7.5 L 12 -4 L 11 0 Z', solid(frost ? 'rock-light' : 'rock')),
    path('M -11 -6 L -4 -8 L 6 -7.5 L 12 -4 L 6 -3 L -6 -3.5 Z', flat(frost ? 'snow' : 'rock-light')),
    line([-3, -2, 2, -1], 0.8, 'rock-dark'),
    ...(frost
      ? [path('M -6 -3.4 L -5 1.5 L -4 -3.4 Z', flat({ id: 'foam', alpha: 0.9 })), path('M 5 -3 L 5.8 0.8 L 6.6 -3 Z', flat({ id: 'foam', alpha: 0.9 })), ellipse(-1, -6.5, 3, 0.8, flat('foam'))]
      : [ellipse(-7, -6.2, 2.4, 0.9, flat('moss-tuft'))]),
  ];
}

/** The reliquary: a rune-carved stone chest on a stepped plinth, its lid bound by a band of ley light (the seal). */
const PLINTH: Shape[] = [
  shadow(20, 5, -1),
  rect(-19, -8, 38, 8, 2, solid('rock-dark')),
  rect(-16, -12, 32, 5, 1.5, solid('rock')),
  rect(-13, -27, 26, 16, 2, { fill: { linear: [0, -27, 0, -11], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  rect(-13, -27, 4, 16, 1, flat('rock-pale')),
  ...[-6, 6].map((x) => rune(x, -18, 2.4)),
];
const SEALED: Shape[] = [
  ...PLINTH,
  rect(-15, -34, 30, 8, 2.5, solid('rock-light')),
  path('M -10 -34 L 0 -38 L 10 -34 Z', solid('rock-pale')),
  { ...rect(-15, -27.6, 30, 2.4, 1, flat('cyan')), glow: { color: 'cyan', blur: 5 } },
  { ...ellipse(0, -30, 4, 4, { fill: 'cyan-glow', outline: true }), glow: { color: 'cyan-glow', blur: 7 } },
  path('M -1.8 -31 L 0 -28.4 L 1.8 -31', trim('cyan-deep', 0.9)),
];
const LID_ASIDE: Shape[] = [rect(10, -11, 24, 7, 2.5, solid('rock-light')), path('M 13 -11 L 22 -14 L 31 -11 Z', solid('rock-pale')), line([14, -7, 30, -7], 0.8, 'rock-dark')];
const OPEN: Shape[] = [
  ...PLINTH,
  rect(-12, -29, 24, 4, 1.5, flat('ink')),
  { ...ellipse(0, -29, 11, 3, flat('cyan-glow')), glow: { color: 'cyan', blur: 10 } },
  ...[-7, 0, 7].map((x) => ({ ...line([x, -30, x * 1.6, -46], 1.6, { id: 'cyan-glow', alpha: 0.7 }), glow: { color: 'cyan', blur: 6 } })),
  ...LID_ASIDE,
];
const EMPTY: Shape[] = [...PLINTH, rect(-12, -29, 24, 4, 1.5, flat('ink')), ellipse(0, -28, 9, 1.4, flat('rock-dark')), ...LID_ASIDE];

/** The minimap's landmark icons: small, bold shapes with an ink edge, readable at a few pixels. */
const ICON_SITE: Shape[] = [path('M 0 -4.5 L 3 0 L 0 4.5 L -3 0 Z', { fill: 'gold-trim', outline: true })];
const ICON_GROTTO: Shape[] = [
  ellipse(0, 0, 3.6, 3.6, { fill: 'snow', outline: true }),
  ...[0, 1, 2].map((k) => {
    const a = (k * Math.PI) / 3;
    return line([Math.cos(a) * -2.6, Math.sin(a) * -2.6, Math.cos(a) * 2.6, Math.sin(a) * 2.6], 0.8, 'cyan-deep');
  }),
];
const ICON_SPRING: Shape[] = [ellipse(0, 0, 3.6, 3.6, { fill: 'cyan', outline: true }), ellipse(-1, -1, 1.4, 1.4, flat('cyan-glow'))];
const ICON_CACHE: Shape[] = [rect(-3.6, -2.4, 7.2, 5, 1, { fill: 'rock-light', outline: true }), rect(-3.6, -2.6, 7.2, 1.2, 0.5, flat('cyan'))];

// 051 (B.5): the foundry's stairs (a brass arch over a dark doorway), the shrine's pylon (a stone needle with its
// violet crystal) and a boss arena (a ring of stone round two crossed blades).
const ICON_FOUNDRY: Shape[] = [
  path('M -4.2 4 L -4.2 -1 Q -4.2 -4.6 0 -4.6 Q 4.2 -4.6 4.2 -1 L 4.2 4 Z', { fill: 'brass', outline: true }),
  path('M -2.2 4 L -2.2 -0.6 Q -2.2 -2.6 0 -2.6 Q 2.2 -2.6 2.2 -0.6 L 2.2 4 Z', flat('ink')),
];
const ICON_PYLON: Shape[] = [
  path('M -2 4.5 L -1.2 -2 L 1.2 -2 L 2 4.5 Z', { fill: 'rock-light', outline: true }),
  { ...path('M 0 -5.5 L 1.6 -3 L 0 -1 L -1.6 -3 Z', { fill: 'wisp-light', outline: true }), glow: { color: 'wisp', blur: 2 } },
];
const ICON_ARENA: Shape[] = [
  ellipse(0, 0, 4.4, 4.4, { fill: 'hollow-dark', outline: true }),
  line([-2.4, -2.4, 2.4, 2.4], 1.1, 'rust-light', true),
  line([2.4, -2.4, -2.4, 2.4], 1.1, 'rust-light', true),
];

// 051 (B.6): the foundry map's icons: the intake (a cyan-ringed tube mouth), the bench (a table with a lens) and the
// stash (a chest).
const ICON_TUBE: Shape[] = [
  rect(-2.2, -4.6, 4.4, 7, 1, { fill: 'brass', outline: true }),
  { ...ellipse(0, 3, 3.4, 1.8, { fill: 'cyan', outline: true }), glow: { color: 'cyan-glow', blur: 2 } },
];
const ICON_BENCH: Shape[] = [
  rect(-4, -1, 8, 2.4, 0.6, { fill: 'wood-light', outline: true }),
  line([-3, 1.4, -3, 4], 1, 'wood-dark'),
  line([3, 1.4, 3, 4], 1, 'wood-dark'),
  ellipse(1.2, -3, 1.8, 1.8, { fill: 'cyan-glow', stroke: { color: 'brass', width: 0.8 } }),
];
const ICON_STASH: Shape[] = [rect(-4, -3, 8, 6, 1, { fill: 'wood', outline: true }), rect(-4, -3, 8, 2, 0.6, flat('wood-light')), rect(-0.8, -1.4, 1.6, 2, 0.3, flat('brass'))];

/** The champion's glow: a soft round light, white so render can tint it (gold-trim by data). */
const G = LANDMARK_LOOK.championGlowPx;
const GLOW: Shape[] = [ellipse(0, 0, G, G, { fill: { radial: [0, 0, G], stops: [{ at: 0, color: { id: 'snow', alpha: 0.9 } }, { at: 0.55, color: { id: 'snow', alpha: 0.4 } }, { at: 1, color: { id: 'snow', alpha: 0 } }] } })];

export const LANDMARK_SPRITES_VECTOR: readonly VectorSprite[] = [
  one(LANDMARK_SPRITES.cutBlocks[0], [44, 50], [20, 44], cutBlock(26, 22, -2)),
  one(LANDMARK_SPRITES.cutBlocks[1], [44, 44], [20, 38], cutBlock(28, 16, 2)),
  one(LANDMARK_SPRITES.oldTrees[0], [92, 104], [46, 98], oldTree(1)),
  one(LANDMARK_SPRITES.oldTrees[1], [92, 104], [46, 98], oldTree(-1)),
  one(LANDMARK_SPRITES.marshTuft, [24, 26], [12, 24], MARSH_TUFT),
  one(LANDMARK_SPRITES.lily, [16, 10], [8, 5], LILY),
  one(LANDMARK_SPRITES.lip, [30, 14], [15, 11], lip(false)),
  one(LANDMARK_SPRITES.lipFrost, [30, 14], [15, 11], lip(true)),
  one(LANDMARK_SPRITES.cacheSealed, [48, 50], [22, 44], SEALED),
  one(LANDMARK_SPRITES.cacheOpen, [76, 56], [22, 50], OPEN),
  one(LANDMARK_SPRITES.cacheEmpty, [76, 40], [22, 34], EMPTY),
  one(MAP_ICONS.site, [10, 12], [5, 6], ICON_SITE),
  one(MAP_ICONS.grotto, [10, 10], [5, 5], ICON_GROTTO),
  one(MAP_ICONS.spring, [10, 10], [5, 5], ICON_SPRING),
  one(MAP_ICONS.cache, [10, 8], [5, 4], ICON_CACHE),
  one(MAP_ICONS.foundry, [11, 11], [5.5, 5.5], ICON_FOUNDRY),
  one(MAP_ICONS.pylon, [8, 13], [4, 6.5], ICON_PYLON),
  one(MAP_ICONS.arena, [11, 11], [5.5, 5.5], ICON_ARENA),
  one(FOUNDRY_MAP_ICONS.tube, [9, 11], [4.5, 5.5], ICON_TUBE),
  one(FOUNDRY_MAP_ICONS.bench, [10, 10], [5, 5], ICON_BENCH),
  one(FOUNDRY_MAP_ICONS.stash, [10, 8], [5, 4], ICON_STASH),
  one(LANDMARK_SPRITES.championGlow, [G * 2 + 4, G * 2 + 4], [G + 2, G + 2], GLOW),
];
