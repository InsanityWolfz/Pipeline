import type { Box, Mechanism } from './mechanisms';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// 038's mechanisms, in the 020 style: the plate press stamps a lump of ley-iron flat into a
// plate, the mine packer seats a fuse and ley dust into an iron disc and closes it, and the
// Cluster die (the cluster stage) stamps a ring of bomblet seams into a bomb's casing.
// Each takes the window box and its loop's phase `t` (0..1).

const TAU = Math.PI * 2;
const centre = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];
/** 0 at t = 0 and 1, 1 at t = 0.5: a stroke down and back. */
const stroke = (t: number): number => (1 - Math.cos(t * TAU)) / 2;

/** Plate press: a heavy brass ram comes down on a glowing lump of ley-iron and leaves a flat plate. */
const platePress: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const floor = b.y + b.h - 2.5;
  const down = stroke(t);
  const ramY = b.y + 1 + down * (b.h - 9);
  // The lump flattens as the ram lands: tall and narrow at t = 0, a plate at the bottom of the stroke.
  const h = 4.5 - 3 * down;
  const w = 4 + 3.5 * down;
  return [
    line([b.x + 2, floor + 0.5, b.x + b.w - 2, floor + 0.5], 1, 'brass-dark'),
    path(`M ${cx - w} ${floor} L ${cx - w * 0.8} ${floor - h} L ${cx + w * 0.8} ${floor - h} L ${cx + w} ${floor} Z`, { fill: { linear: [cx, floor - h, cx, floor], stops: [{ at: 0, color: 'iron-light' }, { at: 1, color: 'iron-dark' }] }, outline: true }),
    { ...line([cx - w * 0.5, floor - h * 0.5, cx + w * 0.4, floor - h * 0.6], 0.6, 'vein'), glow: { color: 'vein', blur: 1 + 2 * down } },
    line([cx, b.y, cx, ramY], 1.6, 'brass-dark'),
    rect(cx - 6, ramY, 12, 3.2, 0.8, solid('brass')),
    line([cx - 5, ramY + 3.2, cx + 5, ramY + 3.2], 0.6, 'brass-dark'),
  ];
};

/** A small landmine disc, `rx` wide, its lid `open` (0 shut, 1 lifted). */
function disc(cx: number, cy: number, rx: number, open: number): Shape[] {
  return [
    ellipse(cx, cy + 1, rx, rx * 0.5, solid('iron-dark')),
    ellipse(cx, cy, rx, rx * 0.5, solid('iron')),
    ellipse(cx, cy, rx * 0.7, rx * 0.35, trim('brass', 0.8)),
    ellipse(cx, cy - open * 3, rx * 0.8, rx * 0.4, { fill: 'iron-light', outline: true, alpha: 0.6 + 0.4 * (1 - open) }),
    ellipse(cx, cy - open * 3, 1.1, 0.8, { fill: open > 0.5 ? 'cyan-deep' : 'cyan-glow', glow: { color: 'cyan', blur: 2 } }),
  ];
}

/** Mine packer: arms bring a fuse and ley dust in from the sides into an open iron disc, and its lid closes. */
const minePacker: Mechanism = (b, t) => {
  const [cx, cy] = centre(b);
  const wide = b.w >= b.h;
  const reach = (wide ? b.w : b.h) / 2 - 4;
  const close = stroke(t);
  const gap = reach * (0.8 - 0.6 * close);
  const at = (d: number): [number, number] => (wide ? [cx + d, cy + 2] : [cx, cy + d]);
  const [fx, fy] = at(-gap);
  const [sx, sy] = at(gap);
  return [
    wide ? line([b.x + 2, cy + 6, b.x + b.w - 2, cy + 6], 1, 'brass-dark') : line([cx + 7, b.y + 2, cx + 7, b.y + b.h - 2], 1, 'brass-dark'),
    ...disc(cx, cy + 2, 6, 1 - close),
    ellipse(fx, fy, 2, 1.3, solid('resin')),
    path(`M ${sx} ${sy - 2.2} L ${sx + 1.8} ${sy} L ${sx} ${sy + 2.2} L ${sx - 1.8} ${sy} Z`, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 2 } }),
    ...(wide
      ? [line([fx - 3, fy, b.x + 1, fy], 1.3, 'brass', true), line([sx + 3, sy, b.x + b.w - 1, sy], 1.3, 'brass', true)]
      : [line([fx, fy - 3, fx, b.y + 1], 1.3, 'brass', true), line([sx, sy + 3, sx, b.y + b.h - 1], 1.3, 'brass', true)]),
  ];
};

/** Cluster die: a brass die turns and stamps a ring of four bomblet seams into a bomb's casing, which glow as they're cut. */
const clusterDie: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const by = b.y + b.h - 6;
  const down = stroke(t);
  const dieY = b.y + 1 + down * 3;
  const glow = down;
  const seams = [0, 1, 2, 3].map((k) => {
    const a = t * (TAU / 4) + (k * TAU) / 4;
    return ellipse(cx + Math.cos(a) * 3, by + Math.sin(a) * 1.8, 0.9, 0.7, { fill: glow > 0.4 ? 'cinder-light' : 'cinder', glow: { color: 'cinder', blur: 1 + 3 * glow } });
  });
  return [
    line([b.x + 2, b.y + b.h - 2.5, b.x + b.w - 2, b.y + b.h - 2.5], 1, 'brass-dark'),
    ellipse(cx, by, 4.6, 4, { fill: { radial: [cx - 1.4, by - 1.4, 5], stops: [{ at: 0, color: 'rock-dark' }, { at: 1, color: 'ink' }] }, outline: true }),
    ...seams,
    line([cx, b.y, cx, dieY], 1, 'brass-dark'),
    path(`M ${cx - 5} ${dieY} L ${cx + 5} ${dieY} L ${cx + 3.6} ${dieY + 3.4} L ${cx - 3.6} ${dieY + 3.4} Z`, { fill: { linear: [cx, dieY, cx, dieY + 3.4], stops: [{ at: 0, color: 'brass-light' }, { at: 1, color: 'brass-dark' }] }, outline: true }),
    ...[-2.4, 0, 2.4].map((x) => ellipse(cx + x, dieY + 3.6, 0.6, 0.5, flat('brass-light'))),
  ];
};

/** 038's machines' mechanisms, by machine id. */
export const MINE_MECHANISMS: Readonly<Record<string, Mechanism>> = {
  'plate-press': platePress,
  'mine-packer': minePacker,
  'cluster-die': clusterDie,
};
