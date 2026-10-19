import { INTAKE_CAP_ICON, INTAKE_EMPTY_ICON, LOGISTICS_ICONS, SITE_ICONS } from '../foundryAssets';
import { SPRITES } from '../assets';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// Item icons and build emblems (020), in the 016 vector style: 16x16 world px
// round the centre, used on the ground, in the HUD, in menus and riding
// conduits. The 005 look-alike pairs stay apart by shape: the shaft is a thin
// straight rod and the fuse a fat twisted coil; the ley shard is three loose
// chunks and the ley bolt one head on a trail; the casing an open shell and the
// bomb a sealed sphere.

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

const glowDot = (x: number, y: number, r: number, color: string): Shape => ellipse(x, y, r, r, { fill: color, glow: { color, blur: 3 } });

/** A rune: a short carved zig-zag. */
const rune = (x: number, y: number, color: string, w = 0.7): Shape => path(`M ${x - 1.4} ${y - 1.6} L ${x + 0.6} ${y - 0.2} L ${x - 0.8} ${y + 0.4} L ${x + 1.4} ${y + 1.8}`, trim(color, w));

const WOOD: Shape[] = [
  rect(-6.5, -3.4, 11, 6.8, 2.6, { fill: { linear: [0, -3.4, 0, 3.4], stops: [{ at: 0, color: 'wood-light' }, { at: 0.45, color: 'wood' }, { at: 1, color: 'wood-dark' }] }, outline: true }),
  line([-5, -1.4, -1, -1.4], 0.6, 'wood-dark'),
  line([-3, 1.2, 2, 1.2], 0.6, 'wood-dark'),
  line([-1.6, -3.6, -0.6, -5.2], 0.9, 'wood-dark', true),
  ellipse(-0.4, -5.6, 1.3, 0.9, flat('leaf')),
  ellipse(4.6, 0, 2.4, 3.4, solid('straw-light')),
  ellipse(4.6, 0, 1.3, 1.9, trim('wood-light', 0.6)),
];

