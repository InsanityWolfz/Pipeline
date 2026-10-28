import { GROUND_BLEND } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import { WORLD_SHAPE } from '../../data/worldShape';
import { inkCss } from '../vector/draw';
import { CLASS_COLOR } from './groundBlend';

// 074: Region 1's edge with Stonefall Hollows. The two grounds are painted tile by tile, so where they meet along the
// barrier's circle the edge steps from tile to tile. This repaints the band along the true circle: stone outside a
// wobbling ring, grass inside it, and a row of grass blobs along it, so the edge is a ragged band of rounded blobs.
// The ring is sampled at fixed angles round the whole circle, so chunks that meet agree.

const T = TILE_SIZE;
const C = GROUND_BLEND.circle;
const CX = (WORLD_SHAPE.centre.tx + 0.5) * T;
const CY = (WORLD_SHAPE.centre.ty + 0.5) * T;
const R = WORLD_SHAPE.region1 * T;
/** Samples round the whole circle, about `blobStep` px apart. */
const N = Math.round((2 * Math.PI * R) / C.blobStep);
const STEP = (2 * Math.PI) / N;

/** The ring's radius at an angle, px: the circle plus two fixed waves. */
export function edgeRadius(a: number): number {
  return R + C.wobble[0] * Math.sin(a * C.waves[0] + 1.3) + C.wobble[1] * Math.sin(a * C.waves[1] + 4.1);
}

/** A fixed roll for sample `k` (taken round the circle), 0..1. */
const roll = (k: number): number => {
  const i = ((k % N) + N) % N;
  return Math.abs(Math.sin(i * 12.9898 + 4.233) * 43758.5453) % 1;
};

/** Repaints Region 1's edge where it crosses the rectangle (x0, y0, w, h). */
export function paintCircleEdge(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, outer: (tx: number, ty: number) => boolean): void {
  const pad = C.reach * T;
  const nearest = Math.hypot(Math.max(x0, Math.min(CX, x0 + w)) - CX, Math.max(y0, Math.min(CY, y0 + h)) - CY);
  const corners = [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]] as const;
  const farthest = Math.max(...corners.map(([x, y]) => Math.hypot(x - CX, y - CY)));
  if (nearest > R + pad || farthest < R - pad) return;
  // The samples whose angles cross the rectangle (unwrapped round ±π), with a margin.
  let angles = corners.map(([x, y]) => Math.atan2(y - CY, x - CX));
  if (Math.max(...angles) - Math.min(...angles) > Math.PI) angles = angles.map((a) => (a < 0 ? a + 2 * Math.PI : a));
  const k0 = Math.floor((Math.min(...angles) - pad / R) / STEP);
  const k1 = Math.ceil((Math.max(...angles) + pad / R) / STEP);
  const ring: { a: number; k: number; x: number; y: number }[] = [];
  for (let k = k0; k <= k1; k++) {
    const a = k * STEP;
    const r = edgeRadius(a);
    ring.push({ a, k, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
  }
  /** The band between the wobbling ring and the circle of radius `r`. */
  const band = (r: number) => {
    c.beginPath();
    for (const [i, p] of ring.entries()) {
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    for (let i = ring.length - 1; i >= 0; i--) {
      const a = ring[i]?.a ?? 0;
      c.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r);
    }
    c.closePath();
  };
  // The tiles along the circle, by ground: stone repaints the grass tiles' corners past the ring, grass the stone
  // tiles' corners inside it; the rest of each tile (its patches, cracks, slabs) is left as it was.
  const tiles = { inner: [] as [number, number][], outer: [] as [number, number][] };
  for (let ty = Math.floor((y0 - T) / T); ty <= Math.ceil((y0 + h + T) / T); ty++) {
    for (let tx = Math.floor((x0 - T) / T); tx <= Math.ceil((x0 + w + T) / T); tx++) {
      const d = Math.hypot((tx + 0.5) * T - CX, (ty + 0.5) * T - CY);
      if (Math.abs(d - R) > T * 1.5) continue;
      tiles[outer(tx, ty) ? 'outer' : 'inner'].push([tx, ty]);
    }
  }
  const fillIn = (list: readonly [number, number][], color: string, r: number) => {
    c.save();
    c.beginPath();
    for (const [tx, ty] of list) c.rect(tx * T - 0.5, ty * T - 0.5, T + 1, T + 1);
    c.clip();
    c.fillStyle = inkCss(color);
    band(r);
    c.fill();
    c.restore();
  };
  fillIn(tiles.inner, CLASS_COLOR.hollows, R + 2 * T);
  fillIn(tiles.outer, CLASS_COLOR.grass, R - 2 * T);
  c.save();
  c.beginPath();
  c.rect(x0 - T, y0 - T, w + 2 * T, h + 2 * T);
  c.clip();
  // A row of grass blobs along the ring, a few px either side of it, and stray tufts of each ground over the other.
  const stray: Record<'grass' | 'hollows', { x: number; y: number; r: number }[]> = { grass: [], hollows: [] };
  c.fillStyle = inkCss(CLASS_COLOR.grass);
  c.beginPath();
  for (const p of ring) {
    const k = roll(p.k);
    const r = C.blobRadius[0] + k * (C.blobRadius[1] - C.blobRadius[0]);
    const out = (roll(p.k + 7919) - 0.45) * r * 1.2;
    const x = p.x + Math.cos(p.a) * out;
    const y = p.y + Math.sin(p.a) * out;
    c.moveTo(x + r, y);
    c.arc(x, y, r, 0, Math.PI * 2);
    if (p.k % C.strayEvery !== 0) continue;
    const side = roll(p.k + 31) < 0.5 ? 1 : -1;
    const off = r + 3 + roll(p.k + 57) * C.strayOut;
    const sr = C.strayRadius[0] + roll(p.k + 91) * (C.strayRadius[1] - C.strayRadius[0]);
    const along = (roll(p.k + 13) - 0.5) * C.blobStep;
    stray[side > 0 ? 'grass' : 'hollows'].push({ x: p.x + Math.cos(p.a) * off * side - Math.sin(p.a) * along, y: p.y + Math.sin(p.a) * off * side + Math.cos(p.a) * along, r: sr });
  }
  c.fill();
  for (const [ground, list] of Object.entries(stray) as ['grass' | 'hollows', { x: number; y: number; r: number }[]][]) {
    c.fillStyle = inkCss(CLASS_COLOR[ground]);
    c.beginPath();
    for (const b of list) {
      c.moveTo(b.x + b.r, b.y);
      c.ellipse(b.x, b.y, b.r, b.r * 0.8, 0, 0, Math.PI * 2);
    }
    c.fill();
  }
  c.restore();
}
