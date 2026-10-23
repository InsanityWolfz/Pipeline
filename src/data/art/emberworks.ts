import { ASH_STONE, EMBERWORKS_SPRITES } from '../emberworksAssets';
import { MAP_ICONS } from '../landmarkAssets';
import { cliff, cliffTop } from './hollows';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// The Emberworks' standing things (060) in the 016/020 vector style: beehive kilns of rust brick on soot-dark stone,
// their mouths glowing ember; chimney stacks with a brass band and a cyan ley ring; and its cliffs in warm ash. World
// px round each anchor, which sits at the bottom centre of its tile; light from the top left.

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

const brick = { linear: [-15, -40, 15, -10] as const, stops: [{ at: 0, color: 'rust-light' }, { at: 0.55, color: 'rust' }, { at: 1, color: 'rust-dark' }] };
const sootStone = { linear: [0, -12, 0, 0] as const, stops: [{ at: 0, color: 'ash' }, { at: 1, color: 'ash-dark' }] };
const ember = (y: number) => ({ radial: [0, y, 8] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.5, color: 'cinder' }, { at: 1, color: 'flame-dark' }] });

/** A small cyan ley rune cut in stone. */
const rune = (x: number, y: number): Shape => ({ ...path(`M ${x - 2} ${y - 2} L ${x} ${y + 2} L ${x + 2} ${y - 2}`, trim('cyan', 0.9)), glow: { color: 'cyan', blur: 3 } });

/** A beehive kiln: a soot-dark stone footing with a ley rune, a rust-brick dome, an arched mouth glowing ember, a smoke hole. */
const KILN: Shape[] = [
  shadow(17, 4.5, -1),
  rect(-16, -12, 32, 12, 2, { fill: sootStone, outline: true }),
  path('M -15 -10 L -15 -25 Q -15 -40 0 -40 Q 15 -40 15 -25 L 15 -10 Z', { fill: brick, outline: true }),
  line([-14, -18, 14, -18], 0.8, { id: 'rust-dark', alpha: 0.7 }),
  line([-14, -26, 14, -26], 0.8, { id: 'rust-dark', alpha: 0.7 }),
  line([-10, -33, 10, -33], 0.8, { id: 'rust-dark', alpha: 0.7 }),
  ...[-9, 3, 11].map((x) => line([x, -18, x, -26], 0.7, { id: 'rust-dark', alpha: 0.6 })),
  ...[-4, 7].map((x) => line([x, -26, x, -33], 0.7, { id: 'rust-dark', alpha: 0.6 })),
  path('M -9 -36 Q -6 -39 -1 -39', trim({ id: 'rust-light', alpha: 0.9 }, 1.2)),
  { ...path('M -6 -10 L -6 -17 Q -6 -22 0 -22 Q 6 -22 6 -17 L 6 -10 Z', { fill: ember(-13), outline: true }), glow: { color: 'cinder', blur: 5 } },
  ellipse(0, -12, 4, 1.4, flat({ id: 'cinder-light', alpha: 0.8 })),
  ellipse(0, -39.5, 4, 1.5, solid('ash-dark')),
  rune(-11, -6),
  rune(11, -6),
];

/** A kiln's top where another kiln stands in front of it: its brick crown, a glowing smoke hole. */
const KILN_TOP: Shape[] = [
  rect(-17, -40, 34, 34, 3, { fill: brick }),
  line([-15, -30, 15, -30], 0.8, { id: 'rust-dark', alpha: 0.6 }),
  line([-15, -20, 15, -20], 0.8, { id: 'rust-dark', alpha: 0.6 }),
  { ...ellipse(0, -25, 5, 2.4, { fill: ember(-25) }), glow: { color: 'cinder', blur: 4 } },
];

/** A chimney stack: a stone footing, a tall soot-dark stack with a brass band and a glowing cyan ley ring, embers at its lip. */
function chimney(variant: number): Shape[] {
  const top = variant === 0 ? -72 : -64;
  const h = -12 - top;
  return [
    shadow(13, 4, -1),
    rect(-11, -14, 22, 14, 2, { fill: sootStone, outline: true }),
    rect(-8, top, 16, h, 1.5, { fill: { linear: [-8, 0, 8, 0], stops: [{ at: 0, color: 'ash-light' }, { at: 0.5, color: 'ash' }, { at: 1, color: 'ash-dark' }] }, outline: true }),
    path(`M 2 ${top + 4} Q 3 ${top + 20} 1 ${top + 34} L 4 ${top + 34} Q 6 ${top + 18} 5 ${top + 4} Z`, { fill: { id: 'ink', alpha: 0.25 } }),
    rect(-8.5, top + h * 0.55, 17, 3, 0.5, solid('brass')),
    { ...line([-8, top + h * 0.25, 8, top + h * 0.25], 1.6, 'cyan'), glow: { color: 'cyan', blur: 4 } },
    rect(-10, top - 5, 20, 6, 1.5, solid('ash-dark')),
    { ...ellipse(0, top - 4.5, 6, 1.8, { fill: ember(top - 4.5) }), glow: { color: 'cinder', blur: 6 } },
    ellipse(-3, top - 9, 2, 2, flat({ id: 'ash-pale', alpha: 0.35 })),
    ellipse(2, top - 14, 3, 3, flat({ id: 'ash-pale', alpha: 0.2 })),
  ];
}

