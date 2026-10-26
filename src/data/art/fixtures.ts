import { DOORWAY_SPRITE, FIXTURE_SPRITES, PYLON_SPRITES, RETURN_STONE_LOOK, TUTORIAL_SPRITES } from '../foundryAssets';
import { SPRITES } from '../assets';
import { ellipse, flat, line, path, rect, solid, trim, type Paint, type Shape, type VectorSprite } from './types';

// Fixtures and the pylon (020), in the 016 vector style: the identification
// bench, the stash, the supply port, the foundry's exit arch, the waystone, the
// pylon in its three states, (072) the dormant return stone, the ley shimmer that seals the door (067) and the room's
// ley crystal. Standing sprites are drawn round their bottom centre; the door arch
// and shimmer from their bottom-left, like the wall tiles they sit in.

const stand = (key: string, size: readonly [number, number], frames: readonly (readonly Shape[])[]): VectorSprite => ({ key, size, anchor: [size[0] / 2, size[1]], frames });
const shadow = (rx: number): Shape => ellipse(0, -2, rx, 3.2, { fill: { id: 'ground-shade', alpha: 0.4 } });
const vertical = (top: string, bottom: string, y0: number, y1: number): Paint => ({ linear: [0, y0, 0, y1], stops: [{ at: 0, color: top }, { at: 1, color: bottom }] });
const glowLine = (pts: number[], width: number, color: string, blur: number): Shape => ({ ...line(pts, width, color), glow: { color, blur } });
const rune = (x: number, y: number, s: number, color: string): Shape => path(`M ${x - s} ${y - s * 1.2} L ${x + s * 0.4} ${y - s * 0.2} L ${x - s * 0.6} ${y + s * 0.3} L ${x + s} ${y + s * 1.2}`, trim(color, 0.8));

// The identification bench (052, Shaun: "a workbench with a big magnifying glass on one side and an armor rack on
// the other ... so it's obvious"): a wooden workbench with a rune-carved front; on its left a big brass-rimmed ley lens
// on an arm, nearly a tile across, over an unidentified piece; on its right a rack holding a breastplate, kept inside
// its tile so it stays clear of the wall beside it. Frame 1 flares the lens as gear is identified. Wider than its tile
// on the left only.
const LENS = { x: -9, y: -35, r: 10.5 } as const;
/** The rack's middle, x: its posts stand at RACK - 5 and RACK + 5, the right one well inside the tile's half-width (16). */
const RACK = 8.5;
const bench = (flare: boolean): Shape[] => [
  ellipse(-1, -2, 19, 3.4, { fill: { id: 'ground-shade', alpha: 0.4 } }),
  // The armor rack, behind the bench's right end: two posts, a crossbar, a breastplate with brass trim.
  ...[RACK - 5, RACK + 5].map((x) => rect(x - 1.1, -38, 2.2, 36, 0.8, solid('wood-dark'))),
  rect(RACK - 6.5, -38.5, 13, 2.4, 0.8, solid('wood')),
  path(`M ${RACK - 5.1} -35.4 L ${RACK - 2.3} -35.4 Q ${RACK} -32.4 ${RACK + 2.3} -35.4 L ${RACK + 5.1} -35.4 L ${RACK + 5.1} -30 Q ${RACK + 4.9} -21.5 ${RACK} -19.5 Q ${RACK - 4.9} -21.5 ${RACK - 5.1} -30 Z`, {
    fill: vertical('iron-light', 'iron-dark', -36, -19.5),
    outline: true,
  }),
  path(`M ${RACK - 2.3} -35 Q ${RACK} -31.8 ${RACK + 2.3} -35`, trim('brass', 0.9)),
  ...[RACK - 4.9, RACK + 4.9].map((x) => ellipse(x, -34.6, 2.4, 1.7, solid('iron'))),
  line([RACK - 4.1, -26.5, RACK + 4.1, -26.5], 0.8, 'brass'),
  line([RACK, -33.4, RACK, -22], 0.7, { id: 'iron-dark', alpha: 0.8 }),
  path(`M ${RACK - 2.7} -30 Q ${RACK - 1.5} -29.2 ${RACK - 0.9} -27`, trim({ id: 'snow', alpha: 0.5 }, 0.6)),
  // The workbench: legs, a thick plank top, and a front board with a ley rune.
  ...[-15, 4].map((x) => rect(x - 1.6, -14, 3.2, 12, 0.8, solid('wood-dark'))),
  rect(-17, -12, 22, 2, 0.6, solid('wood')),
  rect(-18, -20, 24, 6.5, 1.6, { fill: vertical('wood-light', 'wood', -20, -13.5), outline: true }),
  rect(-18, -20, 24, 1.6, 0.8, { fill: { id: 'straw-light', alpha: 0.6 } }),
  rune(-6, -16.6, 1.4, 'cyan-deep'),
  // The unidentified piece on the bench, under the glass: a leather scrap with a stitched seam.
  rect(-13, -23, 8, 3.2, 0.9, { fill: 'leather', outline: true }),
  line([-12, -21.4, -6, -21.4], 0.5, { id: 'straw-light', alpha: 0.8 }),
  // The magnifying glass: a brass arm up from the bench's left end holds it; a wooden handle with a brass ferrule
  // juts down to the right; a thick brass rim round a pale ley glass that shows the piece below enlarged.
  line([-16.5, -20, -16.5, -27, -14.5, -29], 1.8, 'brass-dark', true),
  line([LENS.x + 7.4, LENS.y + 7.4, LENS.x + 11.8, LENS.y + 11.8], 3.6, 'wood-dark', true),
  line([LENS.x + 7.2, LENS.y + 7.2, LENS.x + 8.8, LENS.y + 8.8], 4, 'brass', true),
  ellipse(LENS.x, LENS.y, LENS.r, LENS.r, {
    fill: { radial: [LENS.x - 3.4, LENS.y - 3.4, LENS.r + 3], stops: [{ at: 0, color: { id: 'cyan-glow', alpha: 0.95 } }, { at: 1, color: { id: 'cyan', alpha: 0.5 } }] },
    glow: { color: 'cyan', blur: flare ? 10 : 3 },
  }),
  // The piece seen through the glass, twice its size.
  rect(LENS.x - 6.5, LENS.y + 0.4, 13, 5.2, 1.6, { fill: { id: 'leather', alpha: 0.8 } }),
  line([LENS.x - 5, LENS.y + 3, LENS.x + 5, LENS.y + 3], 0.8, { id: 'straw-light', alpha: 0.7 }),
  ellipse(LENS.x, LENS.y, LENS.r, LENS.r, { stroke: { color: 'brass', width: 2.6 }, outline: true }),
  ellipse(LENS.x, LENS.y, LENS.r - 1.3, LENS.r - 1.3, { stroke: { color: { id: 'brass-light', alpha: 0.7 }, width: 0.6 } }),
  ...(flare ? [ellipse(LENS.x, LENS.y, LENS.r + 2.4, LENS.r + 2.4, { stroke: { color: { id: 'cyan-glow', alpha: 0.7 }, width: 1.2 }, glow: { color: 'cyan-glow', blur: 6 } })] : []),
  path(`M ${LENS.x - 6.8} ${LENS.y - 1.4} Q ${LENS.x - 6} ${LENS.y - 6.4} ${LENS.x - 0.9} ${LENS.y - 7.2}`, trim({ id: 'snow', alpha: 0.85 }, 1.2)),
];

