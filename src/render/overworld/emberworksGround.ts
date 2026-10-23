import { TILE_SIZE } from '../../data/config';
import { EMBERWORKS, inEmberworks } from '../../data/emberworks';
import { EMBERWORKS_GROUND } from '../../data/emberworksAssets';
import { GROUND } from '../../data/art/ground';
import { TILE } from '../../data/rooms';
import { bearingOf, fromCentre, WORLD_SHAPE } from '../../data/worldShape';
import { inkCss } from '../vector/draw';

// The Emberworks' ground (060), painted into the overworld's ground chunks over the grass: warm ash in slabs with
// cinder specks, rust glow pooling, cracks and now and then a glinting cyan vein; ash terraces as raised cut steps;
// the plateau past its edge as soot-dark stone; and every ramp's stone steps climbing up through the cliffs (the
// Hollows' end of them too). Pure canvas in world px, like ground.ts.

const T = TILE_SIZE;
const G = EMBERWORKS_GROUND;
/** Where the Emberworks' own ground starts: the cliff edge between the rings is the Hollows' plateau stone. */
const FOOT = EMBERWORKS.radii.inner + EMBERWORKS.wall;

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

/** The ramp a tile is on: the one whose bearing is nearest the tile's. */
function rampBearing(tx: number, ty: number): number {
  const b = bearingOf(tx, ty);
  const off = (r: number) => Math.abs((((b - r) % 360) + 540) % 360 - 180);
  return EMBERWORKS.ramps.reduce((best, r) => (off(r.bearing) < off(best) ? r.bearing : best), EMBERWORKS.ramps[0]?.bearing ?? 0);
}

/** A ramp tile: a pale cut slab, and risers across the climb every `step` px, lined up from tile to tile. */
function ramp(c: CanvasRenderingContext2D, tx: number, ty: number): void {
  const R = G.ramp;
  const x = tx * T;
  const y = ty * T;
  fill(c, R.slab, R.alpha, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
  const a = (rampBearing(tx, ty) * Math.PI) / 180;
  // Up the ramp (outward), and across it.
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const cx = (WORLD_SHAPE.centre.tx + 0.5) * T;
  const cy = (WORLD_SHAPE.centre.ty + 0.5) * T;
  const mx = x + T / 2;
  const my = y + T / 2;
  const along = (mx - cx) * ux + (my - cy) * uy;
  c.save();
  c.beginPath();
  c.rect(x, y, T, T);
  c.clip();
  for (let s = Math.floor((along - T) / R.step) * R.step; s <= along + T; s += R.step) {
    const px = mx + (s - along) * ux;
    const py = my + (s - along) * uy;
    line(c, [px - uy * T, py + ux * T, px + uy * T, py - ux * T], 1.2, R.riser, R.riserAlpha);
  }
  c.restore();
}

/** Paints the Emberworks' ground and the ramps; `each` walks the chunk's tiles with their hash, `symbol` reads the map. */
export function paintEmberworks(
  c: CanvasRenderingContext2D,
  each: (fn: (tx: number, ty: number, hash: number) => void) => void,
  symbol: (tx: number, ty: number) => string | undefined,
  plateau: (tx: number, ty: number) => boolean,
): void {
  each((tx, ty, hash) => {
    const s = symbol(tx, ty);
    if (s === TILE.ramp) {
      ramp(c, tx, ty);
      return;
    }
    if (!inEmberworks(tx, ty)) return;
    const x = tx * T;
    const y = ty * T;
    if (plateau(tx, ty)) {
      const foot = fromCentre(tx, ty) < FOOT;
      fill(c, foot ? GROUND.plateau : G.plateau, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
      if (hash % G.crackEvery === 1) line(c, [x + 4, y + 8 + (hash % 9), x + 14, y + 12, x + 22 + (hash % 6), y + 9], 1, foot ? GROUND.plateauEdge : G.plateauEdge, 0.4);
      return;
    }
    fill(c, G.base, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
    if (hash % G.patchEvery === 0) fill(c, G.patch, G.patchAlpha, () => c.roundRect(x + 2 + ((hash >>> 3) % 6), y + 3 + ((hash >>> 5) % 6), 16 + ((hash >>> 9) % 10), 11 + ((hash >>> 11) % 6), 3));
    if (hash % G.glowEvery === 2) fill(c, G.glow, G.glowAlpha, () => c.ellipse(x + 16, y + 18, 13, 7, 0, 0, Math.PI * 2));
    if (hash % G.crackEvery === 1) line(c, [x + 4, y + 8 + (hash % 9), x + 14, y + 12, x + 22 + (hash % 6), y + 9], 0.8, G.crack, 0.45);
    if (hash % G.speckEvery === 0) fill(c, G.speck, G.speckAlpha, () => c.ellipse(x + 4 + ((hash >>> 6) % 24), y + 4 + ((hash >>> 10) % 24), 0.9, 0.9, 0, 0, Math.PI * 2));
    if (hash % G.veinEvery === 3) {
      const pts = [x + 5, y + 22, x + 12, y + 17, x + 19, y + 19, x + 27, y + 12];
      line(c, pts, 2.2, G.veinDeep, 0.5);
      line(c, pts, 0.9, G.vein, 0.85);
    }
    if (s === TILE.terrace) {
      fill(c, G.terrace.top, G.terrace.alpha, () => c.rect(x, y, T, T - 5));
      if (symbol(tx, ty + 1) !== TILE.terrace) fill(c, G.terrace.step, G.terrace.alpha, () => c.rect(x, y + T - 6, T, 6));
    }
  });
}
