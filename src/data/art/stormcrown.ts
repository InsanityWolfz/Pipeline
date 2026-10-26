import { SLATE_STONE, STORMCROWN_SPRITES } from '../stormcrownAssets';
import { cliff, cliffTop } from './hollows';
import { shadow } from './terrain';
import { ellipse, line, rect, solid, type Shape, type VectorSprite } from './types';

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

/** Every Stormcrown sprite, for the vector catalog. */
export const STORMCROWN_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...STORMCROWN_SPRITES.ironRod.map((key, i) => one(key, [20, 92], [10, 88], ironRod(i))),
  ...STORMCROWN_SPRITES.cairn.map((key, i) => one(key, [34, 40], [17, 36], cairn(i))),
  one(STORMCROWN_SPRITES.cairnTop, [34, 40], [17, 36], CAIRN_TOP),
  ...STORMCROWN_SPRITES.cliffs.map((key, i) => one(key, [36, 44], [18, 40], cliff(i, SLATE_STONE))),
  one(STORMCROWN_SPRITES.cliffTop, [36, 44], [18, 40], cliffTop(SLATE_STONE)),
];