// The stash: a rune-banded wooden chest with brass bands and a ley lock.
const STASH: Shape[] = [
  shadow(15),
  rect(-14, -20, 28, 18, 2, { fill: vertical('wood', 'wood-dark', -20, -2), outline: true }),
  path('M -14 -19 Q -14 -31 0 -31 Q 14 -31 14 -19 Z', { fill: vertical('wood-light', 'wood', -31, -19), outline: true }),
  ...[-12, -2, 8].map((x) => line([x, -6, x + 3, -6], 0.6, 'wood-dark')),
  ...[-8, 8].map((x) => rect(x - 1.8, -30.5, 3.6, 28.5, 0.6, solid('brass'))),
  rect(-14.5, -20.5, 29, 2.4, 0.6, solid('brass-dark')),
  rect(-3, -18, 6, 6, 1.2, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 3 } }),
  ellipse(0, -15, 1, 1, flat('ink')),
];

// A supply port (028): a stone housing set against the west wall, a round brass-rimmed face where its raw's icon
// sits (render puts the icon on it), a ley seam feeding it from the wall, and a spout facing into the room. Frame 1
// glows, seam and mouth, while a raw waits to go out. One body serves every port.
const port = (lit: boolean): Shape[] => [
  shadow(14),
  rect(-15, -34, 24, 32, 2, { fill: vertical('rock-light', 'rock', -34, -2), outline: true }),
  rect(-15, -34, 24, 5, 2, solid('rock-pale')),
  rune(-11.5, -7.5, 1.1, 'rock-dark'),
  glowLine([-15, -29, -12.5, -29, -12.5, -24], lit ? 2.2 : 1.4, lit ? 'cyan-glow' : 'cyan', lit ? 5 : 2),
  ellipse(-3, -18, 9, 9, { fill: vertical('brass', 'brass-dark', -27, -9), outline: true }),
  ellipse(-3, -18, 7, 7, { fill: { radial: [-4, -19.5, 8], stops: [{ at: 0, color: 'rock-dark' }, { at: 1, color: 'ink' }] }, ...(lit ? { glow: { color: 'cyan', blur: 3 } } : {}) }),
  path('M -9 -21 Q -8 -25 -4 -25.6', trim({ id: 'snow', alpha: 0.5 }, 0.7)),
  path('M 9 -24 L 15 -21 L 15 -8 L 9 -5 Z', { fill: vertical('rock', 'rock-dark', -24, -5), outline: true }),
  ellipse(14, -14.5, 2.4, 5, { fill: lit ? 'cyan' : 'ink', outline: true, ...(lit ? { glow: { color: 'cyan', blur: 6 } } : {}) }),
  rect(8, -25, 2.4, 21, 0.6, solid('brass')),
];

