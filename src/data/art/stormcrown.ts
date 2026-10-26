import { MAP_ICONS } from '../landmarkAssets';
import { SLATE_STONE, STORMCROWN_SPRITES } from '../stormcrownAssets';
import { cliff, cliffTop } from './hollows';
import { shadow } from './terrain';
import { ellipse, flat, line, path, rect, solid, type Shape, type VectorSprite } from './types';

// The Stormcrown's standing things (064) in the 016/020 vector style: tall iron rods of the builders' storm-works,
// brass-banded on slate footings with a cyan ley spark at the tip; cairns of wind-cut slate; and its cliffs in cool
// slate. World px round each anchor, which sits at the bottom centre of its tile; light from the top left.

const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

const slateFoot = { linear: [0, -12, 0, 0] as const, stops: [{ at: 0, color: 'storm-light' }, { at: 1, color: 'storm-dark' }] };
const ironBar = { linear: [-3, 0, 3, 0] as const, stops: [{ at: 0, color: 'iron-light' }, { at: 0.45, color: 'iron' }, { at: 1, color: 'iron-dark' }] };

/** An iron rod: a slate footing, a tall iron post with two brass bands, a forked crown and a cyan spark (variant: height and lean). */
function ironRod(variant: number): Shape[] {
  const top = variant === 0 ? -74 : -62;
  return [
    shadow(11, 3.5, -1),
    rect(-9, -10, 18, 10, 2, { fill: slateFoot, outline: true }),
    rect(-3, top, 6, -8 - top, 1, { fill: ironBar, outline: true }),
    rect(-4, top + 14, 8, 3, 0.6, solid('brass')),
    rect(-4, -22, 8, 3, 0.6, solid('brass')),
    line([-3, top + 1, -7, top - 7], 1.8, 'iron-dark'),
    line([3, top + 1, 7, top - 7], 1.8, 'iron-dark'),
    line([0, top, 0, top - 9], 1.6, 'iron'),
    { ...ellipse(0, top - 10, 2.4, 2.4, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 6 } },
    line([-1.5, top + 4, -1.5, -12], 0.8, { id: 'snow', alpha: 0.3 }),
  ];
}

/** A cairn: three or four slate stones heaped, each lit on its top-left (variant: the heap's shape). */
function cairn(variant: number): Shape[] {
  const stones: readonly (readonly [number, number, number, number])[] =
    variant === 0
      ? [[-13, -11, 26, 11], [-10, -20, 18, 10], [-6, -28, 12, 9]]
      : variant === 1
        ? [[-14, -10, 14, 10], [0, -12, 14, 12], [-8, -21, 17, 10], [-4, -30, 9, 9]]
        : [[-12, -12, 24, 12], [-7, -22, 15, 11]];
  return [
    shadow(15, 4, -1),
    ...stones.flatMap(([x, y, w, h]) => [
      rect(x, y, w, h, 3, { fill: { linear: [x, y, x + w, y + h] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.45, color: 'storm-light' }, { at: 1, color: 'storm' }] }, outline: true }),
      line([x + 2, y + 1.5, x + w - 3, y + 1.5], 0.8, { id: 'snow', alpha: 0.35 }),
    ]),
    { ...line([-3, -6, 0, -9, 3, -7], 0.9, 'vein'), glow: { color: 'vein', blur: 3 } },
  ];
}

/** A cairn's top where another stands in front: a flat heap of slate. */
const CAIRN_TOP: Shape[] = [rect(-15, -30, 30, 26, 4, { fill: { linear: [-15, -30, 15, -4] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 1, color: 'storm-light' }] } }), line([-10, -22, 6, -20], 0.8, { id: 'storm', alpha: 0.6 })];