const STONE: Shape[] = [
  path('M -6 3.5 L -6.5 -1 L -3 -4.8 L 2.5 -5 L 6.3 -1.5 L 5.5 3.8 Z', { fill: { linear: [-4, -5, 4, 4], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  path('M -6 3.5 L -1 1 L 5.5 3.8', trim('rock', 0.6)),
  path('M -1 1 L -3 -4.8', trim('rock', 0.5)),
  rune(2, -1.6, 'rock-dark'),
];

const FIBER: Shape[] = [
  ...[-3, -1.5, 0, 1.5, 3].map((d, i) =>
    path(`M ${-5 + d * 0.4} ${6} Q ${d * 0.8} 0 ${-1 + d} ${-6}`, trim(i % 2 === 0 ? 'leaf' : 'leaf-light', 1.1)),
  ),
  ...[-2, 0.5, 2.5].map((d) => path(`M ${-4 + d * 0.5} ${6} Q ${d} 0 ${d + 1} ${-6}`, trim('leaf-dark', 0.5))),
  rect(-4.2, -1.1, 7.4, 2.4, 0.8, solid('straw')),
  line([-3.4, 0.1, 2.4, 0.1], 0.4, 'straw-dark'),
];

const crystal = (x: number, y: number, h: number, w: number, lean: number): Shape[] => [
  path(`M ${x - w} ${y} L ${x - w + lean * 0.4} ${y - h * 0.72} L ${x + lean} ${y - h} L ${x + w + lean * 0.4} ${y - h * 0.72} L ${x + w} ${y} Z`, {
    fill: { linear: [x, y, x + lean, y - h], stops: [{ at: 0, color: 'cyan-deep' }, { at: 0.55, color: 'cyan' }, { at: 1, color: 'cyan-glow' }] },
    outline: true,
    glow: { color: 'cyan-glow', blur: 2 },
  }),
  path(`M ${x - w * 0.3} ${y - 0.8} L ${x - w * 0.3 + lean * 0.4} ${y - h * 0.68}`, trim('snow', 0.6)),
];

const LEY_CRYSTAL: Shape[] = [
  path('M -6 5.5 Q -6 2.6 -3 2.2 L 3.4 2 Q 6.4 2.4 6 5.5 Z', solid('rock-light')),
  ...crystal(-2.6, 3, 6, 1.8, -1.2),
  ...crystal(2.6, 3, 5.5, 1.7, 1.4),
  ...crystal(0, 3, 9.5, 2.4, 0.4),
];

const HUSK_RESIN: Shape[] = [
  path('M -6 3 Q -6.4 -2 -2.6 -4.4 Q 1 -6.4 4.4 -3.6 Q 6.8 -0.8 5.4 2.8 Q 3.6 5.6 -0.6 5.4 Q -4.8 5.4 -6 3 Z', {
    fill: { radial: [-1.6, -2, 7.5], stops: [{ at: 0, color: 'resin-light' }, { at: 0.5, color: 'resin' }, { at: 1, color: 'resin-dark' }] },
    outline: true,
  }),
  ellipse(-2.4, -2.2, 1.6, 0.9, { fill: { id: 'snow', alpha: 0.55 } }),
  glowDot(2, 1.4, 0.9, 'cyan'),
];

// The shaft: a thin straight rod of pale wood, a nock at its foot. Thin and plain next to the fat fuse coil.
const SHAFT: Shape[] = [
  line([-5.6, 5.6, 5.6, -5.6], 1.8, 'wood-light', true),
  line([-5, 4.6, 5, -5.4], 0.5, 'straw-light'),
  path('M -6.6 4.4 L -5.2 5.8 L -4.4 6.8', trim('wood-dark', 0.8)),
];

// The arrowhead: only the knapped stone head, no wood (021).
const ARROWHEAD: Shape[] = [
  path('M 6 -6 L -2.8 -1.2 L -0.6 0.6 L 1.2 2.8 Z', { fill: { linear: [6, -6, -1, 1], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] }, outline: true }),
  path('M 6 -6 L -0.6 0.6', trim('rock', 0.5)),
  path('M 2.6 -4.2 L 1.4 -2.4 M 4.2 -2.6 L 2.4 -1.4', trim('rock', 0.4)),
];

const ROPE: Shape[] = [
  ellipse(0, 1, 6, 4.4, trim('straw-dark', 2.6)),
  ellipse(0, 1, 6, 4.4, trim('straw', 1.6)),
  ellipse(0, 1, 3.2, 2.2, trim('straw-dark', 2.2)),
  ellipse(0, 1, 3.2, 2.2, trim('straw-light', 1.2)),
  path('M 5.4 2.6 Q 7.4 5 5.6 6.8', trim('straw-dark', 2)),
  path('M 5.4 2.6 Q 7.4 5 5.6 6.8', trim('straw', 1.1)),
  ...[-4, -1.5, 1.5, 4].map((x) => line([x - 0.5, -3, x + 0.5, -2.2], 0.4, 'straw-dark')),
];

// The casing: an open shell of pale stone, its dark hollow showing at the top and a ley rune on its side. Open and upright next to the sealed bomb.
const CASING: Shape[] = [
  path('M -5 -3.4 L -4.4 4.6 Q 0 6.6 4.4 4.6 L 5 -3.4 Z', { fill: { linear: [-5, 0, 5, 0], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  ellipse(0, -3.4, 5, 1.9, solid('rock-pale')),
  ellipse(0, -3.2, 3.6, 1.2, flat('ink')),
  path('M -1.4 0 L 0 1.8 L 1.4 0 L 0 3.6', { ...trim('cyan', 0.7), glow: { color: 'cyan', blur: 2 } }),
];

// The fuse: a fat coil of resin-soaked cord, twisted, its loose end lit.
const FUSE: Shape[] = [
  path('M -5 4 Q -6.4 -1 -2 -2.4 Q 2.6 -3.6 3.2 0.4 Q 3.6 3.8 -0.4 3.6', trim('resin-dark', 3.6)),
  path('M -5 4 Q -6.4 -1 -2 -2.4 Q 2.6 -3.6 3.2 0.4 Q 3.6 3.8 -0.4 3.6', trim('resin', 2.4)),
  ...[
    [-5.2, 1.4],
    [-3.8, -1.8],
    [-0.6, -2.8],
    [2.4, -1.6],
    [3.2, 1.6],
  ].map(([x, y]) => line([(x ?? 0) - 0.7, (y ?? 0) - 0.7, (x ?? 0) + 0.7, (y ?? 0) + 0.7], 0.5, 'resin-dark')),
  path('M -5 4 Q -4.4 6.4 -1.6 6.2', trim('resin', 1.6)),
  glowDot(-1.2, 6, 1.3, 'cinder-light'),
  glowDot(0.4, 5.2, 0.6, 'cinder'),
];

// The ley shard: three small loose chunks of ground crystal.
const shard = (x: number, y: number, s: number, turn: number): Shape =>
  path(`M ${x} ${y - 2.2 * s} L ${x + 1.8 * s} ${y - turn} L ${x + 0.8 * s} ${y + 1.8 * s} L ${x - 1.6 * s} ${y + 1 * s} L ${x - 1.4 * s} ${y - 1 * s} Z`, {
    fill: { linear: [x - 2, y + 2, x + 2, y - 2], stops: [{ at: 0, color: 'cyan-deep' }, { at: 1, color: 'cyan-glow' }] },
    outline: true,
    glow: { color: 'cyan', blur: 2 },
  });
const LEY_SHARD: Shape[] = [shard(-3.4, 2.6, 1.3, 0.6), shard(3.2, 3, 1.1, -0.4), shard(0, -2.6, 1.4, 0.2)];

const WARDEN_CORE: Shape[] = [
  ellipse(0, 0, 5.4, 6, { fill: { radial: [-1.4, -2, 6.6], stops: [{ at: 0, color: 'core' }, { at: 1, color: 'core-dark' }] }, outline: true }),
  path('M -3.4 -3.2 Q -1.6 -4.8 0.6 -4.6', trim({ id: 'snow', alpha: 0.5 }, 0.8)),
  ellipse(0, 0.6, 2.2, 2.2, { fill: 'gold-trim', glow: { color: 'gold-trim', blur: 5 } }),
  ellipse(-0.4, 0.2, 0.8, 0.8, flat('snow')),
];

const UNIDENTIFIED_ARMOR: Shape[] = [
  path('M -6 -2 Q -6.4 -5 -3 -5.4 L 3.4 -5.4 Q 6.6 -5 6 -2 L 5.4 4.4 Q 5 6 3 6 L -3 6 Q -5 6 -5.4 4.4 Z', {
    fill: { linear: [0, -5.4, 0, 6], stops: [{ at: 0, color: 'leather' }, { at: 1, color: 'leather-dark' }] },
    outline: true,
  }),
  path('M -5.6 -0.6 Q 0 1.4 5.6 -0.6', trim('straw', 1.2)),
  path('M -1.2 -5.4 Q 0.6 0 -0.6 6', trim('straw', 1.2)),
  ellipse(-0.3, 0.5, 1.4, 1, solid('straw-dark')),
  path('M 2.2 -3.8 Q 3.4 -4.6 4 -3.4', trim('leather-dark', 0.6)),
];

const ARMOR_LIGHT: Shape[] = [
  path('M -6 -4.6 L -2.6 -6 Q 0 -4 2.6 -6 L 6 -4.6 L 5 0 L 4.6 6 L -4.6 6 L -5 0 Z', {
    fill: { linear: [0, -6, 0, 6], stops: [{ at: 0, color: 'leaf-light' }, { at: 1, color: 'leaf-dark' }] },
    outline: true,
  }),
  path('M 0 -4.4 L 0 6', trim('leaf-dark', 0.7)),
  ...[-1.6, 1, 3.6].map((y) => line([-1.2, y, 1.2, y], 0.6, 'strap')),
  path('M -6 -4.6 L -4.4 -1.4 M 6 -4.6 L 4.4 -1.4', trim('leather', 0.8)),
];

const ARMOR_HEAVY: Shape[] = [
  path('M -6.6 -4.6 L -3 -6.4 Q 0 -5 3 -6.4 L 6.6 -4.6 L 6 1.6 Q 3.6 6.4 0 6.6 Q -3.6 6.4 -6 1.6 Z', {
    fill: { linear: [-6, -6, 6, 6], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 1, color: 'rock' }] },
    outline: true,
  }),
  path('M -4.6 -2.4 L 4.6 -2.4', trim('rock', 0.6)),
  rect(-6.8, -5.4, 3.4, 2.6, 1, solid('brass')),
  rect(3.4, -5.4, 3.4, 2.6, 1, solid('brass')),
  path('M -1.6 0.4 L 0 2.4 L 1.6 0.4 L 0 4.4', { ...trim('cyan', 0.7), glow: { color: 'cyan', blur: 2 } }),
];

// Ammo icons, pointing up-right, matching their projectiles (016).
/** The arrow icon's stone head: an element tag (029) recolours just this shape. */
export const ICON_ARROW_HEAD: Shape = path('M 6.4 -6.4 L 1.8 -4.2 L 4.2 -1.8 Z', solid('rock-pale'));
export const ICON_ARROW: Shape[] = [
  line([-6, 6, 3.4, -3.4], 1.4, 'wood-light', true),
  path('M -6.4 6.4 L -7 3.2 L -4.6 4.6 Z', flat('rust-light')),
  path('M -6.4 6.4 L -3.2 7 L -4.6 4.6 Z', flat('rust')),
  ICON_ARROW_HEAD,
];

export const ICON_BOMB: Shape[] = [
  ellipse(-0.6, 1.4, 5.4, 5.4, { fill: { radial: [-2, -0.6, 6], stops: [{ at: 0, color: 'rock-dark' }, { at: 1, color: 'ink' }] }, outline: true }),
  rect(-5.8, 0.3, 10.4, 2.2, 1, { fill: 'cinder', glow: { color: 'cinder', blur: 2 } }),
  ellipse(-2.6, -1.4, 1.4, 0.9, flat('rock-light')),
  line([2.4, -3, 4.2, -5.6], 1.1, 'wood', true),
  glowDot(4.6, -6.2, 1.3, 'cinder-light'),
];

export const ICON_LEY_BOLT: Shape[] = [
  { ...line([-6.4, 6.4, 0.6, -0.6], 2.4, { id: 'cyan', alpha: 0.5 }), glow: { color: 'cyan', blur: 3 } },
  path('M 6.6 -6.6 L 0.4 -3.6 L -0.6 0.6 L 3.6 -0.4 Z', { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 4 } }),
];

const ITEM_SHADOW: VectorSprite = { key: SPRITES.itemShadow, size: [12, 5], anchor: [6, 2.5], frames: [[ellipse(0, 0, 5, 1.5, { fill: { id: 'ground-shade', alpha: 0.4 } })]] };

// Build and menu emblems.
const channel = (exitGold: boolean): Shape[] => [
  rect(-7, -3.6, 14, 7.2, 1.6, solid('rock-light')),
  rect(-7, -2, 14, 4, 0.8, { fill: 'cyan-deep', glow: { color: 'cyan', blur: 2 } }),
  path('M -2.6 -1.8 L 1 0 L -2.6 1.8', trim('cyan-glow', 1.1)),
  path('M 2 -1.8 L 5.6 0 L 2 1.8', trim('cyan-glow', 1.1)),
  ...(exitGold ? [rect(-1.6, -7.2, 3.2, 4.4, 0.8, solid('gold-trim')), path('M -1.6 -5.4 L 0 -7.2 L 1.6 -5.4', trim('brass-dark', 0.8))] : []),
];

const CHEST: Shape[] = [
  rect(-6.6, -2.6, 13.2, 8.4, 1, { fill: { linear: [0, -2, 0, 6], stops: [{ at: 0, color: 'wood' }, { at: 1, color: 'wood-dark' }] }, outline: true }),
  path('M -6.6 -2.4 Q -6.6 -6.4 0 -6.4 Q 6.6 -6.4 6.6 -2.4 Z', solid('wood-light')),
  rect(-4.6, -6.2, 1.8, 12, 0.4, solid('brass')),
  rect(2.8, -6.2, 1.8, 12, 0.4, solid('brass')),
  rect(-1.3, -1.4, 2.6, 3, 0.6, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 2 } }),
];