// The foundry's exit, in its right-hand wall (flipped for the left): a carved arch over stone steps rising into the dark.
const DOORWAY: Shape[] = [
  rect(0, -48, 32, 48, 0, { fill: vertical('rock-light', 'rock', -48, 0) }),
  path('M 5 0 L 5 -30 Q 5 -42 16 -42 Q 27 -42 27 -30 L 27 0 Z', flat('ink')),
  ...[0, 1, 2, 3].map((i) => rect(7 + i * 1.5, -6 - i * 6, 18 - i * 3, 5, 0.6, { fill: vertical('rock', 'rock-dark', -6 - i * 6, -1 - i * 6), alpha: 1 - i * 0.2 })),
  path('M 5 0 L 5 -30 Q 5 -42 16 -42 Q 27 -42 27 -30 L 27 0', trim('rock-pale', 1.6)),
  rect(14, -46, 4, 5, 1, solid('rock-pale')),
  glowLine([16, -44.5, 16, -42.5], 1, 'cyan', 3),
];

// The waystone: a standing ring of stone on a plinth, its middle shimmering with ley light.
const waystone = (k: number): Shape[] => [
  shadow(13),
  rect(-12, -8, 24, 7, 2, { fill: vertical('rock-light', 'rock', -8, -1), outline: true }),
  ellipse(0, -26, 11, 16, { fill: { radial: [0, -26, 14], stops: [{ at: 0, color: k === 0 ? 'cyan-glow' : 'snow' }, { at: 0.6, color: 'cyan' }, { at: 1, color: 'cyan-deep' }] }, glow: { color: 'cyan', blur: 4 + k * 3 }, alpha: 0.8 + k * 0.15 }),
  ellipse(0, -26, 11, 16, trim('rock', 5.4)),
  ellipse(0, -26, 11, 16, { stroke: { color: 'rock-light', width: 3.6 } }),
  ...[-60, 0, 60, 180].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return rune(Math.cos(a) * 11, -26 + Math.sin(a) * 16, 1.1, 'cyan-deep');
  }),
];

// 072: a boss arena's return stone while dormant: the waystone's ring and plinth round a disc of dark, unlit stone,
// its runes dull. Woken, it is the waystone itself (its shimmer).
const DORMANT_STONE: Shape[] = [
  shadow(13),
  rect(-12, -8, 24, 7, 2, { fill: vertical('rock-light', 'rock', -8, -1), outline: true }),
  ellipse(0, -26, 11, 16, { fill: { radial: [0, -26, 14], stops: [{ at: 0, color: 'dormant' }, { at: 1, color: 'dormant-dark' }] } }),
  ellipse(0, -26, 11, 16, trim('rock', 5.4)),
  ellipse(0, -26, 11, 16, { stroke: { color: 'rock-light', width: 3.6 } }),
  ...[-60, 0, 60, 180].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return rune(Math.cos(a) * 11, -26 + Math.sin(a) * 16, 1.1, 'rock-dark');
  }),
];

