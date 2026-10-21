import { CONDUIT_ANIMS, CONDUIT_CORNERS, CRATE_SPRITE, FACING_ARROWS, HOPPER_SPRITES, STATUS_MARKERS, type PieceView } from '../foundryAssets';
import { RESEARCH_SPRITES } from '../researchAssets';
import { ellipse, flat, line, path, rect, solid, trim, type Shape, type VectorSprite } from './types';

// Logistics pieces (020), in the 016 vector style: ley conduits as a cyan crystal
// channel in a stone trough with brass collars where tiles meet, chevrons riding
// the flow over two frames; the splitter's hub; the
// violet stone hopper; the rune-locked crate; build-mode arrows; machine status markers. Floor pieces are
// drawn in tile px from their top-left; standing pieces round their bottom centre.

type Edge = 'up' | 'down' | 'left' | 'right';
type Pt = readonly [number, number];

const T = 32;
const MID: Pt = [T / 2, T / 2];
const EDGE: Readonly<Record<Edge, Pt>> = { up: [T / 2, 0], down: [T / 2, T], left: [0, T / 2], right: [T, T / 2] };

/** Points along a conduit's centre line from the edge items come in by to the edge they leave by: straight, or a curve round the middle. */
function route(from: Edge, to: Edge): Pt[] {
  const a = EDGE[from];
  const b = EDGE[to];
  if (a[0] === T - b[0] && a[1] === T - b[1]) return [a, b];
  return Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * MID[0] + t * t * b[0], u * u * a[1] + 2 * u * t * MID[1] + t * t * b[1]] as const;
  });
}

/** The point and unit direction `f` (0..1) of the way along `pts`. */
function along(pts: readonly Pt[], f: number): { at: Pt; dir: Pt } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - (pts[i]?.[0] ?? 0), p[1] - (pts[i]?.[1] ?? 0)));
  let d = f * lens.reduce((a, b) => a + b, 0);
  for (const [i, len] of lens.entries()) {
    const p = pts[i];
    const q = pts[i + 1];
    if (!p || !q) break;
    if (d <= len || i === lens.length - 1) {
      const k = len > 0 ? Math.min(1, d / len) : 0;
      return { at: [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], dir: [(q[0] - p[0]) / (len || 1), (q[1] - p[1]) / (len || 1)] };
    }
    d -= len;
  }
  return { at: pts[0] ?? MID, dir: [1, 0] };
}

const flatPts = (pts: readonly Pt[], dy = 0): number[] => pts.flatMap(([x, y]) => [x, y + dy]);

/** A brass collar across the trough where it meets a tile edge. */
function collar(edge: Edge, w = 16): Shape {
  const half = w / 2;
  if (edge === 'up') return rect(T / 2 - half, 0, w, 2.2, 0.5, solid('brass'));
  if (edge === 'down') return rect(T / 2 - half, T - 2.2, w, 2.2, 0.5, solid('brass'));
  if (edge === 'left') return rect(0, T / 2 - half, 2.2, w, 0.5, solid('brass'));
  return rect(T - 2.2, T / 2 - half, 2.2, w, 0.5, solid('brass'));
}

/** A small chevron at `at`, pointing along `dir`. */
function chevron(at: Pt, dir: Pt, color: string, size = 2.6): Shape {
  const [x, y] = at;
  const [dx, dy] = dir;
  const nx = -dy;
  const ny = dx;
  const tip = [x + dx * size * 0.6, y + dy * size * 0.6];
  const back = (s: number) => [x - dx * size * 0.6 + nx * size * s, y - dy * size * 0.6 + ny * size * s];
  const [ax, ay] = back(1);
  const [bx, by] = back(-1);
  return { ...line([ax ?? 0, ay ?? 0, tip[0] ?? 0, tip[1] ?? 0, bx ?? 0, by ?? 0], 1.1, color), glow: { color: 'cyan', blur: 2 } };
}

/** A trough along `pts`: its shadow, stone body and top. */
const trough = (pts: readonly Pt[], stone: string, top: string, w = 15): Shape[] => [
  line(flatPts(pts, 2), w + 2, { id: 'ground-shade', alpha: 0.3 }),
  line(flatPts(pts), w, stone, true),
  line(flatPts(pts, -0.6), w - 3.4, top),
];

/** The ley channel along `pts`: a dark cut, the deep crystal and a glowing core. */
const channel = (pts: readonly Pt[], deep = 'cyan-deep', core = 'cyan'): Shape[] => [
  line(flatPts(pts), 7, 'ink'),
  { ...line(flatPts(pts), 5, deep), glow: { color: 'cyan', blur: 2 } },
  { ...line(flatPts(pts), 1.8, core), glow: { color: 'cyan-glow', blur: 3 } },
];