const CRATE_EMBLEM: Shape[] = [
  rect(-6.4, -5, 12.8, 10.6, 1, { fill: { linear: [0, -5, 0, 5], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  rect(-6.4, -5, 12.8, 3, 1, solid('rock-pale')),
  ...[-4.2, 4.2].map((x) => rect(x - 0.9, -5, 1.8, 10.6, 0.3, solid('brass-dark'))),
  ellipse(0, 1.2, 1.8, 1.8, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 2 } }),
  rune(0, 1.2, 'cyan-deep', 0.5),
];

const HOPPER_EMBLEM: Shape[] = [
  path('M -7 -5.4 L 7 -5.4 L 2.4 2.2 L 2.4 6.4 L -2.4 6.4 L -2.4 2.2 Z', { fill: { linear: [0, -5, 0, 6], stops: [{ at: 0, color: 'core' }, { at: 1, color: 'core-dark' }] }, outline: true }),
  ellipse(0, -5.4, 7, 1.8, solid('core')),
  ellipse(0, -5.2, 5.2, 1.1, flat('ink')),
  rect(-3, 1.8, 6, 1.4, 0.4, solid('brass')),
];

// A capped intake entrance (024), small: a brass cap with a rivet ring and a ley rune.
const INTAKE_CAP_EMBLEM: Shape[] = [
  ellipse(0, 1, 7, 4.6, { fill: { linear: [0, -3, 0, 6], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
  ellipse(0, -0.4, 5, 2.6, { fill: { linear: [0, -3, 0, 2], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass' }] }, outline: true }),
  ...[-4.6, 4.6].map((x) => ellipse(x, 2.4, 0.7, 0.7, solid('brass-dark'))),
  { ...line([-1.6, -0.6, 1.6, -0.6], 0.8, 'cyan-glow', true), glow: { color: 'cyan', blur: 2 } },
];

const IDENTIFY_EMBLEM: Shape[] = [
  line([2.8, 2.8, 6.4, 6.4], 2, 'wood', true),
  ellipse(-1.4, -1.4, 5, 5, solid('brass')),
  ellipse(-1.4, -1.4, 3.6, 3.6, { fill: { radial: [-2.6, -2.6, 4], stops: [{ at: 0, color: 'cyan-glow' }, { at: 1, color: 'cyan-deep' }] }, glow: { color: 'cyan', blur: 3 } }),
  path('M -3.4 -2.2 Q -2.8 -3.6 -1.4 -3.8', trim({ id: 'snow', alpha: 0.8 }, 0.7)),
];

const TRAVEL_EMBLEM: Shape[] = [
  path('M -6.4 6.4 L -6.4 -1.4 Q -6.4 -7 0 -7 Q 6.4 -7 6.4 -1.4 L 6.4 6.4 L 3.6 6.4 L 3.6 -1 Q 3.6 -4.2 0 -4.2 Q -3.6 -4.2 -3.6 -1 L -3.6 6.4 Z', {
    fill: { linear: [0, -7, 0, 6], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock' }] },
    outline: true,
  }),
  path('M -3.6 6.4 L -3.6 -1 Q -3.6 -4.2 0 -4.2 Q 3.6 -4.2 3.6 -1 L 3.6 6.4 Z', {
    fill: { linear: [0, -4, 0, 6], stops: [{ at: 0, color: 'cyan-glow' }, { at: 1, color: 'cyan-deep' }] },
    glow: { color: 'cyan', blur: 3 },
  }),
  rect(-1.2, -7.6, 2.4, 2.4, 0.4, solid('gold-trim')),
];

// The intake (019), small: its cyan pipe rising from a flared brass-lipped mouth.
const INTAKE_EMBLEM: Shape[] = [
  rect(-2.6, -7, 5.2, 9, 0.6, { fill: { linear: [-2.6, 0, 2.6, 0], stops: [{ at: 0, color: 'cyan-glow' }, { at: 0.4, color: 'cyan' }, { at: 1, color: 'cyan-deep' }] }, outline: true }),
  ...[-4.6, -1.6].map((y) => rect(-2.8, y, 5.6, 1, 0.3, flat('cyan-deep'))),
  path('M -7 6.4 Q -6.4 3.2 -2.6 2 L 2.6 2 Q 6.4 3.2 7 6.4 Z', { fill: 'cyan', outline: true }),
  rect(-6.8, 5.4, 13.6, 1.4, 0.6, solid('brass')),
];

/** Every item icon and emblem, keyed by the frame names the views already use. */
export const ITEM_SPRITES_VECTOR: readonly VectorSprite[] = [
  icon(SPRITES.itemWood, WOOD),
  icon(SPRITES.itemStone, STONE),
  icon(SPRITES.itemFiber, FIBER),
  icon(SPRITES.itemLeyCrystal, LEY_CRYSTAL),
  icon(SPRITES.itemHuskResin, HUSK_RESIN),
  icon(SPRITES.itemShaft, SHAFT),
  icon(SPRITES.itemArrowhead, ARROWHEAD),
  icon(SPRITES.itemRope, ROPE),
  icon(SPRITES.itemCasing, CASING),
  icon(SPRITES.itemFuse, FUSE),
  icon(SPRITES.itemLeyShard, LEY_SHARD),
  icon(SPRITES.itemWardenCore, WARDEN_CORE),
  icon(SPRITES.itemUnidentifiedArmor, UNIDENTIFIED_ARMOR),
  icon(SPRITES.iconArmorLight, ARMOR_LIGHT),
  icon(SPRITES.iconArmorHeavy, ARMOR_HEAVY),
  icon(SPRITES.iconArrow, ICON_ARROW),
  icon(SPRITES.iconBomb, ICON_BOMB),
  icon(SPRITES.iconLeyBolt, ICON_LEY_BOLT),
  ITEM_SHADOW,
  icon(LOGISTICS_ICONS.conduit ?? 'emblem-conduit', channel(false)),
  icon(LOGISTICS_ICONS.sorter ?? 'emblem-sorter', channel(true)),
  icon(LOGISTICS_ICONS.crate ?? 'emblem-crate', CRATE_EMBLEM),
  icon(LOGISTICS_ICONS.hopper ?? 'emblem-hopper', HOPPER_EMBLEM),
  icon(SPRITES.emblemIdentify, IDENTIFY_EMBLEM),
  icon(SITE_ICONS.stash, CHEST),
  icon(SITE_ICONS.travel, TRAVEL_EMBLEM),
  icon(INTAKE_EMPTY_ICON, INTAKE_EMBLEM),
  icon(INTAKE_CAP_ICON, INTAKE_CAP_EMBLEM),
];
