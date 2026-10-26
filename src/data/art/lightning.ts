import type { Box, Mechanism } from './mechanisms';
import { ellipse, line, path, rect, solid, type Shape, type ShapeStyle } from './types';

// 064's Lightning art, in the 020 style: the lightning tag's badge on a round's icon (a zigzag bolt on a slate-violet
// disc), the crackling head a Lightning arrow wears, and the Lightning rune's mechanism (a brass-capped rod over the
// bed, a bolt leaping from it down onto the arrow as the loop runs). The arc between enemies is drawn live by render
// from LIGHTNING_LOOK (src/data/stormcrownAssets.ts).

const TAU = Math.PI * 2;

/** The lightning badge: a zigzag bolt on a slate-violet disc, centred at (x, 4.2). */
export function boltBadge(x: number): Shape[] {
  return [
    ellipse(x, 4.2, 3.4, 3.4, { fill: 'storm', outline: true }),
    path(`M ${x + 0.6} 1.2 L ${x - 1.5} 4.6 L ${x + 0.1} 4.6 L ${x - 0.8} 7.2 L ${x + 1.7} 3.6 L ${x + 0.1} 3.6 Z`, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 1.5 } }),
  ];
}

/** A Lightning arrow's head on its icon: pale and crackling cyan. */
export const LIGHTNING_HEAD: ShapeStyle = { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 2 } };

/** The Lightning rune (064): a brass-capped iron rod over the bed; a bolt leaps from its tip onto the arrow, flickering. */
export const lightningRune: Mechanism = (b: Box, t: number) => {
  const cx = b.x + b.w / 2;
  const top = b.y + 1.5;
  const ay = b.y + b.h - 5;
  const flick = (Math.sin(t * TAU * 3) + 1) / 2;
  const on = t % 0.5 < 0.32;
  const bolt = [cx + 0.5, top + 4, cx - 1.5, top + 6.5, cx + 1.2, top + 8, cx - 0.8, ay - 1];
  return [
    line([b.x + 2, b.y + b.h - 2.5, b.x + b.w - 2, b.y + b.h - 2.5], 1, 'brass-dark'),
    line([b.x + 3, ay, b.x + b.w - 4, ay], 1.2, 'wood-light'),
    path(`M ${b.x + b.w - 4} ${ay - 1.4} L ${b.x + b.w - 2} ${ay} L ${b.x + b.w - 4} ${ay + 1.4} Z`, { fill: on ? 'cyan-glow' : 'iron-light', outline: true }),
    rect(cx - 1, top, 2, 4, 0.4, { fill: 'iron', outline: true }),
    rect(cx - 1.8, top - 1, 3.6, 1.4, 0.4, solid('brass')),
    ...(on ? [{ ...line(bolt, 0.8, 'snow'), glow: { color: 'cyan', blur: 1 + 2 * flick } }] : []),
    ellipse(cx, top - 0.4, 1, 1, { fill: 'cyan-glow', alpha: 0.4 + 0.6 * flick, glow: { color: 'cyan', blur: 2 } }),
  ];
};

/** 064's Lightning talent icons (16×16 round the centre): a bolt forking into three tines, each tipped with a spark. */
export const LIGHTNING_CHAINS_ICON: Shape[] = [
  ellipse(0, 0, 6.6, 6.6, { fill: 'storm', outline: true }),
  { ...line([-1, -5.5, 1.2, -1.5, -0.8, 0.5, 0.6, 2.5], 1.2, 'cyan-glow'), glow: { color: 'cyan', blur: 2 } },
  { ...line([0.6, 2.5, -3.6, 4.6], 0.9, 'cyan-glow'), glow: { color: 'cyan', blur: 1.5 } },
  { ...line([0.6, 2.5, 0.6, 5.6], 0.9, 'cyan-glow'), glow: { color: 'cyan', blur: 1.5 } },
  { ...line([0.6, 2.5, 4.4, 4.4], 0.9, 'cyan-glow'), glow: { color: 'cyan', blur: 1.5 } },
  ...[[-3.6, 4.6], [0.6, 5.6], [4.4, 4.4]].map(([x = 0, y = 0]) => ellipse(x, y, 0.9, 0.9, { fill: 'snow' })),
];

/** A long bolt leaping between two brass-capped rods. */
export const LIGHTNING_RANGE_ICON: Shape[] = [
  ...[-5.2, 5.2].flatMap((x) => [rect(x - 0.8, -2, 1.6, 8, 0.4, { fill: 'iron', outline: true }), rect(x - 1.3, -3, 2.6, 1.2, 0.3, solid('brass'))]),
  { ...line([-5.2, -3.5, -2.5, -0.5, -0.5, -4, 1.5, -0.8, 3.5, -4.2, 5.2, -3.5], 1, 'cyan-glow'), glow: { color: 'cyan', blur: 2 } },
  line([-5.2, -3.5, -2.5, -0.5, -0.5, -4, 1.5, -0.8, 3.5, -4.2, 5.2, -3.5], 0.4, 'snow'),
];
