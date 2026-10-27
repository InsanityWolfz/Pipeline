import { GROUND, GROUND_BLEND, type GroundClass } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import { EMBERWORKS_GROUND } from '../../data/emberworksAssets';
import { inEmberworks } from '../../data/emberworks';
import { inHollows } from '../../data/hollows';
import { HOLLOWS_GROUND } from '../../data/hollowsAssets';
import { TILE } from '../../data/rooms';
import { inStormcrown } from '../../data/stormcrown';
import { STORMCROWN_GROUND } from '../../data/stormcrownAssets';
import { worldTileHash } from '../roomTiles';
import { inkCss } from '../vector/draw';

// 074: the ground's blending and variation (GROUND_BLEND), painted into the overworld's chunks as they're baked: soft
// ragged edges where two grounds meet, broad soft patches, cracks with a lit lip, and worn paths. Every mark comes from
// a fixed hash of its tile, so a chunk looks the same each time it's built and marks crossing chunk edges match. The
// pure parts (which ground a tile is, its edge blobs, its crack) are exported for tests.

const T = TILE_SIZE;
const B = GROUND_BLEND;

type Symbol = (tx: number, ty: number) => string | undefined;
type Each = (fn: (tx: number, ty: number, hash: number) => void) => void;

/** Each ground's own colour, the one that creeps over an edge. */
export const CLASS_COLOR: Readonly<Record<GroundClass, string>> = {
  grass: GROUND.base,
  hollows: HOLLOWS_GROUND.base,
  ember: EMBERWORKS_GROUND.base,
  storm: STORMCROWN_GROUND.base,
  slag: EMBERWORKS_GROUND.slag.crust,
  chasm: STORMCROWN_GROUND.chasm.depth,
  plateau: GROUND.plateau,
};

/** Which ground a tile is: plateau stone, ramps and bridges keep their own crisp edges. */
export function groundClass(tx: number, ty: number, symbol: Symbol, plateau: (tx: number, ty: number) => boolean): GroundClass {
  const s = symbol(tx, ty);
  if (plateau(tx, ty) || s === TILE.ramp || s === TILE.bridge) return 'plateau';
  if (s === TILE.slag) return 'slag';
  if (s === TILE.chasm) return 'chasm';
  if (inStormcrown(tx, ty)) return 'storm';
  if (inEmberworks(tx, ty)) return 'ember';
  if (inHollows(tx, ty)) return 'hollows';
  return 'grass';
}

/** A blob of paint: centre and radius, px. */
export interface Blob {
  x: number;
  y: number;
  r: number;
}

/** A second hash from a tile's, for independent rolls. */
const roll = (hash: number, salt: number): number => (((hash ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0) % 1000) / 1000;

const SIDES = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
] as const;

/** The blobs a neighbour's ground pushes into tile (tx, ty) across the edge they share on side (dx, dy). */
export function edgeBlobs(tx: number, ty: number, dx: number, dy: number, hash: number): Blob[] {
  const E = B.edge;
  const out: Blob[] = [];
  for (let k = 0; k < E.blobs; k++) {
    const along = ((k + 0.5) / E.blobs + (roll(hash, k * 4 + dx * 2 + dy) - 0.5) / E.blobs) * T;
    const into = roll(hash, k * 4 + 17 + dy) * E.depth;
    const r = E.radius[0] + roll(hash, k * 4 + 31 + dx) * (E.radius[1] - E.radius[0]);
    // The shared edge runs along the tile's side; `into` moves the blob from it into the tile.
    const x = dx === 0 ? tx * T + along : dx < 0 ? tx * T + into : (tx + 1) * T - into;
    const y = dy === 0 ? ty * T + along : dy < 0 ? ty * T + into : (ty + 1) * T - into;
    out.push({ x, y, r });
  }
  return out;
}

/** The ground whose cracks a tile takes ('paving' on Region 1's paving), or null for none (grass, slag, chasms, plateau). */
export function crackGround(cls: GroundClass, paved: boolean): GroundClass | 'paving' | null {
  if (cls === 'grass') return paved ? 'paving' : null;
  return B.cracks.every[cls] ? cls : null;
}

