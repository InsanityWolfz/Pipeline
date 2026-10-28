import { roundTier } from '../tags';
import { TIER_ARMED, TIER_PROJECTILES, TIER_SPRITES, type TierSprite } from '../tierAssets';
import type { TierId } from '../tiers';
import { casingShell } from './items';
import { MINE_SPRITES_VECTOR } from './mines';
import { VECTOR_SPRITES } from './sprites';
import { ellipse, flat, line, path, solid, trim, type Ink, type Paint, type Shape, type VectorSprite } from './types';

// 062's art, in the 020 style. A tiered round's icon and its look in flight are its stone round's, recoloured by a
// palette swap (TIER_ART): steel takes the iron palette's darker metal with a bright sheen along it, glass a clear
// pale cyan with a white glint. No round is drawn by hand. The tier parts have icons of their own: a bar of ley-steel,
// a pane of ley glass, and the steel arrowhead, casing and plate (the stone or iron part, in steel).

/** A palette swap: each listed palette id becomes another, and the shape's opacity scales by `alpha`; a mark goes on top. */
export interface TierArt {
  swap: Readonly<Record<string, string>>;
  alpha: number;
  /** Drawn over the recoloured icon (16x16 round the centre): steel's sheen, glass's glint. */
  mark: readonly Shape[];
}

