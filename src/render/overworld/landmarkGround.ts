import { TILE_SIZE } from '../../data/config';
import { LANDMARK_LIST } from '../../data/landmarks';
import { LANDMARK_LOOK } from '../../data/landmarkAssets';
import { TILE } from '../../data/rooms';
import { inkCss } from '../vector/draw';

// The landmarks' ground (032), painted into the overworld's ground chunks after 029's
// frost: a sunken basin over each grotto hollow (darker, with a rocky rim; pale and icy
// over the Frozen Grotto), warm sun on the Old Grove's grass, and damp ground round the
// marsh's ponds. Pure canvas in world px, like ground.ts.

const T = TILE_SIZE;

function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | null, alpha: number, stroke?: { color: string; width: number }): void {
  c.globalAlpha = alpha;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = inkCss(fill);
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = inkCss(stroke.color);
    c.lineWidth = stroke.width;
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** Paints every landmark's ground; `each` walks the chunk's tiles with their hash, `symbol` reads the map. */
export function paintLandmarks(c: CanvasRenderingContext2D, each: (fn: (tx: number, ty: number, hash: number) => void) => void, symbol: (tx: number, ty: number) => string | undefined): void {
  const H = LANDMARK_LOOK.hollow;
  for (const l of LANDMARK_LIST) {
    const a = l.area;
    const cx = ((a.x0 + a.x1 + 1) / 2) * T;
    const cy = ((a.y0 + a.y1 + 1) / 2) * T;
    if (l.look?.hollow) {
      const rx = ((a.x1 - a.x0 + 1) / 2 - H.inset) * T;
      const ry = ((a.y1 - a.y0 + 1) / 2 - H.inset) * T;
      const frozen = l.look.hollow === 'frost';
      // The basin, sinking toward its middle, and the rim's shadowed rock.
      ellipse(c, cx, cy, rx, ry, H.basin.color, H.basin.alpha);
      ellipse(c, cx, cy + ry * H.inner.dy, rx * H.inner.size[0], ry * H.inner.size[1], H.basin.color, H.basin.alpha);
      if (frozen) ellipse(c, cx, cy, rx * H.frost.size[0], ry * H.frost.size[1], H.frost.basin, H.frost.alpha);
      ellipse(c, cx, cy, rx, ry, null, H.rim.alpha, { color: H.rim.color, width: H.rim.width });
    }
    if (l.look?.trees === 'old') {
      const G = LANDMARK_LOOK.grove;
      each((tx, ty, hash) => {
        if (tx < a.x0 || tx > a.x1 || ty < a.y0 || ty > a.y1 || symbol(tx, ty) !== TILE.floor || hash % G.every !== 0) return;
        ellipse(c, (tx + 0.5) * T + ((hash >>> 5) % G.jitter) - G.jitter / 2, (ty + 0.5) * T, G.rx, G.ry, G.sun, G.alpha);
      });
    }
    for (const f of l.features) {
      if (f.kind !== 'pond') continue;
      const M = LANDMARK_LOOK.marsh;
      ellipse(c, (f.cx + 0.5) * T, (f.cy + 0.5) * T, f.rx * T * M.mudSize[0], f.ry * T * M.mudSize[1], M.mud, M.mudAlpha);
    }
  }
}