/** A shard of stormglass: a pale violet crystal, its cyan crackle lit (glowing) or dull. */
const glassShard = (x: number, y: number, h: number, lit: number): Shape[] => [
  path(`M ${x - 1.8} ${y} L ${x - 0.6} ${y - h} L ${x + 1.2} ${y - h * 0.75} L ${x + 2} ${y} Z`, {
    fill: lit > 0 ? { linear: [x, y - h, x, y] as const, stops: [{ at: 0, color: 'snow' }, { at: 0.4, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] } : 'storm-light',
    outline: true,
    ...(lit > 0 ? { glow: { color: 'cyan', blur: 3 * lit } } : {}),
  }),
  line([x - 0.3, y - h * 0.8, x + 0.4, y - h * 0.45, x - 0.2, y - 1], 0.6, { id: 'cyan-glow', alpha: lit > 0 ? 0.95 : 0.3 }),
];

/** The rod's footing and shaft: a slate base, a dark iron rod with brass bands and an open crown (lit by `glow` 0..1). */
const rodBody = (glow: number): Shape[] => [
  shadow(13, 3.5, -1),
  rect(-10, -9, 20, 9, 2, { fill: slateFoot, outline: true }),
  rect(-2.5, -54, 5, 46, 1, { fill: ironBar, outline: true }),
  rect(-3.5, -40, 7, 2.5, 0.5, solid('brass')),
  rect(-3.5, -20, 7, 2.5, 0.5, solid('brass')),
  line([-2.5, -54, -6, -60], 1.6, 'iron-dark'),
  line([2.5, -54, 6, -60], 1.6, 'iron-dark'),
  { ...ellipse(0, -57, 2.2, 2.2, { fill: glow > 0 ? 'cyan-glow' : 'iron-light', ...(glow > 0 ? { glow: { color: 'cyan', blur: 4 + 6 * glow } } : {}) }) },
];

/** Stormglass crusting the rod's crown and footing: up to five shards, the first `n`, lit or dull. */
const glassCrust = (n: number, lit: number, k = 1): Shape[] =>
  ([
    [-7, -8, 6],
    [7, -8, 5],
    [-4, -54, 5],
    [4, -55, 5],
    [0, -10, 4],
  ] as const)
    .slice(0, n)
    .flatMap(([x, y, h]) => glassShard(x, y, h * k, lit));

/** Charged: the rod humming with the strike, cyan arcs crawling up it, its crust lit. */
const charged = (n: number): Shape[] => [
  { ...ellipse(0, -30, 12, 30, { fill: 'storm-glow', alpha: 0.18 }), glow: { color: 'storm-glow', blur: 10 } },
  ...rodBody(1),
  { ...line([-1, -50, 2, -42, -2, -34, 1, -26], 0.9, 'cyan-glow'), glow: { color: 'cyan', blur: 4 } },
  ...glassCrust(n, 1),
];

/** A storm rod (064): charged by uses left, then spent (its crust gone), growing back. Its idle, warning and strike looks are below. */
export const STORM_ROD_NODE = {
  size: [40, 80] as const,
  anchor: [20, 74] as const,
  uses: [charged(2), charged(3), charged(5)],
  regrow: [[...rodBody(0)], [...rodBody(0), ...glassCrust(2, 0, 0.4)], [...rodBody(0), ...glassCrust(3, 0, 0.6)], [...rodBody(0), ...glassCrust(5, 0, 0.8)]],
};

/** Idle: the rod cold, its crust dull; warning: sparks crawling up it and its crown flashing; strike: a bolt down onto it in a flash. */
const ROD_IDLE: Shape[] = [...rodBody(0), ...glassCrust(5, 0)];
const ROD_WARNING: Shape[] = [
  ...rodBody(0.6),
  ...glassCrust(5, 0.4),
  { ...line([-4, -60, -1, -52, -4, -46], 0.8, 'cyan-glow'), glow: { color: 'cyan', blur: 3 } },
  { ...line([4, -44, 1, -36, 4, -30], 0.8, 'cyan-glow'), glow: { color: 'cyan', blur: 3 } },
  { ...ellipse(0, -60, 8, 8, { fill: 'cyan-glow', alpha: 0.35 }), glow: { color: 'cyan', blur: 8 } },
];
const ROD_STRIKE: Shape[] = [
  { ...ellipse(0, -36, 18, 38, { fill: 'snow', alpha: 0.35 }), glow: { color: 'cyan-glow', blur: 14 } },
  ...rodBody(1),
  ...glassCrust(5, 1),
  { ...line([0, -58, -4, -63, 3, -66, -2, -70, 1, -73], 2.6, 'snow'), glow: { color: 'cyan', blur: 8 } },
  line([0, -58, -4, -63, 3, -66, -2, -70, 1, -73], 1, 'cyan-glow'),
];

/** The stormglass item: a pale violet crystal shard with a cyan crackle, a smaller one beside it. */
const STORMGLASS: Shape[] = [
  path('M -5 6 L -3.5 -3 L -0.5 -7 L 2 -2 L 0.5 6 Z', { fill: { linear: [-3, -7, 0, 6] as const, stops: [{ at: 0, color: 'snow' }, { at: 0.45, color: 'storm-pale' }, { at: 1, color: 'storm-glow' }] }, outline: true }),
  path('M 0.5 6 L 2.5 0 L 5 -2 L 6.5 2 L 5 6 Z', { fill: { linear: [2, -2, 5, 6] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 1, color: 'storm' }] }, outline: true }),
  { ...line([-2.5, -3, -0.6, -0.5, -2, 2, -0.5, 4.5], 0.8, 'cyan-glow'), glow: { color: 'cyan', blur: 3 } },
];

