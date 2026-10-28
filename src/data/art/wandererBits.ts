import { ellipse, line, svg, type Part, type Shape } from './types';
import { lit, TONES } from './wandererLook';
import type { WandererLook } from './wandererTypes';

// Small pieces of the arcane ranger (075) the three views share: the rune bandolier's strap and ley vials, the hip
// quiver of rune stakes, the face glow and the trim's shapes. Style px, hip-local.

type Pt = readonly [number, number];

export const part = (id: string, pivot: Pt, shapes: readonly Shape[]): Part => ({ id, pivot, shapes });

/** The faceless cyan glow in the hood: pulses, and flares on each shot (016, unchanged). */
export const faceGlow = (x: number, y: number, rx: number, ry: number): Shape =>
  ellipse(x, y, rx, ry, {
    fill: {
      radial: [x + 0.5, y - 0.5, Math.max(rx, ry)],
      stops: [
        { at: 0, color: 'cyan-glow' },
        { at: 0.45, color: 'cyan' },
        { at: 1, color: { id: 'cyan-deep', alpha: 0 } },
      ],
    },
    glow: { color: 'cyan', blur: 7 },
  });

/** A strap from `a` to `b`. */
export const strap = (a: Pt, b: Pt, width = 1.6, color = 'leather-dark'): Shape => line([a[0], a[1], b[0], b[1]], width, color, true);

/** The rune bandolier: a strap from `a` to `b` with four brass-capped ley vials along it, each with a cyan glint. */
export function bandolier(a: Pt, b: Pt): Shape[] {
  const vials = [0.2, 0.4, 0.6, 0.8].flatMap((t): Shape[] => {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    return [
      { kind: 'rect', x: x - 0.95, y: y - 1.6, w: 1.9, h: 3.1, r: 0.8, fill: 'cyan-deep', outline: true },
      { kind: 'rect', x: x - 1.05, y: y - 2.1, w: 2.1, h: 1.1, r: 0.4, fill: 'brass' },
      ellipse(x - 0.2, y - 0.2, 0.45, 0.8, { fill: 'cyan-glow' }),
    ];
  });
  return [strap(a, b, 1.9), ...vials];
}

/** The hip quiver: a leather case from its foot `a` up to its mouth `b`, three carved rune stakes out of the mouth. */
export function quiver(a: Pt, b: Pt): Shape[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [dx, dy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const [nx, ny] = [-dy, dx];
  const w = 2.1;
  const stakes = [-1, 0, 1].flatMap((k): Shape[] => {
    const x0 = b[0] + nx * k * 1.1;
    const y0 = b[1] + ny * k * 1.1;
    const out = 2.8 + (k === 0 ? 1 : 0);
    const tip: Pt = [x0 + dx * out, y0 + dy * out];
    return [line([x0 - dx, y0 - dy, tip[0], tip[1]], 1.25, 'wood-light', true), ellipse(tip[0], tip[1], 0.55, 0.55, { fill: 'cyan' })];
  });
  const body: Shape = {
    kind: 'path',
    d: [
      ['M', a[0] + nx * w, a[1] + ny * w],
      ['L', b[0] + nx * w, b[1] + ny * w],
      ['L', b[0] - nx * w, b[1] - ny * w],
      ['L', a[0] - nx * w, a[1] - ny * w],
      ['Z'],
    ],
    fill: lit(TONES.leather, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])),
    outline: true,
  };
  const band: Shape = line([b[0] + nx * w - dx * 1.4, b[1] + ny * w - dy * 1.4, b[0] - nx * w - dx * 1.4, b[1] - ny * w - dy * 1.4], 1, 'brass');
  return [...stakes, body, band];
}

/** A trim stroke along `d` (the hem, the hood's edge) in the look's trim colour and glow. */
export const trimStroke = (d: string, look: WandererLook, width: number): Shape => ({
  kind: 'path',
  d: svg(d),
  stroke: { color: look.trim.color, width },
  ...(look.trim.glow ? { glow: look.trim.glow } : {}),
});

/** The clasp gem at the throat, in the trim's colour and glow. */
export const clasp = (x: number, y: number, look: WandererLook): Shape =>
  ellipse(x, y, 1.6, 1.6, { fill: look.trim.color, outline: true, ...(look.trim.glow ? { glow: look.trim.glow } : {}) });
