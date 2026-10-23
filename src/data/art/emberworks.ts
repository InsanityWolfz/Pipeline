import { ASH_STONE, EMBERWORKS_SPRITES } from '../emberworksAssets';
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

/** Every Emberworks sprite, for the vector catalog. */
export const EMBERWORKS_SPRITES_VECTOR: readonly VectorSprite[] = [
  one(EMBERWORKS_SPRITES.kiln, [36, 48], [18, 44], KILN),
  one(EMBERWORKS_SPRITES.kilnTop, [36, 44], [18, 40], KILN_TOP),
  ...EMBERWORKS_SPRITES.chimney.map((key, i) => one(key, [30, 92], [15, 88], chimney(i))),
  ...EMBERWORKS_SPRITES.cliffs.map((key, i) => one(key, [36, 44], [18, 40], cliff(i, ASH_STONE))),
  one(EMBERWORKS_SPRITES.cliffTop, [36, 44], [18, 40], cliffTop(ASH_STONE)),
];