/** Two chevrons riding the flow, a quarter of the way on each frame. */
const flow = (pts: readonly Pt[], frame: number): Shape[] =>
  [0.2, 0.7].map((f) => {
    const { at, dir } = along(pts, (f + frame * 0.25) % 1);
    return chevron(at, dir, 'cyan-glow');
  });

function conduit(from: Edge, to: Edge, frame: number): Shape[] {
  const pts = route(from, to);
  return [...trough(pts, 'rock', 'rock-light'), ...channel(pts), collar(from), collar(to), ...flow(pts, frame)];
}

const floorPiece = (key: string, frames: readonly (readonly Shape[])[]): VectorSprite => ({ key, size: [T, T], anchor: [0, 0], frames });
const twoFrames = (draw: (frame: number) => Shape[]): Shape[][] => [draw(0), draw(1)];

const STRAIGHT: Readonly<Record<PieceView, [Edge, Edge]>> = { side: ['left', 'right'], up: ['down', 'up'], down: ['up', 'down'] };

const CONDUITS: VectorSprite[] = [
  ...Object.entries(CONDUIT_ANIMS).map(([view, anim]) => {
    const [from, to] = STRAIGHT[view as PieceView];
    return floorPiece(anim.key, twoFrames((f) => conduit(from, to, f)));
  }),
  ...Object.entries(CONDUIT_CORNERS).map(([key, anim]) => {
    const [from, to] = key.split('-') as [Edge, Edge];
    return floorPiece(anim.key, twoFrames((f) => conduit(from, to, f)));
  }),
];

// The splitter (033) runs in from its back and out its front and its side.
const SPLIT_SIDE: Readonly<Record<PieceView, Edge>> = { side: 'down', down: 'left', up: 'right' };
// Lying flat: cyan channels meeting at a brass hub.
/** Channels in from each of `ins` and out to each of `outs`, meeting at a brass hub, a chevron riding each. */
function hub(ins: readonly Edge[], outs: readonly Edge[]): Shape[] {
  const arms: Pt[][] = [...ins.map((e) => [EDGE[e], MID]), ...outs.map((e) => [MID, EDGE[e]])];
  return [
    ...arms.flatMap((pts) => trough(pts, 'rock', 'rock-light')),
    ...arms.flatMap((pts) => channel(pts)),
    ...[...ins, ...outs].map((e) => collar(e)),
    ...arms.map((pts) => {
      const { at, dir } = along(pts, 0.6);
      return chevron(at, dir, 'cyan-glow');
    }),
    ellipse(MID[0], MID[1], 5.2, 5.2, solid('brass')),
    ellipse(MID[0], MID[1], 2.4, 2.4, { fill: 'cyan', glow: { color: 'cyan', blur: 2 } }),
  ];
}
function splitter(view: PieceView): Shape[] {
  const [from, to] = STRAIGHT[view];
  return hub([from], [to, SPLIT_SIDE[view]]);
}
const SPLITTERS: VectorSprite[] = (['side', 'up', 'down'] as const).map((view) => floorPiece(RESEARCH_SPRITES.splitter[view], [splitter(view)]));

// Hoppers: a violet stone funnel on a stone footing, its brass spout toward the side it feeds.
const standing = (key: string, h: number, shapes: readonly Shape[]): VectorSprite => ({ key, size: [T, h], anchor: [T / 2, h], frames: [shapes] });
const footShadow = (rx: number): Shape => ellipse(0, -2, rx, 3.2, { fill: { id: 'ground-shade', alpha: 0.4 } });

