import { TUNNEL_ICONS, TUNNEL_SPRITES, type PieceView } from '../foundryAssets';
import { channel, chevron, collar, floorPiece, STRAIGHT, T, trough, type Pt } from './logistics';
import { ellipse, line, rect, solid, trim, type PathCmd, type Shape, type ShapeStyle, type VectorSprite } from './types';

// The underground pair (052), lying flat like a conduit: the ley channel runs into a
// carved stone hood and dives under the floor at the entrance, and climbs out of the
// same hood at the exit. The hood's rune says which: a chevron pointing down into the
// floor at the entrance, up out of it at the exit. Each view is drawn along its flow:
// (u, v) is along and across the flow from the tile's middle, `side` flowing right.

const DIR: Readonly<Record<PieceView, Pt>> = { side: [1, 0], down: [0, 1], up: [0, -1] };

/** Tile px of a point `u` along the flow and `v` across it, from the middle. */
function at(view: PieceView, u: number, v: number): Pt {
  const [dx, dy] = DIR[view];
  return [T / 2 + u * dx - v * dy, T / 2 + u * dy + v * dx];
}

/** The axis-aligned box covering u in [u0, u1] and v in [v0, v1]. */
function box(view: PieceView, u0: number, u1: number, v0: number, v1: number): { x: number; y: number; w: number; h: number } {
  const [a, b] = [at(view, u0, v0), at(view, u1, v1)];
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  return { x, y, w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
}

/** An ellipse `ru` long along the flow and `rv` across it. */
function oval(view: PieceView, u: number, v: number, ru: number, rv: number, style: ShapeStyle): Shape {
  const [x, y] = at(view, u, v);
  return view === 'side' ? ellipse(x, y, ru, rv, style) : ellipse(x, y, rv, ru, style);
}

/** A closed path through (u, v) points. */
function poly(view: PieceView, pts: readonly Pt[], style: ShapeStyle): Shape {
  const d: PathCmd[] = pts.map(([u, v], i) => {
    const [x, y] = at(view, u, v);
    return i === 0 ? ['M', x, y] : ['L', x, y];
  });
  return { kind: 'path', d: [...d, ['Z']], ...style };
}

/** The carved hood over the channel's mouth, covering u from `u0` to `u1`; its mouth opens toward `mouth` (its own u). */
function hood(view: PieceView, u0: number, u1: number, mouth: number, runeUp: boolean): Shape[] {
  const b = box(view, u0, u1, -10, 10);
  const top = box(view, u0 + 1.5, u1 - 1.5, -8, 8);
  const mid = (u0 + u1) / 2;
  const face = mouth < mid ? 1 : -1;
  // The rune: a chevron pointing down into the floor (against the flow's way in) or up out of it.
  const tip = runeUp ? 3 : -3;
  return [
    rect(b.x + 1, b.y + 2, b.w, b.h, 3, { fill: { id: 'ground-shade', alpha: 0.35 } }),
    rect(b.x, b.y, b.w, b.h, 3, { ...solid({ linear: [0, b.y, 0, b.y + b.h], stops: [{ at: 0, color: 'rock' }, { at: 1, color: 'rock-dark' }] }) }),
    rect(top.x, top.y, top.w, top.h, 2, { fill: { linear: [top.x, top.y, top.x + top.w, top.y + top.h], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] } }),
    // The dark mouth, with the channel's glow deep inside.
    oval(view, mouth, 0, 2.8, 6.4, solid('ink')),
    oval(view, mouth + face * 0.8, 0, 1.4, 3.6, { fill: 'cyan-deep', glow: { color: 'cyan', blur: 3 } }),
    // Brass bands either side of the mouth.
    ...[-8.6, 8.6].map((v) => oval(view, mouth + face * 1.6, v, 1.4, 1.4, solid('brass'))),
    poly(view, [[mid + face * 1.2 - tip / 2, -3.2], [mid + face * 1.2 + tip / 2, 0], [mid + face * 1.2 - tip / 2, 3.2]], { stroke: { color: 'cyan-glow', width: 1.2 }, glow: { color: 'cyan', blur: 2 } }),
  ];
}

/** The channel along u from `u0` to `u1`, with chevrons riding toward the flow's front at each u in `chevrons`. */
function run(view: PieceView, u0: number, u1: number, chevrons: readonly number[]): Shape[] {
  const pts = [at(view, u0, 0), at(view, u1, 0)];
  return [...trough(pts, 'rock', 'rock-light'), ...channel(pts), ...chevrons.map((u) => chevron(at(view, u, 0), DIR[view], 'cyan-glow'))];
}

/** An entrance: in from its back edge, into the hood's mouth. */
function entrance(view: PieceView): Shape[] {
  return [...run(view, -16, 4, [-10, -3]), collar(STRAIGHT[view][0]), ...hood(view, 1, 15, 2.4, false)];
}

/** An exit: up out of the hood's mouth, out its front edge. */
function exit(view: PieceView): Shape[] {
  return [...run(view, -4, 16, [5, 11]), collar(STRAIGHT[view][1]), ...hood(view, -15, -1, -2.4, true)];
}

const VIEWS: readonly PieceView[] = ['side', 'up', 'down'];

/** Build bar emblems (16×16): a channel into a dark hood, or out of one, with its rune. */
function emblem(out: boolean): Shape[] {
  const hx = out ? -7 : 1;
  const mouth = out ? -0.6 : 1.6;
  return [
    rect(-7, -2.6, 14, 5.2, 1.4, solid('rock-light')),
    rect(-7, -1.4, 14, 2.8, 0.6, { fill: 'cyan-deep', glow: { color: 'cyan', blur: 2 } }),
    rect(hx, -5.6, 6, 11.2, 1.6, solid({ linear: [0, -5.6, 0, 5.6], stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock-dark' }] })),
    ellipse(mouth, 0, 1.3, 3, solid('ink')),
    line(out ? [2.4, -1.8, 5.8, 0, 2.4, 1.8] : [-6, -1.8, -2.6, 0, -6, 1.8], 1.1, 'cyan-glow'),
    { kind: 'path', d: out ? [['M', -5.6, 1.4], ['L', -4, -1.2], ['L', -2.4, 1.4]] : [['M', 2.4, -1.4], ['L', 4, 1.2], ['L', 5.6, -1.4]], ...trim('cyan-glow', 0.9), glow: { color: 'cyan', blur: 2 } },
  ];
}

const icon = (key: string, shapes: readonly Shape[]): VectorSprite => ({ key, size: [16, 16], anchor: [8, 8], frames: [shapes] });

export const TUNNEL_SPRITES_VECTOR: readonly VectorSprite[] = [
  ...VIEWS.flatMap((view) => [floorPiece(TUNNEL_SPRITES.in[view], [entrance(view)]), floorPiece(TUNNEL_SPRITES.out[view], [exit(view)])]),
  icon(TUNNEL_ICONS.in, emblem(false)),
  icon(TUNNEL_ICONS.out, emblem(true)),
];