export const TIER_ART: Readonly<Record<TierId, TierArt>> = {
  // Stone and pale iron to dark steel (the landmine's iron a shade darker still); its badge, a little steel ingot with
  // a bright sheen, in the icon's upper-left corner (tags' badges sit in the lower corners).
  steel: {
    swap: { 'rock-pale': 'iron-light', 'rock-light': 'iron-light', rock: 'iron', 'rock-dark': 'iron-dark', 'iron-light': 'iron', iron: 'iron-dark', 'iron-rust': 'iron-dark' },
    alpha: 1,
    mark: [
      path('M -7.6 -3.6 L -6 -6.6 L -1.6 -6.6 L -3.2 -3.6 Z', { fill: { linear: [-7, -7, -2, -3], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
      { ...line([-5.6, -6, -2.6, -6], 0.5, { id: 'snow', alpha: 0.9 }), glow: { color: 'rock-pale', blur: 1 } },
    ],
  },
  // The ley bolt's light, cleared to glass: paler, partly see-through; its badge a small clear diamond of glass.
  glass: {
    swap: { 'cyan-deep': 'cyan', cyan: 'cyan-glow', 'cyan-glow': 'foam' },
    alpha: 0.85,
    mark: [
      path('M -4.8 -7.6 L -2.6 -5 L -4.8 -2.4 L -7 -5 Z', { fill: { id: 'foam', alpha: 0.8 }, outline: true, glow: { color: 'cyan-glow', blur: 2 } }),
      line([-5.6, -5.6, -4.8, -6.6], 0.5, 'snow'),
    ],
  },
  // 066: stormsteel, dark storm metal (stone and iron to the storm slates); its badge a dark ingot split by a
  // violet-white vein of lightning.
  stormsteel: {
    swap: { 'rock-pale': 'storm-pale', 'rock-light': 'storm-light', rock: 'storm', 'rock-dark': 'storm-dark', 'iron-light': 'storm-light', iron: 'storm', 'iron-dark': 'storm-dark', 'iron-rust': 'storm-dark', vein: 'storm-pale' },
    alpha: 1,
    mark: [
      path('M -7.6 -3.6 L -6 -6.6 L -1.6 -6.6 L -3.2 -3.6 Z', { fill: { linear: [-7, -7, -2, -3], stops: [{ at: 0, color: 'storm' }, { at: 1, color: 'storm-dark' }] }, outline: true }),
      { ...path('M -6.4 -4.2 L -5 -5.4 L -4.2 -4.8 L -2.8 -6', trim('storm-pale', 0.6)), glow: { color: 'storm-glow', blur: 2 } },
    ],
  },
  // 066: storm glass, the ley bolt's light cleared further, a pale violet; its badge a clear diamond with a spark inside.
  'storm-glass': {
    swap: { 'cyan-deep': 'storm-glow', cyan: 'storm-pale', 'cyan-glow': 'foam' },
    alpha: 0.8,
    mark: [
      path('M -4.8 -7.6 L -2.6 -5 L -4.8 -2.4 L -7 -5 Z', { fill: { id: 'foam', alpha: 0.55 }, outline: true, glow: { color: 'storm-pale', blur: 2 } }),
      { ...path('M -4.8 -6.4 L -4.4 -5.4 L -3.6 -5 L -4.4 -4.6 L -4.8 -3.6 L -5.2 -4.6 L -6 -5 L -5.2 -5.4 Z', { fill: 'snow' }), glow: { color: 'storm-glow', blur: 2 } },
    ],
  },
};

const swapInk = (i: Ink, swap: Readonly<Record<string, string>>): Ink => (typeof i === 'string' ? (swap[i] ?? i) : { id: swap[i.id] ?? i.id, alpha: i.alpha });

function swapPaint(p: Paint, swap: Readonly<Record<string, string>>): Paint {
  if (typeof p === 'string' || 'id' in p) return swapInk(p, swap);
  const stops = p.stops.map((s) => ({ at: s.at, color: swapInk(s.color, swap) }));
  return 'linear' in p ? { linear: p.linear, stops } : { radial: p.radial, stops };
}

/** A shape in a tier's colours (TIER_ART): its fill, stroke, glow and line recoloured, its opacity scaled. */
export function inTier(shape: Shape, tier: TierId): Shape {
  const { swap, alpha } = TIER_ART[tier];
  const style = {
    ...(shape.fill ? { fill: swapPaint(shape.fill, swap) } : {}),
    ...(shape.stroke ? { stroke: { ...shape.stroke, color: swapInk(shape.stroke.color, swap) } } : {}),
    ...(shape.glow ? { glow: { ...shape.glow, color: swap[shape.glow.color] ?? shape.glow.color } } : {}),
    ...(alpha !== 1 ? { alpha: (shape.alpha ?? 1) * alpha } : {}),
  };
  return shape.kind === 'line' ? { ...shape, ...style, color: swapInk(shape.color, swap) } : { ...shape, ...style };
}

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

/** The steel's metal fill: dark steel, lit from the top left. */
const steelFill = (x0: number, y0: number, x1: number, y1: number): Paint => ({ linear: [x0, y0, x1, y1], stops: [{ at: 0, color: 'iron-light' }, { at: 0.45, color: 'iron' }, { at: 1, color: 'iron-dark' }] });

// Ley-steel: a cast bar of dark steel, its top face lit, a cyan ley vein through it and the sheen along its edge.
const LEY_STEEL: Shape[] = [
  path('M -6.6 1 L -3.6 -3.6 L 6.6 -3.6 L 3.6 1 Z', { fill: steelFill(-6, -4, 6, 1), outline: true }),
  path('M -6.6 1 L 3.6 1 L 3.6 5 L -6.6 5 Z', solid('iron-dark')),
  path('M 3.6 1 L 6.6 -3.6 L 6.6 0.4 L 3.6 5 Z', solid('iron')),
  { ...path('M -4.4 -0.4 L -1 -2.4 L 3 -1.6', trim('vein', 0.6)), glow: { color: 'vein', blur: 2 } },
  { ...line([-3.4, -3.2, 5.6, -3.2], 0.5, { id: 'snow', alpha: 0.8 }), glow: { color: 'rock-pale', blur: 1 } },
];

// Ley glass: a pane of clear cyan glass, leaning, with a white glint and a bright ley rim.
const LEY_GLASS: Shape[] = [
  path('M -5 6 L -6 -3 L 2 -7 L 6 3 Z', { fill: { linear: [-6, -7, 6, 6], stops: [{ at: 0, color: { id: 'foam', alpha: 0.85 } }, { at: 1, color: { id: 'cyan', alpha: 0.55 } }] }, outline: true, glow: { color: 'cyan', blur: 2 } }),
  path('M -5 6 L -6 -3 L 2 -7 L 6 3 Z', trim({ id: 'cyan-glow', alpha: 0.9 }, 0.6)),
  path('M -3.6 2.6 L -4.2 -2 L 0.4 -4.4', trim({ id: 'snow', alpha: 0.9 }, 0.8)),
  ellipse(2.6, -4.2, 1, 0.6, flat('snow')),
];

// The steel arrowhead: the knapped head's shape, forged in steel, the sheen along its edge.
const STEEL_ARROWHEAD: Shape[] = [
  path('M 6 -6 L -2.8 -1.2 L -0.6 0.6 L 1.2 2.8 Z', { fill: steelFill(6, -6, -1, 1), outline: true }),
  path('M 6 -6 L -0.6 0.6', trim('iron-dark', 0.5)),
  { ...line([5, -5.6, -1.6, -1.6], 0.5, { id: 'snow', alpha: 0.85 }), glow: { color: 'rock-pale', blur: 1 } },
];

// The steel casing (081): the casing's open shell in dark steel, with its sheen.
const STEEL_CASING: Shape[] = [
  ...casingShell(['iron-light', 'iron', 'iron-dark'], { id: 'snow', alpha: 0.85 }),
  ...[-4.6, -1.8, 1].map((x) => ellipse(x, 4.4, 0.45, 0.4, flat('brass-light'))),
];

// The steel plate: the riveted sheet in dark steel, the vein glinting, the sheen along its top edge.
const STEEL_PLATE: Shape[] = [
  path('M -6 -2 L 1 -6 L 7 -2.5 L 0 1.5 Z', { fill: steelFill(-6, -6, 7, 2), outline: true }),
  path('M -6 -2 L 0 1.5 L 0 4.6 L -6 1 Z', solid('iron-dark')),
  path('M 0 1.5 L 7 -2.5 L 7 0.6 L 0 4.6 Z', solid('iron')),
  ...[
    [-3.4, -2],
    [1, -4.6],
    [4.4, -2.5],
    [0, 0],
  ].map(([x, y]) => ellipse(x ?? 0, y ?? 0, 0.6, 0.4, flat('brass-light'))),
  { ...path('M -3 -1.4 L 0 -3 L 2.6 -2.2', trim('vein', 0.6)), glow: { color: 'vein', blur: 2 } },
  { ...line([-5, -2.4, 0.8, -5.6], 0.5, { id: 'snow', alpha: 0.85 }), glow: { color: 'rock-pale', blur: 1 } },
];

// 066: the storm tier's parts, each the steel (or glass) part tempered: stormsteel is the ley-steel bar in dark storm
// metal, its vein violet-white (TIER_ART.stormsteel's swap); the stormsteel parts the steel parts likewise. Storm glass
// is the pane of ley glass cleared further, with a spark of lightning caught inside it.
const tempered = (shapes: readonly Shape[]): Shape[] => shapes.map((sh) => inTier(sh, 'stormsteel'));

/** A four-point spark of lightning, white with a violet glow, round (x, y). */
const spark = (x: number, y: number, r: number): Shape => ({
  ...path(`M ${x} ${y - r} L ${x + r * 0.3} ${y - r * 0.3} L ${x + r} ${y} L ${x + r * 0.3} ${y + r * 0.3} L ${x} ${y + r} L ${x - r * 0.3} ${y + r * 0.3} L ${x - r} ${y} L ${x - r * 0.3} ${y - r * 0.3} Z`, flat('snow')),
  glow: { color: 'storm-glow', blur: 3 },
});

const STORMSTEEL: Shape[] = [
  ...tempered(LEY_STEEL),
  // A second fork of the vein, so the bar reads as struck through with lightning.
  { ...path('M -1 -2.4 L 0.6 -0.6 L 2.4 -0.8', trim('storm-pale', 0.5)), glow: { color: 'storm-glow', blur: 2 } },
];
const STORM_GLASS: Shape[] = [...LEY_GLASS.map((sh) => inTier(sh, 'storm-glass')), spark(0, 0, 2.6)];

/** The stone sprites a tier recolours, by key. */
const STONE_SPRITES = new Map([...VECTOR_SPRITES, ...MINE_SPRITES_VECTOR].map((s) => [s.key, s]));

/** A plain tiered round's sprite (its projectile, or a steel landmine lying armed): its stone sprite in its tier's colours. */
function recoloured(round: string, t: TierSprite): VectorSprite {
  const from = STONE_SPRITES.get(t.from);
  const tier = roundTier(round);
  if (!from || tier === 'stone') throw new Error(`No stone sprite '${t.from}' for '${round}'`);
  return { ...from, key: t.key, frames: from.frames.map((f) => f.map((sh) => inTier(sh, tier))) };
}

/** The tier parts' icons, and the tiered rounds' projectiles and the steel landmine lying armed. */
export const TIER_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...[...Object.entries(TIER_PROJECTILES), ...Object.entries(TIER_ARMED)].map(([round, t]) => recoloured(round, t)),
  icon(TIER_SPRITES.itemLeySteel, LEY_STEEL),
  icon(TIER_SPRITES.itemLeyGlass, LEY_GLASS),
  icon(TIER_SPRITES.itemSteelArrowhead, STEEL_ARROWHEAD),
  icon(TIER_SPRITES.itemSteelCasing, STEEL_CASING),
  icon(TIER_SPRITES.itemSteelPlate, STEEL_PLATE),
  icon(TIER_SPRITES.itemStormsteel, STORMSTEEL),
  icon(TIER_SPRITES.itemStormGlass, STORM_GLASS),
  icon(TIER_SPRITES.itemStormsteelArrowhead, tempered(STEEL_ARROWHEAD)),
  icon(TIER_SPRITES.itemStormsteelCasing, tempered(STEEL_CASING)),
  icon(TIER_SPRITES.itemStormsteelPlate, tempered(STEEL_PLATE)),
];
