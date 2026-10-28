import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { LIGHT_SOURCES } from '../../data/lights';
import { OVERWORLD } from '../../data/overworld';
import { SPRINGS } from '../../data/springs';
import { TILE } from '../../data/rooms';
import { worldTileHash } from '../roomTiles';
import { EMBERWORKS_SPRITES } from '../../data/emberworksAssets';
import { VARIANT_FRAMES } from '../../data/assets';
import { variantFrame } from '../world/variants';
import { setPieceOnTile } from '../world/decorPlace';
import type { Quality } from '../../data/settings';

// 074: the overworld's fixed lights, worked out once and bucketed by ground chunk so a frame looks only at the chunks
// in view: a light every `every.high` tiles along each ley line (Medium keeps every other one), the Ley Springs, and
// (074.7) the Emberworks' kiln mouths and chimney tops.

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

/** A fire that stays put: where, its radius and intensity. */
export interface FixedFire {
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

/**
 * The kilns' and chimneys' fires on a map: a light per row of front kilns side by side (a kiln with another in front of
 * it shows its brick top, not its mouth), at the row's middle; a light at each chimney's lip, by the stack's look.
 */
export function firesOf(rows: readonly string[]): FixedFire[] {
  const F = LIGHT_SOURCES.fire;
  const out: FixedFire[] = [];
  for (const [ty, row] of rows.entries()) {
    const below = rows[ty + 1] ?? '';
    // 077: a kiln under a set piece (the Great Crucible, the Toppled Stack) isn't drawn, so it gives no light.
    const front = (tx: number) => row[tx] === TILE.kiln && below[tx] !== TILE.kiln && !setPieceOnTile(tx, ty);
    for (let tx = 0; tx < row.length; tx++) {
      if (row[tx] === TILE.chimney) {
        const rises = F.chimney.rises;
        const look = EMBERWORKS_SPRITES.chimney[worldTileHash(tx, ty) % EMBERWORKS_SPRITES.chimney.length] ?? '';
        // 077: a chimney broken to a stump (its ruin variant) burns low, at its own lip.
        const rise = variantFrame(rows, look, tx, ty) === VARIANT_FRAMES.chimneyStump ? F.chimney.stumpRise : (rises[worldTileHash(tx, ty) % rises.length] ?? 0);
        out.push({ x: (tx + 0.5) * T, y: (ty + 1) * T - rise, radius: F.radii.chimney, intensity: F.chimney.intensity });
        continue;
      }
      if (!front(tx) || front(tx - 1)) continue;
      let end = tx;
      while (front(end + 1)) end += 1;
      const n = end - tx + 1;
      out.push({ x: ((tx + end + 1) / 2) * T, y: (ty + 1) * T - F.kiln.rise, radius: Math.min(F.kiln.max, F.radii.kiln + (n - 1) * F.kiln.perTile), intensity: F.intensity });
    }
  }
  return out;
}

const fireBuckets = new WeakMap<readonly string[], Map<string, FixedFire[]>>();

/** The kilns' and chimneys' fires round a view on a map (`rows`), worked out once a map. */
export function firePoints(rows: readonly string[], view: { x: number; y: number; width: number; height: number }, pad: number): FixedFire[] {
  let b = fireBuckets.get(rows);
  if (!b) fireBuckets.set(rows, (b = bucket(firesOf(rows))));
  const map = b;
  return keysIn(view, pad).flatMap((k) => map.get(k) ?? []).filter((p) => inside(p, view, pad + p.radius));
}