/** The Conductor core: a slate-violet orb in a brass cage, a forked lightning heart glowing through a cyan ley ring. */
const CONDUCTOR_CORE: Shape[] = [
  ellipse(0, 0, 6.4, 6.4, { fill: { radial: [-1.5, -1.5, 7] as const, stops: [{ at: 0, color: 'storm-pale' }, { at: 0.5, color: 'storm' }, { at: 1, color: 'storm-dark' }] }, outline: true }),
  ellipse(0, 0, 3.6, 3.6, { stroke: { color: 'cyan', width: 0.8 }, glow: { color: 'cyan', blur: 2 } }),
  { ...line([0.8, -3, -1, 0, 0.8, 0.4, -0.8, 3], 1, 'snow'), glow: { color: 'cyan-glow', blur: 3 } },
  line([-6.4, 0, 6.4, 0], 0.9, 'brass'),
  line([0, -6.4, 0, -4], 0.9, 'brass'),
  line([0, 4, 0, 6.4], 0.9, 'brass'),
  ellipse(-2.4, -3.4, 1, 0.7, flat({ id: 'snow', alpha: 0.6 })),
];

/** The storm coil: a brass coil wound round an iron core, its ends sparking cyan. */
const STORM_COIL: Shape[] = [
  rect(-1.4, -6.5, 2.8, 13, 0.6, { fill: ironBar, outline: true }),
  ...[-4.5, -2, 0.5, 3].map((y) => rect(-4.6, y, 9.2, 2.2, 1, { fill: { linear: [-4, 0, 4, 0] as const, stops: [{ at: 0, color: 'brass-light' }, { at: 0.5, color: 'brass' }, { at: 1, color: 'brass-dark' }] }, outline: true })),
  { ...ellipse(0, -6.8, 1.4, 1.4, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 3 } },
  { ...ellipse(0, 6.8, 1.4, 1.4, { fill: 'cyan-glow' }), glow: { color: 'cyan', blur: 3 } },
];

/** 064: a length of the Crown Spire's wall: slate blocks, a pale top, a brass band and a cyan rune course. */
const SPIRE_WALL: Shape[] = [
  shadow(16, 4, -1),
  rect(-16, -34, 32, 34, 2, solid('storm')),
  rect(-16, -42, 32, 10, 2, solid('storm-light')),
  line([-15, -41, 15, -41], 1, 'storm-pale'),
  rect(-16, -24, 32, 3, 0.5, flat('brass')),
  line([-16, -12, 16, -12], 1, { id: 'ink', alpha: 0.45 }),
  line([0, -32, 0, -24], 1, { id: 'ink', alpha: 0.45 }),
  line([-8, -21, -8, 0], 1, { id: 'ink', alpha: 0.45 }),
  line([8, -21, 8, 0], 1, { id: 'ink', alpha: 0.45 }),
  { ...line([-11, -6, -8, -9, -5, -6, -2, -9], 0.9, 'cyan'), glow: { color: 'cyan', blur: 3 } },
];

/** The minimap's Broken Sky-bridge: a broken arch over a dark rift. */
const ICON_BRIDGE: Shape[] = [rect(-1.5, -5, 3, 10, 0.5, { fill: 'ink', outline: true }), path('M -5 2 Q -5 -3 -1 -3 L -1 -1 Q -3 -1 -3 2 Z', { fill: 'storm-pale', outline: true }), path('M 5 2 Q 5 -3 2 -3 L 2 -1 Q 3 -1 3 2 Z', { fill: 'storm-pale', outline: true })];

/** Every Stormcrown sprite, for the vector catalog. */
export const STORMCROWN_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...STORMCROWN_SPRITES.ironRod.map((key, i) => one(key, [20, 92], [10, 88], ironRod(i))),
  ...STORMCROWN_SPRITES.cairn.map((key, i) => one(key, [34, 40], [17, 36], cairn(i))),
  one(STORMCROWN_SPRITES.cairnTop, [34, 40], [17, 36], CAIRN_TOP),
  ...STORMCROWN_SPRITES.cliffs.map((key, i) => one(key, [36, 44], [18, 40], cliff(i, SLATE_STONE))),
  one(STORMCROWN_SPRITES.cliffTop, [36, 44], [18, 40], cliffTop(SLATE_STONE)),
  one(STORMCROWN_SPRITES.spireWall, [34, 52], [17, 48], SPIRE_WALL),
  one(STORMCROWN_SPRITES.rod.idle, STORM_ROD_NODE.size, STORM_ROD_NODE.anchor, ROD_IDLE),
  one(STORMCROWN_SPRITES.rod.warning, STORM_ROD_NODE.size, STORM_ROD_NODE.anchor, ROD_WARNING),
  one(STORMCROWN_SPRITES.rod.strike, STORM_ROD_NODE.size, STORM_ROD_NODE.anchor, ROD_STRIKE),
  one(STORMCROWN_SPRITES.itemStormglass, [16, 16], [8, 8], STORMGLASS),
  one(STORMCROWN_SPRITES.itemConductorCore, [16, 16], [8, 8], CONDUCTOR_CORE),
  one(STORMCROWN_SPRITES.itemStormCoil, [16, 16], [8, 8], STORM_COIL),
  one(MAP_ICONS.bridge, [12, 12], [6, 6], ICON_BRIDGE),
];
