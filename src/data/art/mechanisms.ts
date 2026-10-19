import { STAGE_MECHANISMS } from './stageMechanisms';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// Machine mechanisms (020): what each machine visibly does, drawn in its housing's
// window (src/data/art/machines.ts). Each takes the window box and the phase of
// its working loop, `t` in 0..1; idle draws t = 0, and a jammed machine is drawn
// stuck part-way with an ember glint. Shapes stay inside the box.

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type Mechanism = (b: Box, t: number) => Shape[];

const TAU = Math.PI * 2;
const centre = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];
const pt = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
/** 0 at t = 0 and 1, 1 at t = 0.5: a stroke down and back. */
const stroke = (t: number): number => (1 - Math.cos(t * TAU)) / 2;

/** A toothed disc of radius r, turned by `turn`. */
function blade(cx: number, cy: number, r: number, turn: number): Shape[] {
  const teeth = Array.from({ length: 10 }, (_, i) => {
    const a = turn + (i * TAU) / 10;
    const [x0, y0] = pt(cx, cy, r, a);
    const [x1, y1] = pt(cx, cy, r + 1.3, a + 0.2);
    return line([x0, y0, x1, y1], 1, 'rock-pale');
  });
  return [...teeth, ellipse(cx, cy, r, r, solid('rock-pale')), ellipse(cx, cy, r * 0.35, r * 0.35, solid('brass')), line([...pt(cx, cy, r * 0.4, turn), ...pt(cx, cy, r * 0.85, turn)], 0.6, 'rock')];
}

/** Cutter: a saw blade spins and bites down through a log. */
const cutter: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const logY = b.y + b.h - 4;
  const r = Math.min(b.h * 0.32, 6);
  const bite = stroke(t) * 2;
  return [
    rect(b.x + 1, logY - 3, b.w - 2, 6, 2.6, { fill: { linear: [0, logY - 3, 0, logY + 3], stops: [{ at: 0, color: 'wood-light' }, { at: 1, color: 'wood-dark' }] }, outline: true }),
    ellipse(b.x + b.w - 2.4, logY, 1.6, 2.8, solid('straw-light')),
    line([cx, b.y + 1, cx, logY - r - 1 + bite], 1.2, 'brass-dark', true),
    ...blade(cx, logY - r + bite, r, t * (TAU / 10)),
    ...(t > 0 ? [ellipse(cx - r - 1.5, logY - 2, 0.6, 0.6, flat('straw-light')), ellipse(cx + r + 1.2, logY - 3, 0.5, 0.5, flat('straw-light'))] : []),
  ];
};