/** 060: a length of the Anvil Hall's wall: soot-dark cut blocks, a lighter top, a lit edge and an ember vein. */
const ANVIL_WALL: Shape[] = [
  shadow(16, 4, -1),
  rect(-16, -34, 32, 34, 2, solid('ash-dark')),
  rect(-16, -42, 32, 10, 2, solid('ash')),
  line([-15, -41, 15, -41], 1, 'ash-light'),
  line([-16, -18, 16, -18], 1, { id: 'ink', alpha: 0.45 }),
  line([0, -32, 0, -18], 1, { id: 'ink', alpha: 0.45 }),
  line([-8, -18, -8, 0], 1, { id: 'ink', alpha: 0.45 }),
  line([8, -18, 8, 0], 1, { id: 'ink', alpha: 0.45 }),
  { ...line([3, -6, 6, -11, 9, -10, 12, -14], 1, 'cinder'), glow: { color: 'cinder', blur: 3 } },
];

/** A shard of cinderite: a glassy ember-red crystal, lit (glowing) or dull. */
const shard = (x: number, y: number, h: number, lit: number): Shape[] => [
  path(`M ${x - 2.2} ${y} L ${x - 0.6} ${y - h} L ${x + 1.4} ${y - h * 0.8} L ${x + 2.4} ${y} Z`, { fill: lit > 0 ? { linear: [x, y - h, x, y] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.5, color: 'cinder' }, { at: 1, color: 'flame-dark' }] } : 'rust-dark', outline: true, ...(lit > 0 ? { glow: { color: 'cinder', blur: 3 * lit } } : {}) }),
  line([x - 0.4, y - h * 0.85, x + 0.2, y - 1], 0.6, { id: 'cinder-light', alpha: lit > 0 ? 0.9 : 0.25 }),
];

/** The vent's ash cone and its mouth (dark, or glowing at `heat` 0..1). */
const cone = (heat: number): Shape[] => [
  shadow(18, 4.5, -1),
  path('M -18 0 Q -16 -8 -8 -11 Q 0 -13 8 -11 Q 16 -8 18 0 Z', { fill: { linear: [-12, -12, 12, 0], stops: [{ at: 0, color: 'ash-light' }, { at: 0.6, color: 'ash' }, { at: 1, color: 'ash-dark' }] }, outline: true }),
  path('M -11 -6 Q -6 -9 -2 -8', trim({ id: 'ash-pale', alpha: 0.6 }, 1)),
  ellipse(0, -10.5, 6, 2.2, solid('ash-dark')),
  ...(heat > 0 ? [{ ...ellipse(0, -10.5, 5, 1.7, { fill: 'cinder', alpha: heat }), glow: { color: 'cinder', blur: 6 * heat } }] : []),
];

/** Cinderite crusting the cone's rim: up to five shards, the first `n`, lit or dull. */
const crust = (n: number, lit: number, k = 1): Shape[] =>
  ([
    [-11, -4, 7],
    [10, -4, 6],
    [-6, -8, 5],
    [6, -8, 5],
    [-14, -1, 4],
  ] as const)
    .slice(0, n)
    .flatMap(([x, y, h]) => shard(x, y, h * k, lit));

/** The vent open, flaring: a fire plume out of its mouth, its crust lit. */
const flare = (n: number): Shape[] => [
  ...cone(1),
  { ...path('M -5 -11 Q -8 -22 -2 -32 Q 0 -38 1 -30 Q 7 -22 5 -11 Z', { fill: { radial: [0, -14, 20] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.55, color: 'cinder' }, { at: 1, color: 'flame-dark' }] }, alpha: 0.9 }), glow: { color: 'cinder', blur: 8 } },
  ellipse(0, -16, 2.5, 4, flat({ id: 'cinder-light', alpha: 0.8 })),
  ...crust(n, 1),
];

/** A cinder vent (060): open (flaring) by uses left, then its spent cone, the crust growing back. Its closed and warning looks are below. */
export const CINDER_VENT = {
  size: [40, 46] as const,
  anchor: [20, 40] as const,
  uses: [flare(2), flare(3), flare(5)],
  regrow: [[...cone(0)], [...cone(0), ...crust(2, 0, 0.4)], [...cone(0), ...crust(3, 0, 0.6)], [...cone(0), ...crust(5, 0, 0.8)]],
};

/** Closed: the cone cold and its crust dull, a thin wisp of smoke; warning: its mouth and crust glowing, heat shimmering. */
const VENT_CLOSED: Shape[] = [...cone(0), ...crust(5, 0), ellipse(1, -16, 2, 2.5, flat({ id: 'ash-pale', alpha: 0.3 })), ellipse(3, -21, 3, 3, flat({ id: 'ash-pale', alpha: 0.18 }))];
const VENT_WARNING: Shape[] = [...cone(1), ...crust(5, 0.6), { ...ellipse(0, -14, 9, 4, { fill: 'cinder', alpha: 0.25 }), glow: { color: 'cinder', blur: 10 } }];

