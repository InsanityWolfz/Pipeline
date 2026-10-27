import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { LIGHT_SOURCES } from '../../data/lights';
import { OVERWORLD } from '../../data/overworld';
import { SPRINGS } from '../../data/springs';
import type { Quality } from '../../data/settings';

// 074: the overworld's fixed lights, worked out once and bucketed by ground chunk so a frame looks only at the chunks
// in view: a light every `every.high` tiles along each ley line (Medium keeps every other one), and the Ley Springs.

const T = TILE_SIZE;
const C = GROUND.chunk;

/** A fixed point light: where, and whether Medium keeps it too. */
export interface FixedPoint {
  x: number;
  y: number;
  medium: boolean;
}

const bucketKey = (x: number, y: number): string => `${Math.floor(x / C)},${Math.floor(y / C)}`;

function bucket<P extends { x: number; y: number }>(points: readonly P[]): Map<string, P[]> {
  const out = new Map<string, P[]>();
  for (const p of points) {
    const k = bucketKey(p.x, p.y);
    const list = out.get(k) ?? [];
    list.push(p);
    out.set(k, list);
  }
  return out;
}

/** Points every `step` px along a polyline of tile centres, the first at its start. */
function along(tiles: readonly { tx: number; ty: number }[], step: number): { x: number; y: number }[] {
  const pts = tiles.map((t) => ({ x: (t.tx + 0.5) * T, y: (t.ty + 0.5) * T }));
  const out: { x: number; y: number }[] = [];
  let carry = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = carry; s < len; s += step) out.push({ x: a.x + ((b.x - a.x) * s) / len, y: a.y + ((b.y - a.y) * s) / len });
    carry = (((carry - len) % step) + step) % step;
  }
  return out;
}

let leyBuckets: Map<string, FixedPoint[]> | null = null;
let springBuckets: Map<string, { x: number; y: number }[]> | null = null;

function leyLineBuckets(): Map<string, FixedPoint[]> {
  if (leyBuckets) return leyBuckets;
  const every = LIGHT_SOURCES.leyLine.every;
  const ratio = Math.round(every.medium / every.high);
  const points = Object.values(OVERWORLD.leyLines).flatMap((seam) => along(seam, every.high * T).map((p, i) => ({ ...p, medium: i % ratio === 0 })));
  return (leyBuckets = bucket(points));
}

/** The chunk keys a world rectangle touches, `pad` px past it. */
function keysIn(view: { x: number; y: number; width: number; height: number }, pad: number): string[] {
  const keys: string[] = [];
  const [x0, x1] = [Math.floor((view.x - pad) / C), Math.floor((view.x + view.width + pad) / C)];
  const [y0, y1] = [Math.floor((view.y - pad) / C), Math.floor((view.y + view.height + pad) / C)];
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) keys.push(`${cx},${cy}`);
  return keys;
}

const inside = (p: { x: number; y: number }, v: { x: number; y: number; width: number; height: number }, pad: number): boolean =>
  p.x >= v.x - pad && p.x <= v.x + v.width + pad && p.y >= v.y - pad && p.y <= v.y + v.height + pad;

/** The ley-line lights round a view (`pad` px past it), on a tier. */
export function leyLinePoints(view: { x: number; y: number; width: number; height: number }, quality: Quality, pad: number): FixedPoint[] {
  const b = leyLineBuckets();
  return keysIn(view, pad).flatMap((k) => b.get(k) ?? []).filter((p) => (quality === 'high' || p.medium) && inside(p, view, pad));
}

/** The Ley Springs round a view. */
export function springPoints(view: { x: number; y: number; width: number; height: number }, pad: number): { x: number; y: number }[] {
  springBuckets ??= bucket(SPRINGS.map((s) => ({ x: (s.tx + 0.5) * T, y: (s.ty + 0.5) * T })));
  const b = springBuckets;
  return keysIn(view, pad).flatMap((k) => b.get(k) ?? []).filter((p) => inside(p, view, pad));
}
