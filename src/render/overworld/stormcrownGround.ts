import { TILE_SIZE } from '../../data/config';
import { EMBERWORKS_GROUND } from '../../data/emberworksAssets';
import { TILE } from '../../data/rooms';
import { inStormcrown, STORMCROWN } from '../../data/stormcrown';
import { STORMCROWN_GROUND } from '../../data/stormcrownAssets';
import { fromCentre } from '../../data/worldShape';
import { inkCss } from '../vector/draw';

// The Stormcrown's ground (064), painted into the overworld's ground chunks over the grass: wind-scoured slate in
// scored slabs with pale grit streaks along the wind, a slate-violet glow pooling, cracks and now and then a glinting
// cyan vein; chasms as dark rifts with a violet glow deep down; the plateau past its edge as storm-dark stone (the cliff
// edge between the rings is the Emberworks' soot stone). The ramps are emberworksGround.ts'. Pure canvas in world px.

const T = TILE_SIZE;
const G = STORMCROWN_GROUND;
/** Where the Stormcrown's own ground starts: the cliff edge between the rings is the Emberworks' plateau stone. */
const FOOT = STORMCROWN.radii.inner + STORMCROWN.wall;

const fill = (c: CanvasRenderingContext2D, color: string, alpha: number, draw: () => void): void => {
  c.globalAlpha = alpha;
  c.fillStyle = inkCss(color);
  c.beginPath();
  draw();
  c.fill();
  c.globalAlpha = 1;
};

const line = (c: CanvasRenderingContext2D, pts: readonly number[], width: number, color: string, alpha: number): void => {
  c.globalAlpha = alpha;
  c.strokeStyle = inkCss(color);
  c.lineWidth = width;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const x = pts[i] ?? 0;
    const y = pts[i + 1] ?? 0;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.globalAlpha = 1;
};

/** A chasm tile: a dark rift, its north face in slate, its lip pale where rock lies north, a violet glow far down. */
function chasm(c: CanvasRenderingContext2D, tx: number, ty: number, hash: number, symbol: (tx: number, ty: number) => string | undefined): void {
  const C = G.chasm;
  const x = tx * T;
  const y = ty * T;
  fill(c, C.depth, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
  const north = symbol(tx, ty - 1) !== TILE.chasm;
  if (north) {
    fill(c, C.wall, 1, () => c.rect(x - 0.5, y, T + 1, 10));
    line(c, [x, y + 1, x + T, y + 1], 1.4, C.lip, 0.7);
  }
  if (hash % 3 === 0) fill(c, C.glow, C.glowAlpha, () => c.ellipse(x + 16, y + 22, 12, 5, 0, 0, Math.PI * 2));
}

/** Paints the Stormcrown's ground; `each` walks the chunk's tiles with their hash, `symbol` reads the map. */
export function paintStormcrown(
  c: CanvasRenderingContext2D,
  each: (fn: (tx: number, ty: number, hash: number) => void) => void,
  symbol: (tx: number, ty: number) => string | undefined,
  plateau: (tx: number, ty: number) => boolean,
): void {
  each((tx, ty, hash) => {
    const s = symbol(tx, ty);
    if (s === TILE.ramp || !inStormcrown(tx, ty)) return;
    const x = tx * T;
    const y = ty * T;
    if (plateau(tx, ty)) {
      const foot = fromCentre(tx, ty) < FOOT;
      fill(c, foot ? EMBERWORKS_GROUND.plateau : G.plateau, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
      if (hash % G.crackEvery === 1) line(c, [x + 4, y + 8 + (hash % 9), x + 14, y + 12, x + 22 + (hash % 6), y + 9], 1, G.plateauEdge, 0.4);
      return;
    }
    fill(c, G.base, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
    // A wind-cut slab: a long low sliver slanting with the wind, of its own length and lift.
    if (hash % G.patchEvery === 0) {
      const px = x + ((hash >>> 3) % 8) - 4;
      const py = y + 8 + ((hash >>> 5) % 14);
      const len = 18 + ((hash >>> 9) % 16);
      const h = 4 + ((hash >>> 11) % 4);
      fill(c, G.patch, G.patchAlpha, () => {
        c.moveTo(px, py + h);
        c.lineTo(px + 4, py);
        c.lineTo(px + len, py - 4);
        c.lineTo(px + len - 3, py + h - 3);
        c.closePath();
      });
    }
    if (hash % G.glowEvery === 2) fill(c, G.glow, G.glowAlpha, () => c.ellipse(x + 16, y + 16, 14, 8, 0, 0, Math.PI * 2));
    if (hash % G.crackEvery === 1) line(c, [x + 3, y + 10 + (hash % 9), x + 15, y + 13, x + 26 + (hash % 5), y + 11], 0.8, G.crack, 0.5);
    // Grit along the wind: short pale streaks, slanting the same way everywhere.
    if (hash % G.streakEvery === 0) {
      const sx = x + 2 + ((hash >>> 6) % 18);
      const sy = y + 4 + ((hash >>> 10) % 24);
      line(c, [sx, sy, sx + 10, sy - 3], 0.9, G.streak, G.streakAlpha);
    }
    if (hash % G.veinEvery === 3) {
      const pts = [x + 4, y + 20, x + 11, y + 15, x + 19, y + 18, x + 28, y + 11];
      line(c, pts, 2.2, G.veinDeep, 0.5);
      line(c, pts, 0.9, G.vein, 0.85);
    }
    if (s === TILE.chasm) chasm(c, tx, ty, hash, symbol);
  });
}