/** The cinderite item: a glassy ember-red crystal cluster with a dark core. */
const CINDERITE: Shape[] = [
  path('M -6 5 L -4 -2 L -1 -6 L 2 -1 L 0 5 Z', { fill: { linear: [-4, -6, 0, 5] as const, stops: [{ at: 0, color: 'cinder-light' }, { at: 0.5, color: 'cinder' }, { at: 1, color: 'flame-dark' }] }, outline: true }),
  path('M 0 5 L 2 -1 L 5 -4 L 6.5 1 L 5 5.5 Z', { fill: { linear: [2, -4, 5, 5] as const, stops: [{ at: 0, color: 'cinder' }, { at: 1, color: 'rust-dark' }] }, outline: true }),
  path('M -3.5 1 L -2 -3 L -0.5 -1 Z', flat({ id: 'ink', alpha: 0.35 })),
  { ...line([-3, -2, -1, -5], 0.8, 'cinder-light'), glow: { color: 'cinder', blur: 3 } },
];

/** The Forgewright core: a soot-iron octagon banded in brass, a forge-glow at its heart through a cyan ley ring. */
const FORGEWRIGHT_CORE: Shape[] = [
  path('M -2.8 -6.6 L 2.8 -6.6 L 6.6 -2.8 L 6.6 2.8 L 2.8 6.6 L -2.8 6.6 L -6.6 2.8 L -6.6 -2.8 Z', {
    fill: { linear: [-6, -6, 6, 6] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 0.5, color: 'iron' }, { at: 1, color: 'iron-dark' }] },
    outline: true,
  }),
  rect(-6.6, -1, 13.2, 2, 0.4, solid('brass')),
  ellipse(0, 0, 3.4, 3.4, { stroke: { color: 'cyan', width: 0.8 }, glow: { color: 'cyan', blur: 2 } }),
  ellipse(0, 0, 2.2, 2.2, { fill: 'cinder', glow: { color: 'cinder-light', blur: 5 } }),
  ellipse(-0.6, -0.6, 0.8, 0.8, flat('cinder-light')),
];

/** The forge rivet: a fat iron rivet, its domed head lit from the top left, glowing at its heated tip. */
const FORGE_RIVET: Shape[] = [
  rect(-1.8, -0.5, 3.6, 7, 0.8, { fill: { linear: [-2, 0, 2, 0] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
  { ...ellipse(0, 6.2, 1.8, 0.9, { fill: 'cinder' }), glow: { color: 'cinder', blur: 3 } },
  path('M -5.6 0 Q -5.4 -6 0 -6.2 Q 5.4 -6 5.6 0 Z', {
    fill: { linear: [-4, -6, 4, 0] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 0.6, color: 'iron' }, { at: 1, color: 'iron-dark' }] },
    outline: true,
  }),
  path('M -3.6 -2 Q -3 -4.6 -0.4 -4.8', { stroke: { color: 'snow', width: 0.8 }, alpha: 0.6 }),
];

/** The minimap's Slag River: an ember channel under a bridge. */
const ICON_RIVER: Shape[] = [rect(-5, -1.5, 10, 3, 0.8, { fill: 'cinder', outline: true }), rect(-1.5, -3.5, 3, 7, 0.5, solid('carve-light'))];

/** Every Emberworks sprite, for the vector catalog. */
export const EMBERWORKS_SPRITES_VECTOR: readonly VectorSprite[] = [
  one(EMBERWORKS_SPRITES.kiln, [36, 48], [18, 44], KILN),
  one(EMBERWORKS_SPRITES.kilnTop, [36, 44], [18, 40], KILN_TOP),
  ...EMBERWORKS_SPRITES.chimney.map((key, i) => one(key, [30, 92], [15, 88], chimney(i))),
  ...EMBERWORKS_SPRITES.cliffs.map((key, i) => one(key, [36, 44], [18, 40], cliff(i, ASH_STONE))),
  one(EMBERWORKS_SPRITES.cliffTop, [36, 44], [18, 40], cliffTop(ASH_STONE)),
  one(EMBERWORKS_SPRITES.hallWall, [34, 52], [17, 48], ANVIL_WALL),
  one(EMBERWORKS_SPRITES.vent.closed, CINDER_VENT.size, CINDER_VENT.anchor, VENT_CLOSED),
  one(EMBERWORKS_SPRITES.vent.warning, CINDER_VENT.size, CINDER_VENT.anchor, VENT_WARNING),
  one(EMBERWORKS_SPRITES.itemCinderite, [16, 16], [8, 8], CINDERITE),
  one(EMBERWORKS_SPRITES.itemForgewrightCore, [16, 16], [8, 8], FORGEWRIGHT_CORE),
  one(EMBERWORKS_SPRITES.itemForgeRivet, [16, 16], [8, 8], FORGE_RIVET),
  one(MAP_ICONS.river, [12, 10], [6, 5], ICON_RIVER),
];