/** Knapper: a stone-headed hammer swings down onto a block, chips flying on the strike. */
const knapper: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const base = b.y + b.h;
  const pivot: [number, number] = [b.x + 3, b.y + 3];
  const a = 0.05 + 0.7 * stroke(t);
  const head = pt(pivot[0], pivot[1], b.w * 0.62, a);
  const strike = t === 0.5;
  return [
    rect(cx - 4, base - 6, 9, 6, 1, { fill: { linear: [0, base - 6, 0, base], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock' }] }, outline: true }),
    line([...pivot, ...head], 1.3, 'wood', true),
    ellipse(head[0], head[1], 3, 2.2, solid('rock-light')),
    ellipse(pivot[0], pivot[1], 1.4, 1.4, solid('brass')),
    ...(strike ? [ellipse(cx + 5, base - 7, 0.8, 0.8, { fill: 'gold-trim', glow: { color: 'gold-trim', blur: 2 } }), ellipse(cx - 4, base - 8, 0.6, 0.6, flat('rock-pale'))] : []),
  ];
};

/** Spinner: a spindle wheel turns, winding a strand of fiber onto a bobbin that fills. */
const spinner: Mechanism = (b, t) => {
  const [, cy] = centre(b);
  const r = Math.min(b.h / 2 - 1.5, 7);
  const wx = b.x + r + 1.5;
  const turn = t * (TAU / 3);
  const spokes = [0, 1, 2].map((i) => line([wx, cy, ...pt(wx, cy, r - 1, turn + (i * TAU) / 3)], 0.8, 'wood-dark'));
  const sx = b.x + b.w - 4;
  return [
    ellipse(wx, cy, r, r, trim('wood', 1.8)),
    ...spokes,
    ellipse(wx, cy, 1.2, 1.2, solid('brass')),
    line([wx, cy - r, sx, cy - 1], 0.5, 'leaf-light'),
    line([sx, b.y + 2, sx, b.y + b.h - 2], 0.9, 'brass-dark'),
    ellipse(sx, cy, 2 + 0.3 * Math.sin(t * TAU), 3.4, solid('straw')),
    line([sx - 1.6, cy - 1 + t * 2, sx + 1.6, cy - 0.4 + t * 2], 0.4, 'straw-dark'),
  ];
};

/** Assembler: brass arms push an arrowhead and a wrap of rope onto a shaft, then draw back. */
const assembler: Mechanism = (b, t) => {
  const [cx, cy] = centre(b);
  const wide = b.w >= b.h;
  const reach = (wide ? b.w : b.h) / 2 - 3;
  const close = stroke(t);
  const gap = reach * (0.75 - 0.45 * close);
  const along = (d: number): [number, number] => (wide ? [cx + d, cy] : [cx, cy + d]);
  const [hx, hy] = along(gap);
  const [rx, ry] = along(-gap);
  // Parts scale with the window: a 3x1 machine's is long.
  const s = Math.max(1, Math.min(1.6, reach / 16));
  const half = reach * 0.32;
  const shaft = wide ? [cx - half, cy, cx + half, cy] : [cx, cy - half, cx, cy + half];
  const bed: Shape = wide ? line([b.x + 2, cy + 4.6, b.x + b.w - 2, cy + 4.6], 1, 'brass-dark') : line([cx + 4.6, b.y + 2, cx + 4.6, b.y + b.h - 2], 1, 'brass-dark');
  const arm = (x: number, y: number): Shape[] => (wide ? [line([x, b.y + 1, x, y - 2], 1.4, 'brass', true), rect(x - 2, y - 3.6, 4, 2, 0.6, solid('brass-dark'))] : [line([b.x + 1, y, x - 2, y], 1.4, 'brass', true), rect(x - 3.6, y - 2, 2, 4, 0.6, solid('brass-dark'))]);
  return [
    bed,
    line(shaft, 1.6 * s, 'wood-light', true),
    path(
      wide ? `M ${hx + 4 * s} ${hy} L ${hx} ${hy - 2.4 * s} L ${hx} ${hy + 2.4 * s} Z` : `M ${hx} ${hy + 4 * s} L ${hx - 2.4 * s} ${hy} L ${hx + 2.4 * s} ${hy} Z`,
      solid('rock-pale'),
    ),
    ellipse(rx, ry, (wide ? 2.2 : 3) * s, (wide ? 3 : 2.2) * s, { ...trim('straw', 1.4), outline: true }),
    ...arm(hx, hy),
    ...arm(rx, ry),
  ];
};

/** Shaper: a brass press ram stamps down on a casing taking shape below it. */
const shaper: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const base = b.y + b.h;
  const down = stroke(t);
  const ramY = b.y + 2 + down * (b.h - 12);
  return [
    line([cx, b.y, cx, ramY], 1.6, 'rock-dark'),
    rect(cx - 6, ramY, 12, 4, 1, solid('brass')),
    path(`M ${cx - 4.5} ${base - 6} L ${cx - 4} ${base - 1} L ${cx + 4} ${base - 1} L ${cx + 4.5} ${base - 6} Z`, solid('rock-pale')),
    ellipse(cx, base - 6, 4.5, 1.4, flat('ink')),
    ...(down > 0.9 ? [ellipse(cx - 7, base - 4, 0.7, 0.7, flat('rock-pale')), ellipse(cx + 7, base - 4, 0.7, 0.7, flat('rock-pale'))] : []),
  ];
};

/** Fuse maker: resin drips from a vat onto a cord that twists beneath it. */
const fuseMaker: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const cordY = b.y + b.h - 4;
  const dropY = b.y + 5 + t * (cordY - b.y - 8);
  const twists = Array.from({ length: 6 }, (_, i) => {
    const x = b.x + 2 + ((i * (b.w - 4)) / 6 + t * ((b.w - 4) / 6)) % (b.w - 4);
    return line([x, cordY - 1.6, x + 1.6, cordY + 1.6], 0.7, 'resin-dark');
  });
  return [
    path(`M ${cx - 5} ${b.y} L ${cx + 5} ${b.y} L ${cx + 3} ${b.y + 4} L ${cx - 3} ${b.y + 4} Z`, solid('rock')),
    rect(cx - 4, b.y, 8, 1.6, 0.4, flat('resin')),
    ellipse(cx, dropY, 1.1, 1.5, { fill: 'resin-light', outline: true }),
    rect(b.x + 1, cordY - 2, b.w - 2, 4, 2, solid('resin')),
    ...twists,
    ellipse(cx, cordY - 1.8, 2.4, 0.8, { fill: { id: 'resin-light', alpha: 0.8 } }),
  ];
};

