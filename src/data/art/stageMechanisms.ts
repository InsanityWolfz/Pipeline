import type { Box, Mechanism } from './mechanisms';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// Stage mechanisms (029), in the 020 style: what each stage machine visibly does in
// its housing's window. Each takes the window box and its loop's phase `t` (0..1).
// A round lies on a brass bed along the bottom; the stage works on it from above.

const TAU = Math.PI * 2;
const centre = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];
/** 0 at t = 0 and 1, 1 at t = 0.5. */
const swell = (t: number): number => (1 - Math.cos(t * TAU)) / 2;

/** The brass bed a round lies on, along the window's bottom. */
const bed = (b: Box): Shape => line([b.x + 2, b.y + b.h - 2.5, b.x + b.w - 2, b.y + b.h - 2.5], 1, 'brass-dark');

/** A small arrow lying on the bed, its head tinted. */
function arrowOnBed(b: Box, head: string): Shape[] {
  const y = b.y + b.h - 4.5;
  const [cx] = centre(b);
  return [
    line([cx - 6, y, cx + 3, y], 1.1, 'wood-light', true),
    path(`M ${cx - 6} ${y} L ${cx - 7.8} ${y - 1.6} L ${cx - 4.8} ${y} L ${cx - 7.8} ${y + 1.6} Z`, flat('rust-light')),
    path(`M ${cx + 6} ${y} L ${cx + 2.6} ${y - 1.9} L ${cx + 2.6} ${y + 1.9} Z`, solid(head)),
  ];
}

/** A small ley bolt lying on the bed, turned by `turn` radians. */
function boltOnBed(b: Box, turn: number, glow: number): Shape[] {
  const [cx] = centre(b);
  const y = b.y + b.h - 5;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const p = (x: number, yy: number): string => `${(cx + x * c - yy * s).toFixed(2)} ${(y + x * s + yy * c).toFixed(2)}`;
  return [
    line([cx - 6 * c, y - 6 * s, cx, y], 1.6, { id: 'cyan', alpha: 0.4 + 0.3 * glow }),
    path(`M ${p(4, 0)} L ${p(0, -2)} L ${p(-1.6, 0)} L ${p(0, 2)} Z`, { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 2 + 3 * glow } }),
  ];
}

/** Frost rune: a carved rune stone breathes rime down onto an arrow, its head frosting pale. */
const frostRune: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const glow = swell(t);
  const stoneY = b.y + 1.5;
  const mist = [0, 1, 2].map((i) => {
    const k = (t + i / 3) % 1;
    return ellipse(cx - 3 + i * 3, stoneY + 6 + k * 6, 0.9 + k * 0.6, 0.9 + k * 0.6, { fill: 'snow', alpha: 0.85 * (1 - k) });
  });
  return [
    bed(b),
    ...arrowOnBed(b, glow > 0.5 ? 'foam' : 'rock-pale'),
    path(`M ${cx - 5} ${stoneY + 5} L ${cx - 4} ${stoneY} L ${cx + 4} ${stoneY} L ${cx + 5} ${stoneY + 5} Z`, { fill: { linear: [0, stoneY, 0, stoneY + 5], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] }, outline: true }),
    path(`M ${cx - 1.6} ${stoneY + 1} L ${cx + 0.6} ${stoneY + 2.4} L ${cx - 0.6} ${stoneY + 3} L ${cx + 1.6} ${stoneY + 4.2}`, {
      stroke: { color: 'water-light', width: 0.8 },
      glow: { color: 'water-light', blur: 1 + 3 * glow },
    }),
    ...mist,
  ];
};

/** Ley guide: a brass ring with a crystal on it turns, and the bolt beneath swings to follow it. */
const leyGuide: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const ry = b.y + 6;
  const a = t * TAU;
  const gx = cx + Math.cos(a) * 4.6;
  const gy = ry + Math.sin(a) * 2;
  const glow = swell(t);
  return [
    bed(b),
    ...boltOnBed(b, Math.sin(a) * 0.35, glow),
    ellipse(cx, ry, 5, 2.4, trim('brass', 1.2)),
    line([cx, b.y, cx, ry - 2.4], 0.8, 'brass-dark'),
    path(`M ${gx} ${gy - 2.2} L ${gx + 1.3} ${gy} L ${gx} ${gy + 1.4} L ${gx - 1.3} ${gy} Z`, { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 2 + 2 * glow } }),
    line([gx, gy + 1.4, cx, b.y + b.h - 5], 0.5, { id: 'cyan-glow', alpha: 0.25 + 0.45 * glow }),
  ];
};

/** Shatter lens: a faceted lens throws five rays of ley light down onto a bolt, turning as it cuts. */
const shatterLens: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const ly = b.y + 4.5;
  const glow = swell(t);
  const by = b.y + b.h - 5;
  const rays = Array.from({ length: 5 }, (_, i) => {
    const a = t * (TAU / 5) + (i * TAU) / 5;
    return line([cx, by, cx + Math.cos(a) * 5.5, by + Math.sin(a) * 3.2], 0.6, { id: 'cyan-glow', alpha: 0.3 + 0.6 * glow });
  });
  return [
    bed(b),
    ...rays,
    ...boltOnBed(b, 0, glow),
    path(`M ${cx - 4.6} ${ly} L ${cx - 2.4} ${ly - 3} L ${cx + 2.4} ${ly - 3} L ${cx + 4.6} ${ly} L ${cx} ${ly + 2.6} Z`, {
      fill: { linear: [cx - 4, ly - 3, cx + 4, ly + 2], stops: [{ at: 0, color: 'snow' }, { at: 0.5, color: 'cyan-glow' }, { at: 1, color: 'cyan' }] },
      outline: true,
      glow: { color: 'cyan-glow', blur: 1 + 3 * glow },
    }),
    path(`M ${cx - 2.4} ${ly - 3} L ${cx} ${ly + 2.6} L ${cx + 2.4} ${ly - 3}`, trim('cyan-deep', 0.4)),
    rect(cx - 5.4, ly - 0.6, 10.8, 1.2, 0.4, solid('brass')),
  ];
};

/** Each stage machine's mechanism, by stage id. */
export const STAGE_MECHANISMS: Readonly<Record<string, Mechanism>> = {
  'frost-rune': frostRune,
  'ley-guide': leyGuide,
  'shatter-lens': shatterLens,
};
