import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { OVERWORLD } from '../../data/overworld';
import { TILE, type Room } from '../../data/rooms';
import { inkCss } from '../vector/draw';
import { tileHash } from '../roomTiles';

// The overworld's ground (017), drawn once into chunk textures: grass with lighter
// and darker patches, sun dapple under the groves, worn paving in the ruins, dirt
// paths, ponds with sandy rims and shallows, glowing ley seams, tufts and flowers.
// Pure canvas in world px: the caller sets the transform for its chunk.

const T = TILE_SIZE;
const centre = (t: { tx: number; ty: number }): [number, number] => [(t.tx + 0.5) * T, (t.ty + 0.5) * T];

function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha = 1): void {
  c.globalAlpha = alpha;
  c.fillStyle = inkCss(color);
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

function polyline(c: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], width: number, color: string, alpha = 1): void {
  const first = pts[0];
  if (!first) return;
  c.globalAlpha = alpha;
  c.strokeStyle = inkCss(color);
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(first[0], first[1]);
  for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
  c.stroke();
  c.globalAlpha = 1;
}

const inRect = (r: { x0: number; y0: number; x1: number; y1: number }, tx: number, ty: number): boolean => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;

/** Draws the ground under the world rectangle (x0, y0, w, h), with tiles a margin around it so blobs cross chunk edges seamlessly. */
export function drawGround(c: CanvasRenderingContext2D, room: Room, x0: number, y0: number, w: number, h: number, pxPerUnit: number): void {
  const symbol = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
  const margin = 3;
  const tx0 = Math.max(0, Math.floor(x0 / T) - margin);
  const ty0 = Math.max(0, Math.floor(y0 / T) - margin);
  const tx1 = Math.min((room.rows[0]?.length ?? 0) - 1, Math.ceil((x0 + w) / T) + margin);
  const ty1 = Math.min(room.rows.length - 1, Math.ceil((y0 + h) / T) + margin);
  const each = (fn: (tx: number, ty: number, hash: number) => void): void => {
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) fn(tx, ty, tileHash(tx, ty));
  };

  c.fillStyle = inkCss(GROUND.base);
  c.fillRect(x0, y0, w, h);
  // Patches of lighter and darker grass, and forest floor under the trees.
  each((tx, ty, hash) => {
    const [x, y] = centre({ tx, ty });
    if (symbol(tx, ty) === TILE.tree) ellipse(c, x, y + 4, 22, 14, GROUND.forest, 0.5);
    else if (hash % GROUND.patchEvery === 0) {
      const r = GROUND.patchRadius[0] + (hash >>> 8) % (GROUND.patchRadius[1] - GROUND.patchRadius[0]);
      ellipse(c, x + ((hash >>> 4) % 24) - 12, y, r, r * 0.55, (hash >>> 12) % 2 ? GROUND.patchDark : GROUND.patchLight, 0.6);
    }
  });
  // Sun dapple where the groves meet open grass.
  each((tx, ty, hash) => {
    if (symbol(tx, ty) !== TILE.floor || hash % GROUND.dappleEvery !== 0) return;
    const nearTree = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => symbol(tx + dx, ty + dy) === TILE.tree);
    if (!nearTree) return;
    const [x, y] = centre({ tx, ty });
    ellipse(c, x, y, 18, 7, GROUND.sun, 0.55);
  });
  // Worn paving: the shrine site's floor and the ruin field round the stairs.
  const paved = [OVERWORLD.shrine.area, GROUND.fieldPaving];
  each((tx, ty, hash) => {
    if (!paved.some((r) => inRect(r, tx, ty)) || hash % GROUND.pavingGapEvery === 0) return;
    const s = symbol(tx, ty);
    if (s !== TILE.floor && s !== TILE.path) return;
    c.globalAlpha = GROUND.pavingAlpha;
    c.fillStyle = inkCss(GROUND.paving);
    c.beginPath();
    c.roundRect(tx * T + 2, ty * T + 2, T - 4, T - 4, 3);
    c.fill();
    c.globalAlpha = 1;
  });
  // Dirt paths, two tiles wide along their polylines.
  for (const p of room.terrain?.paths ?? []) {
    const pts = p.map((t) => [(t.tx + 1) * T, (t.ty + 1) * T] as const);
    polyline(c, pts, GROUND.pathWidth + 6, GROUND.pathEdge);
    polyline(c, pts, GROUND.pathWidth, GROUND.path);
  }
  each((tx, ty, hash) => {
    if (symbol(tx, ty) !== TILE.path || hash % 3 !== 0) return;
    const [x, y] = centre({ tx, ty });
    ellipse(c, x + ((hash >>> 5) % 20) - 10, y + ((hash >>> 9) % 14) - 7, 2.2, 1.4, GROUND.pathFleck);
  });
  // Ponds: a sandy rim, the shallows, deep water, and the light on it.
  for (const p of room.terrain?.ponds ?? []) {
    const [x, y] = centre({ tx: p.cx, ty: p.cy });
    const rx = p.rx * T;
    const ry = p.ry * T;
    ellipse(c, x, y, rx * 1.5, ry * 1.5, GROUND.sand);
    ellipse(c, x, y, rx * 1.36, ry * 1.36, GROUND.shallows);
    ellipse(c, x, y + 2, rx * 1.02, ry * 1.02, GROUND.water);
    ellipse(c, x - rx * 0.1, y - ry * 0.1, rx * 0.72, ry * 0.68, GROUND.deep);
    ellipse(c, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.12, GROUND.foam, 0.8);
    ellipse(c, x + rx * 0.3, y + ry * 0.3, rx * 0.18, ry * 0.07, GROUND.foam, 0.6);
  }
  // Ley seams glowing in the ground, running to the stairs.
  c.save();
  c.shadowColor = inkCss(GROUND.ley);
  c.shadowBlur = 6 * pxPerUnit;
  for (const seam of GROUND.leySeams) {
    // A crack in the ground, not a beam: jagged between its points, deep cyan with a thin bright core.
    const pts: [number, number][] = [];
    seam.forEach((t, i) => {
      const [x, y] = centre(t);
      const next = seam[i + 1];
      pts.push([x, y]);
      if (!next) return;
      const [nx, ny] = centre(next);
      const steps = Math.max(1, Math.round(Math.hypot(nx - x, ny - y) / GROUND.leyStep));
      for (let k = 1; k < steps; k++) {
        const jag = ((tileHash(i * 31 + k, k * 7 + i) % 9) - 4) * GROUND.leyJag;
        pts.push([x + ((nx - x) * k) / steps + jag, y + ((ny - y) * k) / steps - jag]);
      }
    });
    polyline(c, pts, 3, GROUND.leyDeep, 0.55);
    polyline(c, pts, 1.1, GROUND.ley, 0.75);
  }
  c.restore();
  // Tufts and flowers on open grass.
  each((tx, ty, hash) => {
    if (symbol(tx, ty) !== TILE.floor) return;
    const [x, y] = centre({ tx, ty });
    const ox = ((hash >>> 6) % 20) - 10;
    const oy = ((hash >>> 10) % 16) - 8;
    if (hash % GROUND.tuftEvery === 0) {
      c.strokeStyle = inkCss(GROUND.tuft);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x + ox - 2, y + oy);
      c.lineTo(x + ox - 3, y + oy - 4);
      c.moveTo(x + ox, y + oy);
      c.lineTo(x + ox, y + oy - 5);
      c.moveTo(x + ox + 2, y + oy);
      c.lineTo(x + ox + 3, y + oy - 4);
      c.stroke();
    } else if (hash % GROUND.flowerEvery === 1) {
      ellipse(c, x + ox, y + oy, 1.6, 1.6, GROUND.flowers[(hash >>> 14) % GROUND.flowers.length] ?? GROUND.tuft);
    }
  });
}
