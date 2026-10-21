import { TILE_SIZE } from '../../data/config';
import { HOLLOWS, inHollows } from '../../data/hollows';
import { HOLLOWS_GROUND } from '../../data/hollowsAssets';
import { GROUND } from '../../data/art/ground';
import { LANDMARK_LIST } from '../../data/landmarks';
import { TILE } from '../../data/rooms';
import { inkCss } from '../vector/draw';

// Stonefall Hollows' ground (034), painted into the overworld's ground chunks over the
// grass: grey-blue quarry stone in slabs, rust stains, cracks and glinting cyan veins,
// the quarry-cut terraces as raised cut slabs, and flagstones on the Cistern Terrace and
// the Sunken Forum's floor. Pure canvas in world px, like ground.ts.

const T = TILE_SIZE;
const G = HOLLOWS_GROUND;

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

/** Flagstoned areas: the Cistern Terrace and the forum's floor. */
const FLAGGED = [...LANDMARK_LIST.filter((l) => l.look?.paving).map((l) => l.area), HOLLOWS.arena.inside];
const flagged = (tx: number, ty: number): boolean => FLAGGED.some((r) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1);

/** Paints the Hollows' ground; `each` walks the chunk's tiles with their hash, `symbol` reads the map. */
export function paintHollows(
  c: CanvasRenderingContext2D,
  each: (fn: (tx: number, ty: number, hash: number) => void) => void,
  symbol: (tx: number, ty: number) => string | undefined,
  plateau: (tx: number, ty: number) => boolean,
): void {
  each((tx, ty, hash) => {
    if (!inHollows(tx, ty)) return;
    const x = tx * T;
    const y = ty * T;
    // 053: the world's cliff edge past its face, flat plateau stone with a crack now and then.
    if (plateau(tx, ty)) {
      fill(c, GROUND.plateau, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
      if (hash % G.crackEvery === 1) line(c, [x + 4, y + 8 + (hash % 9), x + 14, y + 12, x + 22 + (hash % 6), y + 9], 1, GROUND.plateauEdge, 0.5);
      return;
    }
    fill(c, G.base, 1, () => c.rect(x - 0.5, y - 0.5, T + 1, T + 1));
    if (hash % G.slabEvery === 0) fill(c, (hash >>> 7) % 2 ? G.slabLight : G.slabDark, G.slabAlpha, () => c.roundRect(x + 2 + ((hash >>> 3) % 6), y + 3 + ((hash >>> 5) % 6), 18 + ((hash >>> 9) % 8), 12 + ((hash >>> 11) % 6), 2));
    if (hash % G.rustEvery === 2) fill(c, G.rust, G.rustAlpha, () => c.ellipse(x + 16, y + 18, 10, 5, 0, 0, Math.PI * 2));
    if (hash % G.crackEvery === 1) line(c, [x + 4, y + 8 + (hash % 9), x + 14, y + 12, x + 22 + (hash % 6), y + 9], 0.8, G.crack, 0.45);
    if (hash % G.veinEvery === 3) {
      const pts = [x + 5, y + 22, x + 12, y + 17, x + 19, y + 19, x + 27, y + 12];
      line(c, pts, 2.2, G.veinDeep, 0.5);
      line(c, pts, 0.9, G.vein, 0.85);
    }
    const s = symbol(tx, ty);
    if (s === TILE.terrace) {
      // A raised cut slab: its lit top, and the dark step along its front where the ground below shows.
      fill(c, G.terrace.top, G.terrace.alpha, () => c.rect(x, y, T, T - 5));
      if (symbol(tx, ty + 1) !== TILE.terrace) fill(c, G.terrace.step, G.terrace.alpha, () => c.rect(x, y + T - 6, T, 6));
    } else if (flagged(tx, ty) && (s === TILE.floor || s === TILE.path) && hash % G.flags.gapEvery !== 0) {
      fill(c, G.flags.color, G.flags.alpha, () => c.roundRect(x + 2, y + 2, T - 4, T - 4, 3));
      line(c, [x + 2, y + T - 2, x + T - 2, y + T - 2], 1, G.flags.edge, G.flags.alpha);
    }
  });
}