/** Grinder: a millstone turns over a bed of ley crystal, cyan grit spilling out. */
const grinder: Mechanism = (b, t) => {
  const [cx, cy] = centre(b);
  const rx = Math.min(b.w / 2 - 2, 9);
  const ry = Math.min(b.h / 2 - 3, 4);
  const a = t * TAU;
  const [nx, ny] = [cx + Math.cos(a) * rx * 0.7, cy - 1 + Math.sin(a) * ry * 0.7];
  return [
    ...[-5, -1, 3, 6].map((d, i) => path(`M ${cx + d - 1.5} ${b.y + b.h - 1} L ${cx + d} ${b.y + b.h - 4 - (i % 2)} L ${cx + d + 1.5} ${b.y + b.h - 1} Z`, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 2 } })),
    ellipse(cx, cy + 1.6, rx, ry, solid('rock')),
    ellipse(cx, cy - 1, rx, ry, solid('rock-light')),
    ellipse(cx, cy - 1, 1.6, 1, flat('brass')),
    line([cx, cy - 1, nx, ny], 0.8, 'rock-dark'),
    ...(t > 0 ? [ellipse(cx - rx - 0.5, cy + 2, 0.6, 0.6, { fill: 'cyan-glow', glow: { color: 'cyan', blur: 2 } })] : []),
  ];
};

/** Packer: arms bring a fuse and a shard of ley in from the sides and press the lid onto a casing. */
const packer: Mechanism = (b, t) => {
  const [cx, cy] = centre(b);
  const wide = b.w >= b.h;
  const reach = (wide ? b.w : b.h) / 2 - 4;
  const close = stroke(t);
  const gap = reach * (0.8 - 0.55 * close);
  const at = (d: number): [number, number] => (wide ? [cx + d, cy + 2] : [cx, cy + d]);
  const [fx, fy] = at(-gap);
  const [sx, sy] = at(gap);
  const lidY = cy - 6 + close * 2.4;
  const bed: Shape = wide ? line([b.x + 2, cy + 6, b.x + b.w - 2, cy + 6], 1, 'brass-dark') : line([cx + 6, b.y + 2, cx + 6, b.y + b.h - 2], 1, 'brass-dark');
  return [
    bed,
    path(`M ${cx - 4.5} ${cy - 2} L ${cx - 4} ${cy + 5} L ${cx + 4} ${cy + 5} L ${cx + 4.5} ${cy - 2} Z`, solid('rock-pale')),
    ellipse(cx, cy - 2, 4.5, 1.4, flat('ink')),
    rect(cx - 5, lidY - 1.6, 10, 2, 0.8, solid('rock-dark')),
    line([cx, b.y, cx, lidY - 1.6], 1, 'brass-dark'),
    ellipse(fx, fy, 2.2, 1.4, solid('resin')),
    path(`M ${sx} ${sy - 2.2} L ${sx + 1.8} ${sy} L ${sx} ${sy + 2.2} L ${sx - 1.8} ${sy} Z`, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 2 } }),
    ...(wide
      ? [line([fx - 3, fy, b.x + 1, fy], 1.3, 'brass', true), line([sx + 3, sy, b.x + b.w - 1, sy], 1.3, 'brass', true)]
      : [line([fx, fy - 3, fx, b.y + 1], 1.3, 'brass', true), line([sx, sy + 3, sx, b.y + b.h - 1], 1.3, 'brass', true)]),
  ];
};

/** Focuser: a crystal lens gathers beams of ley light into a bolt that grows bright beneath it. */
const focuser: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const lensY = b.y + 4;
  const focus = b.y + b.h - 4;
  const glow = 0.35 + 0.65 * stroke(t);
  const beams = [-1, -0.5, 0.5, 1].map((k) => ({ ...line([cx + k * (b.w / 2 - 1), b.y + 1, cx + k * 2.4, lensY], 0.6, { id: 'cyan-glow', alpha: 0.35 + 0.5 * glow }) }));
  return [
    ...beams,
    ellipse(cx, lensY, 5, 2.2, { fill: { radial: [cx - 1, lensY - 1, 5], stops: [{ at: 0, color: 'snow' }, { at: 1, color: 'cyan' }] }, outline: true, glow: { color: 'cyan-glow', blur: 2 + 3 * glow } }),
    line([cx - 5.5, lensY, cx + 5.5, lensY], 0.8, 'brass'),
    { ...line([cx, lensY + 2, cx, focus - 1], 0.8 + glow, { id: 'cyan-glow', alpha: 0.4 + 0.5 * glow }), glow: { color: 'cyan', blur: 2 + 2 * glow } },
    path(`M ${cx} ${focus + 2} L ${cx - 1.6} ${focus - 1.4} L ${cx} ${focus - 2.4 - 2 * glow} L ${cx + 1.6} ${focus - 1.4} Z`, { fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 2 + 4 * glow }, alpha: 0.5 + 0.5 * glow }),
  ];
};

/** Each machine's mechanism, by machine id. */
export const MECHANISMS: Readonly<Record<string, Mechanism>> = {
  cutter,
  knapper,
  spinner,
  assembler,
  shaper,
  'fuse-maker': fuseMaker,
  grinder,
  packer,
  focuser,
  ...STAGE_MECHANISMS,
};

/** Where a jammed machine is stuck in its loop, and the ember glint that says so. */
export const JAM_PHASE = 0.3;
export const jamGlint = (b: Box): Shape => ellipse(b.x + b.w - 3, b.y + 3, 1.4, 1.4, { fill: 'cinder-light', glow: { color: 'cinder', blur: 3 } });