// The pylon: a tapered rune obelisk with a carved channel up its face and a crystal on top. Off, the channel is dark and the
// crystal dull; activating, light climbs the channel; active, channel and crystal glow and pulse.
const PYLON_BODY: Shape[] = [
  shadow(14),
  rect(-13, -8, 26, 7, 2, { fill: vertical('rock-light', 'rock', -8, -1), outline: true }),
  path('M -9 -8 L -6 -58 L 6 -58 L 9 -8 Z', { fill: { linear: [-9, 0, 9, 0], stops: [{ at: 0, color: 'rock-pale' }, { at: 0.5, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  path('M -6 -58 L 0 -62 L 6 -58 Z', solid('rock-pale')),
  line([0, -12, 0, -54], 2.6, 'ink'),
  rune(-4.4, -20, 1.4, 'rock-dark'),
  rune(4.4, -36, 1.4, 'rock-dark'),
];
/** The pylon with its channel lit `lit` of the way up (0..1) and its crystal glowing `glow` (0 dull .. 1 bright). */
const pylon = (lit: number, glow: number): Shape[] => [
  ...PYLON_BODY,
  ...(lit > 0 ? [glowLine([0, -12, 0, -12 - 42 * lit], 1.8, 'cyan', 3 + glow * 3)] : []),
  path('M 0 -76 L 4.4 -68 L 0 -61 L -4.4 -68 Z', {
    fill: glow > 0 ? { linear: [0, -61, 0, -76], stops: [{ at: 0, color: 'cyan-deep' }, { at: 1, color: 'cyan-glow' }] } : vertical('dormant', 'dormant-dark', -76, -61),
    outline: true,
    ...(glow > 0 ? { glow: { color: 'cyan-glow', blur: 3 + glow * 5 } } : {}),
  }),
];

// 067: the ley shimmer that seals the foundry's door until the shrine's pylon is claimed: a translucent cyan curtain
// filling the doorway's arch, its light strands running up it and a rune at its heart. Render pulses it.
const ARCH = 'M 4 0 L 4 -30 Q 4 -43 16 -43 Q 28 -43 28 -30 L 28 0 Z';
const SHIMMER: Shape[] = [
  path(ARCH, { fill: { linear: [0, 0, 0, -43], stops: [{ at: 0, color: 'cyan' }, { at: 0.7, color: 'cyan-deep' }, { at: 1, color: 'cyan-glow' }] }, alpha: 0.5, glow: { color: 'cyan', blur: 6 } }),
  ...[8, 12.5, 16, 19.5, 24].map((x, i) => glowLine([x, -1, x, i === 2 ? -41 : -34 + Math.abs(i - 2) * 1.5], 0.7, 'cyan-glow', 3)),
  path('M 4 0 L 4 -30 Q 4 -43 16 -43 Q 28 -43 28 -30 L 28 0', trim('cyan-glow', 1.2)),
  rune(16, -22, 2.2, 'cyan-glow'),
];

// The ley crystal growing in the foundry: a cluster of cyan shards on a chip of stone.
const shard = (x: number, h: number, w: number, lean: number): Shape =>
  path(`M ${x - w} -3 L ${x - w + lean * 0.4} ${-3 - h * 0.72} L ${x + lean} ${-3 - h} L ${x + w + lean * 0.4} ${-3 - h * 0.72} L ${x + w} -3 Z`, {
    fill: { linear: [x, -3, x + lean, -3 - h], stops: [{ at: 0, color: 'cyan-deep' }, { at: 0.55, color: 'cyan' }, { at: 1, color: 'cyan-glow' }] },
    outline: true,
    glow: { color: 'cyan-glow', blur: 3 },
  });
const LEY_CRYSTAL: Shape[] = [
  ellipse(0, -2, 7, 2.2, { fill: { id: 'ground-shade', alpha: 0.4 } }),
  ellipse(0, -3, 6, 2, solid('rock-dark')),
  shard(-3.2, 9, 1.8, -1.6),
  shard(3.4, 8, 1.7, 1.6),
  shard(0, 15, 2.4, 0.4),
];

export const FIXTURE_SPRITES_VECTOR: readonly VectorSprite[] = [
  stand(FIXTURE_SPRITES.bench.key, [42, 50], [bench(false), bench(true)]),
  stand(FIXTURE_SPRITES.stash, [32, 36], [STASH]),
  stand(FIXTURE_SPRITES.port.key, [32, 36], [port(false), port(true)]),
  { key: DOORWAY_SPRITE, size: [32, 48], anchor: [0, 48], frames: [DOORWAY] },
  stand(FIXTURE_SPRITES.waystone.key, [32, 48], [waystone(0), waystone(1)]),
  stand(RETURN_STONE_LOOK.dormant, [32, 48], [DORMANT_STONE]),
  stand(PYLON_SPRITES.off, [32, 80], [pylon(0, 0)]),
  stand(PYLON_SPRITES.activating.key, [32, 80], [0.25, 0.5, 0.75, 1].map((k) => pylon(k, k * 0.6))),
  stand(PYLON_SPRITES.active.key, [32, 80], [pylon(1, 0.8), pylon(1, 1)]),
  { key: TUTORIAL_SPRITES.shimmer, size: [32, 48], anchor: [0, 48], frames: [SHIMMER] },
  stand(SPRITES.leyCrystal, [16, 20], [LEY_CRYSTAL]),
];
