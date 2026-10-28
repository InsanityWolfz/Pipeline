import { GROUND, GROUND_BLEND } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import type { TilePos } from '../../data/tiles';
import { worldTileHash } from '../roomTiles';
import { inkCss } from '../vector/draw';
import { CLASS_COLOR, groundClass, push } from './groundBlend';
import { pathStrokes } from './pathStrokes';

// 074: worn paths. Over 059's joined dirt (its outline and width unchanged): a darker trodden centre, the ground on
// either side creeping in over its edges, and a scatter of pebbles lit on top. Only the stretches near the chunk are
// walked, and every mark's look comes from a hash of where it lies, so chunks agree where they meet.

const W = GROUND.pathWidth;
const P = GROUND_BLEND.path;
const T = TILE_SIZE;

type Pt = readonly [number, number];

const roll = (x: number, y: number, salt: number): number => ((worldTileHash(Math.round(x * 3) + salt * 977, Math.round(y * 3) - salt * 613) >>> 4) % 1000) / 1000;

/** The distance from a point to the segment a–b, px. */
function toSegment(x: number, y: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}

/** Paints the wear on every road stretch near the rectangle (x0, y0, w, h); `symbol` and `plateau` say what ground lies beside. */
export function paintPathWear(
  c: CanvasRenderingContext2D,
  paths: readonly (readonly TilePos[])[],
  rect: { x0: number; y0: number; w: number; h: number },
  symbol: (tx: number, ty: number) => string | undefined,
  plateau: (tx: number, ty: number) => boolean,
): void {
  const pad = W;
  const near = (a: Pt, b: Pt) => Math.max(a[0], b[0]) >= rect.x0 - pad && Math.min(a[0], b[0]) <= rect.x0 + rect.w + pad && Math.max(a[1], b[1]) >= rect.y0 - pad && Math.min(a[1], b[1]) <= rect.y0 + rect.h + pad;
  const lines = pathStrokes(paths).filter((s) => s.color === GROUND.path).map((s) => s.pts);
  const segs: [Pt, Pt][] = lines.flatMap((pts) => pts.slice(1).map((b, i): [Pt, Pt] => [pts[i] ?? b, b])).filter(([a, b]) => near(a, b));
  if (segs.length === 0) return;
  const half = W / 2 - 1;
  const onDirt = (x: number, y: number) =>
    segs.some(([a, b]) => x > Math.min(a[0], b[0]) - half && x < Math.max(a[0], b[0]) + half && y > Math.min(a[1], b[1]) - half && y < Math.max(a[1], b[1]) + half && toSegment(x, y, a, b) < half);
  const inRect = (x: number, y: number) => x > rect.x0 - 12 && x < rect.x0 + rect.w + 12 && y > rect.y0 - 12 && y < rect.y0 + rect.h + 12;
  // The trodden centre, one stroke over every stretch so crossings aren't darker.
  c.globalAlpha = P.centreAlpha;
  c.strokeStyle = inkCss(P.centreColor);
  c.lineWidth = W * P.centre;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  for (const [a, b] of segs) {
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
  }
  c.stroke();
  c.globalAlpha = 1;
  // The ground creeping in at each edge, in the colour of the ground beside it; none where another road's dirt is.
  const creep = new Map<string, { x: number; y: number; r: number }[]>();
  const pebbles: { x: number; y: number; r: number }[] = [];
  for (const [a, b] of segs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len === 0) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    for (let s = 0; s < len; s += P.creepStep) {
      const px = a[0] + ux * s;
      const py = a[1] + uy * s;
      // Only marks that can reach this chunk.
      if (!inRect(px - uy * W, py + ux * W) && !inRect(px + uy * W, py - ux * W) && !inRect(px, py)) continue;
      for (const side of [-1, 1]) {
        const off = W / 2 + 2 - roll(px, py, side + 3) * P.creepIn;
        const x = px - uy * side * off;
        const y = py + ux * side * off;
        if (onDirt(x - uy * side * 4, y + ux * side * 4)) continue;
        const color = CLASS_COLOR[groundClass(Math.floor(x / T - uy * side), Math.floor(y / T + ux * side), symbol, plateau)];
        const r = P.creepRadius[0] + roll(x, y, 9) * (P.creepRadius[1] - P.creepRadius[0]);
        push(creep, color, [{ x, y, r }]);
      }
      if (s % P.pebbleStep < P.creepStep && roll(px, py, 21) < 0.6) {
        const across = (roll(px, py, 22) - 0.5) * (W - 14);
        pebbles.push({ x: px - uy * across, y: py + ux * across, r: 0.9 + roll(px, py, 23) * 1.2 });
      }
    }
  }
  for (const [color, blobs] of creep) {
    c.fillStyle = inkCss(color);
    c.beginPath();
    for (const p of blobs) {
      c.moveTo(p.x + p.r, p.y);
      c.ellipse(p.x, p.y, p.r, p.r * 0.75, 0, 0, Math.PI * 2);
    }
    c.fill();
  }
  const [lit, shade] = P.pebble;
  for (const [color, dx, dy] of [[shade, 0.4, 0.5], [lit, 0, 0]] as const) {
    c.fillStyle = inkCss(color);
    c.beginPath();
    for (const p of pebbles) {
      c.moveTo(p.x + dx + p.r, p.y + dy);
      c.ellipse(p.x + dx, p.y + dy, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
    }
    c.fill();
  }
}