function hopper(view: PieceView): Shape[] {
  const spout: Shape[] =
    view === 'down'
      ? [rect(-3, -9, 6, 7, 1, solid('brass')), ellipse(0, -2.4, 2.4, 1, flat('ink'))]
      : view === 'side'
        ? [rect(9, -14, 6, 5, 1, solid('brass')), ellipse(15, -11.5, 1, 2.2, flat('ink'))]
        : [rect(-3, -38, 6, 5, 1, solid('brass-dark'))];
  return [
    footShadow(14),
    ...(view === 'up' ? spout : []),
    rect(-12, -14, 24, 12, 2, { fill: { linear: [0, -14, 0, -2], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
    path('M -14 -34 L 14 -34 L 6 -16 L -6 -16 Z', { fill: { linear: [0, -34, 0, -16], stops: [{ at: 0, color: 'core' }, { at: 1, color: 'core-dark' }] }, outline: true }),
    path('M -9 -31 L -4.4 -18', trim({ id: 'snow', alpha: 0.35 }, 1)),
    ellipse(0, -34, 14, 3.6, solid('core')),
    ellipse(0, -33.6, 11, 2.4, flat('ink')),
    rect(-7, -17.5, 14, 2.4, 0.6, solid('brass')),
    ...(view === 'up' ? [] : spout),
  ];
}
const HOPPERS: VectorSprite[] = Object.entries(HOPPER_SPRITES).map(([view, key]) => standing(key, 40, hopper(view as PieceView)));

// The crate: a rune-locked stone coffer, a lid on top for its contents' icon, brass straps and a ley lock.
const CRATE: VectorSprite = standing(CRATE_SPRITE, 36, [
  footShadow(15),
  rect(-14, -22, 28, 20, 2, { fill: { linear: [0, -22, 0, -2], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] }, outline: true }),
  rect(-14, -32, 28, 11, 2, { fill: { linear: [0, -32, 0, -21], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-light' }] }, outline: true }),
  ...[-9, 9].map((x) => rect(x - 1.6, -32, 3.2, 30, 0.6, solid('brass-dark'))),
  rect(-3, -15, 6, 6, 1, { fill: 'cyan', outline: true, glow: { color: 'cyan', blur: 3 } }),
  ellipse(0, -12, 1, 1, flat('ink')),
]);

// Build mode's arrows (10x10): cyan for the side a piece hands out of, ember for a side that takes items.
const ARROW_TURN: Readonly<Record<PieceView, number>> = { side: 0, down: 90, up: -90 };
function arrow(view: PieceView, fill: string, edge: string): Shape[] {
  const r = (ARROW_TURN[view] * Math.PI) / 180;
  const pt = (x: number, y: number) => `${(x * Math.cos(r) - y * Math.sin(r)).toFixed(2)} ${(x * Math.sin(r) + y * Math.cos(r)).toFixed(2)}`;
  return [path(`M ${pt(4, 0)} L ${pt(-1, -4)} L ${pt(-1, -1.6)} L ${pt(-4, -1.6)} L ${pt(-4, 1.6)} L ${pt(-1, 1.6)} L ${pt(-1, 4)} Z`, { fill, outline: true, stroke: { color: edge, width: 0.5 } })];
}
const ARROW_COLOURS = { out: ['cyan', 'cyan-glow'], in: ['cinder', 'gold-trim'] } as const;
const ARROWS: VectorSprite[] = (['out', 'in'] as const).flatMap((kind) =>
  Object.entries(FACING_ARROWS[kind]).map(([view, key]) => ({
    key,
    size: [10, 10] as const,
    anchor: [5, 5] as const,
    frames: [arrow(view as PieceView, ARROW_COLOURS[kind][0], ARROW_COLOURS[kind][1])],
  })),
);

// Machine status markers, drawn above a machine: a turning gold cog (working), an ember stop rune (blocked), a dark well for the missing input (starved).
const cog = (turn: number): Shape[] => {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = turn + (i * Math.PI) / 4;
    return line([Math.cos(a) * 2.8, Math.sin(a) * 2.8, Math.cos(a) * 4.3, Math.sin(a) * 4.3], 1.8, 'gold-trim', true);
  });
  return [...teeth, ellipse(0, 0, 3.2, 3.2, solid('gold-trim')), ellipse(0, 0, 1.2, 1.2, flat('ink'))];
};
const MARKERS: VectorSprite[] = [
  { key: STATUS_MARKERS.working.key, size: [10, 10], anchor: [5, 10], frames: [cog(0), cog(Math.PI / 8)].map((s) => s.map((sh) => shift(sh, 0, -5))) },
  {
    key: STATUS_MARKERS.blocked,
    size: [10, 10],
    anchor: [5, 10],
    frames: [
      [
        path('M -1.8 -9.4 L 1.8 -9.4 L 4.4 -6.8 L 4.4 -3.2 L 1.8 -0.6 L -1.8 -0.6 L -4.4 -3.2 L -4.4 -6.8 Z', { fill: 'cinder', outline: true, glow: { color: 'cinder', blur: 2 } }),
        line([-2, -5, 2, -5], 1.4, 'snow'),
      ],
    ],
  },
  {
    key: STATUS_MARKERS.starved,
    size: [20, 20],
    anchor: [10, 20],
    frames: [
      [
        path('M -3 -3 L 0 0 L 3 -3 Z', { fill: { id: 'ink', alpha: 0.85 }, outline: true }),
        ellipse(0, -10.5, 9, 8.6, { fill: { id: 'ink', alpha: 0.85 }, outline: true, stroke: { color: 'cinder', width: 0.8 } }),
      ],
    ],
  },
];

/** `shape` moved by (dx, dy). Only for lines and ellipses, which the cog uses. */
function shift(shape: Shape, dx: number, dy: number): Shape {
  if (shape.kind === 'ellipse') return { ...shape, x: shape.x + dx, y: shape.y + dy };
  if (shape.kind === 'line') return { ...shape, pts: shape.pts.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
  return shape;
}

export const LOGISTICS_SPRITES_VECTOR: readonly VectorSprite[] = [...CONDUITS, ...SPLITTERS, ...HOPPERS, CRATE, ...ARROWS, ...MARKERS];