/** A tile's crack, if it has one: a jagged line of points across part of it (and a short branch), px. */
export function crackOf(tx: number, ty: number, hash: number, ground: GroundClass | 'paving'): number[][] {
  const every = B.cracks.every[ground];
  if (!every || (hash >>> 3) % every !== 0) return [];
  let x = tx * T + 4 + roll(hash, 1) * (T - 8);
  let y = ty * T + 4 + roll(hash, 2) * (T - 8);
  let a = roll(hash, 3) * Math.PI * 2;
  const main = [x, y];
  for (let i = 0; i < 4; i++) {
    a += (roll(hash, 10 + i) - 0.5) * 1.4;
    const len = 4 + roll(hash, 20 + i) * 5;
    x += Math.cos(a) * len;
    y += Math.sin(a) * len;
    main.push(x, y);
  }
  const mx = main[4] ?? x;
  const my = main[5] ?? y;
  const b = a + (roll(hash, 40) > 0.5 ? 1 : -1) * (0.8 + roll(hash, 41) * 0.6);
  return [main, [mx, my, mx + Math.cos(b) * 5, my + Math.sin(b) * 5]];
}

function stroke(c: CanvasRenderingContext2D, lines: readonly number[][], width: number, color: string, alpha: number, dx = 0, dy = 0): void {
  c.globalAlpha = alpha;
  c.strokeStyle = inkCss(color);
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  for (const pts of lines) {
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const px = (pts[i] ?? 0) + dx;
      const py = (pts[i + 1] ?? 0) + dy;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
  }
  c.stroke();
  c.globalAlpha = 1;
}

/** Adds items to a map's list (made on first use). */
export function push<K, V>(map: Map<K, V[]>, key: K, items: readonly V[]): void {
  const list = map.get(key);
  if (list) list.push(...items);
  else map.set(key, [...items]);
}

/** Soft edges, then cracks, over the regions' ground (before the paths, ponds and ley lines go over it). */
export function paintBlend(c: CanvasRenderingContext2D, each: Each, symbol: Symbol, plateau: (tx: number, ty: number) => boolean, paved: (tx: number, ty: number) => boolean): void {
  const cls = (tx: number, ty: number) => groundClass(tx, ty, symbol, plateau);
  // One path per spilling ground, filled once, so overlapping blobs are one even wash.
  const spills = new Map<GroundClass, Blob[]>();
  const cracks = new Map<GroundClass | 'paving', number[][]>();
  each((tx, ty, hash) => {
    const here = cls(tx, ty);
    for (const s of SIDES) {
      const there = cls(tx + s.dx, ty + s.dy);
      if (there === here || !B.edge.pairs.some((p) => p.spill === there && p.into === here)) continue;
      push(spills, there, edgeBlobs(tx, ty, s.dx, s.dy, hash));
    }
    const ground = crackGround(here, paved(tx, ty));
    if (ground) push(cracks, ground, crackOf(tx, ty, hash, ground));
  });
  for (const [ground, blobs] of spills) {
    c.fillStyle = inkCss(CLASS_COLOR[ground]);
    c.beginPath();
    for (const b of blobs) {
      c.moveTo(b.x + b.r, b.y);
      c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    }
    c.fill();
  }
  const K = B.cracks;
  for (const [ground, lines] of cracks) {
    const [dark, lit] = K.colors[ground] ?? ['ink', 'snow'];
    // The lower-right lip faces the light (from the top left): a thin lit line just off the groove.
    stroke(c, lines, K.width * 0.8, lit, K.lipAlpha, K.lip, K.lip);
    stroke(c, lines, K.width, dark, K.alpha);
  }
}

/** Broad soft patches of lighter and darker ground, in each region's colours. Patches reach past the chunk's tile margin, so they walk a wider one. */
export function paintPatches(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, symbol: Symbol, plateau: (tx: number, ty: number) => boolean): void {
  const P = B.patches;
  const reach = P.radius[1] + 1;
  for (let ty = Math.floor(y0 / T) - reach; ty <= Math.ceil((y0 + h) / T) + reach; ty++) {
    for (let tx = Math.floor(x0 / T) - reach; tx <= Math.ceil((x0 + w) / T) + reach; tx++) {
      const hash = worldTileHash(tx, ty);
      if ((hash >>> 5) % P.every !== 0) continue;
      const colors = P.colors[groundClass(tx, ty, symbol, plateau)];
      if (!colors) continue;
      const r = (P.radius[0] + roll(hash, 7) * (P.radius[1] - P.radius[0])) * T;
      const x = (tx + 0.5) * T;
      const y = (ty + 0.5) * T;
      const color = colors[(hash >>> 11) % 2] ?? colors[0];
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, inkCss({ id: color, alpha: P.alpha }));
      g.addColorStop(0.6, inkCss({ id: color, alpha: P.alpha * 0.6 }));
      g.addColorStop(1, inkCss({ id: color, alpha: 0 }));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** A soft pool of colour: an ellipse whose alpha fades from `alpha` at its middle to nothing at its edge. */
export function softPool(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, inkCss({ id: color, alpha }));
  g.addColorStop(1, inkCss({ id: color, alpha: 0 }));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, rx, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
