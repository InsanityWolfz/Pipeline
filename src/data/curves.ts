import type { TilePos } from './tiles';

// Smooth curves for the round world's roads and ley lines (053, D.3: "one clean path", ley lines as "smooth single
// curves"): a centripetal Catmull-Rom spline through hand-placed waypoints, sampled about every `step` tiles. It
// passes through every waypoint, so a branch that starts on a waypoint of its parent joins it exactly. Pure geometry.

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** One centripetal Catmull-Rom span from p1 to p2 (p0 and p3 its neighbours), at t in 0..1. */
function span(p0: TilePos, p1: TilePos, p2: TilePos, p3: TilePos, t: number): TilePos {
  const knot = (a: TilePos, b: TilePos) => Math.max(1e-6, Math.sqrt(Math.hypot(b.tx - a.tx, b.ty - a.ty)));
  const t1 = knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a: TilePos, b: TilePos, ta: number, tb: number): TilePos => {
    const k = (u - ta) / (tb - ta);
    return { tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k };
  };
  const a1 = lerp(p0, p1, 0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, 0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

/** A smooth curve through `points`, sampled about every `step` tiles; its first and last points are the waypoints' own. */
export function smoothCurve(points: readonly TilePos[], step = 1): TilePos[] {
  const first = points[0];
  if (!first) return [];
  if (points.length === 1) return [first];
  const out: TilePos[] = [{ tx: first.tx, ty: first.ty }];
  for (let i = 0; i + 1 < points.length; i++) {
    const p1 = points[i] ?? first;
    const p2 = points[i + 1] ?? p1;
    // The ends mirror their neighbour, so the curve leaves and arrives straight along its first and last spans.
    const p0 = points[i - 1] ?? { tx: 2 * p1.tx - p2.tx, ty: 2 * p1.ty - p2.ty };
    const p3 = points[i + 2] ?? { tx: 2 * p2.tx - p1.tx, ty: 2 * p2.ty - p1.ty };
    const n = Math.max(1, Math.round(Math.hypot(p2.tx - p1.tx, p2.ty - p1.ty) / step));
    for (let k = 1; k < n; k++) {
      const p = span(p0, p1, p2, p3, k / n);
      out.push({ tx: round2(p.tx), ty: round2(p.ty) });
    }
    out.push({ tx: p2.tx, ty: p2.ty });
  }
  return out;
}

/** The shortest distance from a point to a polyline, in its units. */
export function distanceToLine(p: TilePos, line: readonly TilePos[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    best = Math.min(best, distanceToSegment(p, a, b));
  }
  if (line.length === 1 && line[0]) best = Math.hypot(p.tx - line[0].tx, p.ty - line[0].ty);
  return best;
}

/** The shortest distance from a point to a segment. */
export function distanceToSegment(p: TilePos, a: TilePos, b: TilePos): number {
  const dx = b.tx - a.tx;
  const dy = b.ty - a.ty;
  const len = dx * dx + dy * dy;
  const k = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.tx - a.tx) * dx + (p.ty - a.ty) * dy) / len));
  return Math.hypot(p.tx - (a.tx + k * dx), p.ty - (a.ty + k * dy));
}
