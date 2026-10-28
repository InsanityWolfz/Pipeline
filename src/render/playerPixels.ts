import { WANDERER } from '../data/art/wanderer';
import type { PlayerPixels } from './PlayerView';

// The drawn wanderer's pixels, read only when the test hook's `wanderer()` asks (075; 078: the drawn edge along a way).

/** The wanderer's canvas: its 2D context, size and texture px per world px. */
export interface Texels {
  data: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
}

/** The middle of the drawn pixels (alpha over a quarter) within a texture px of the furthest along `along`, world px from the feet. */
export function furthest(t: Texels, along: number): [number, number] | null {
  const { width, height } = t;
  const data = t.data.getImageData(0, 0, width, height).data;
  const [dx, dy] = [Math.cos(along), Math.sin(along)];
  let most = -Infinity;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if ((data[(y * width + x) * 4 + 3] ?? 0) >= 64) most = Math.max(most, x * dx + y * dy);
  if (most === -Infinity) return null;
  let [sx, sy, n] = [0, 0, 0];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) < 64 || x * dx + y * dy < most - 1) continue;
      sx += x + 0.5;
      sy += y + 0.5;
      n += 1;
    }
  const s = t.scale;
  const [ax, ay] = WANDERER.box.anchor;
  return [sx / n / s - ax, sy / n / s - ay];
}

/** The drawn colour at a point, world px from the feet. */
export function colorAt(t: Texels, at: [number, number] | null): [number, number, number] | null {
  if (!at) return null;
  const s = t.scale;
  const [ax, ay] = WANDERER.box.anchor;
  // The stroke's core, not an anti-aliased edge: the brightest pixel of the 3×3 round the point (the trim is lighter
  // than the cape and outline it lies on).
  const d = t.data.getImageData(Math.round((at[0] + ax) * s) - 1, Math.round((at[1] + ay) * s) - 1, 3, 3).data;
  let best: [number, number, number] = [0, 0, 0];
  for (let i = 0; i + 2 < d.length; i += 4) {
    const px: [number, number, number] = [d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0];
    if (px[0] + px[1] + px[2] > best[0] + best[1] + best[2]) best = px;
  }
  return best;
}

/** The drawn pixels' box in world px, from the feet (the texture's alpha above a quarter), or null when nothing shows. */
export function drawnBounds(t: Texels): PlayerPixels['bounds'] {
  const { width, height } = t;
  const data = t.data.getImageData(0, 0, width, height).data;
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) < 64) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  if (x1 < 0) return null;
  const s = t.scale;
  const [ax, ay] = WANDERER.box.anchor;
  return { w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s, left: x0 / s - ax, top: y0 / s - ay };
}
