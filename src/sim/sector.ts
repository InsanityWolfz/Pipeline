// An arc of a circle (a pie slice) against an axis-aligned box, exactly. The
// punch (023) hits every enemy whose hit box overlaps its arc.

/** A pie slice: apex (x, y), unit direction (dirX, dirY), radius `reach`, `arcDegrees` wide in all. */
export interface Sector {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  reach: number;
  arcDegrees: number;
}

/** A box centred on (x, y). */
export interface CentredBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Absorbs float error so a box exactly on the arc's edge counts. */
const EPSILON = 1e-9;

type Pt = readonly [number, number];

function inSector(s: Sector, [px, py]: Pt): boolean {
  const dx = px - s.x;
  const dy = py - s.y;
  const d = Math.hypot(dx, dy);
  if (d > s.reach + EPSILON) return false;
  if (d === 0) return true;
  return (dx * s.dirX + dy * s.dirY) / d >= Math.cos((s.arcDegrees * Math.PI) / 360) - EPSILON;
}

const cross = (o: Pt, a: Pt, b: Pt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const onSegment = (p: Pt, a: Pt, b: Pt): boolean =>
  Math.min(a[0], b[0]) - EPSILON <= p[0] && p[0] <= Math.max(a[0], b[0]) + EPSILON && Math.min(a[1], b[1]) - EPSILON <= p[1] && p[1] <= Math.max(a[1], b[1]) + EPSILON;

/** True if segments ab and cd touch. */
function segmentsMeet(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (
    (Math.abs(d1) <= EPSILON && onSegment(a, c, d)) ||
    (Math.abs(d2) <= EPSILON && onSegment(b, c, d)) ||
    (Math.abs(d3) <= EPSILON && onSegment(c, a, b)) ||
    (Math.abs(d4) <= EPSILON && onSegment(d, a, b))
  );
}

/** True if segment ab crosses the sector's curved rim. */
function crossesRim(s: Sector, a: Pt, b: Pt): boolean {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const fx = a[0] - s.x;
  const fy = a[1] - s.y;
  const qa = ex * ex + ey * ey;
  const qb = 2 * (fx * ex + fy * ey);
  const qc = fx * fx + fy * fy - s.reach * s.reach;
  const disc = qb * qb - 4 * qa * qc;
  if (qa === 0 || disc < 0) return false;
  const root = Math.sqrt(disc);
  for (const t of [(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)]) {
    if (t < -EPSILON || t > 1 + EPSILON) continue;
    if (inSector(s, [a[0] + ex * t, a[1] + ey * t])) return true;
  }
  return false;
}

/**
 * True if the sector and the box overlap: the apex is in the box, a corner is
 * in the sector, or an edge of the box crosses either straight side or the rim.
 */
export function sectorHitsBox(s: Sector, box: CentredBox): boolean {
  const l = box.x - box.w / 2;
  const r = box.x + box.w / 2;
  const t = box.y - box.h / 2;
  const b = box.y + box.h / 2;
  if (s.x >= l && s.x <= r && s.y >= t && s.y <= b) return true;
  const corners: Pt[] = [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ];
  if (corners.some((c) => inSector(s, c))) return true;
  const half = (s.arcDegrees * Math.PI) / 360;
  const apex: Pt = [s.x, s.y];
  const side = (a: number): Pt => [s.x + (s.dirX * Math.cos(a) - s.dirY * Math.sin(a)) * s.reach, s.y + (s.dirX * Math.sin(a) + s.dirY * Math.cos(a)) * s.reach];
  const sides = [side(half), side(-half)];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const c = corners[(i + 1) % 4];
    if (!a || !c) continue;
    if (sides.some((end) => segmentsMeet(a, c, apex, end))) return true;
    if (crossesRim(s, a, c)) return true;
  }
  return false;
}
