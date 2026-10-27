import type { Part, PathCmd, Shape } from '../../data/art/types';
import { drawShapes, type DrawOpts } from './draw';

// 075: the wanderer's parts baked once into small bitmaps at the drawing's resolution, the first time each is drawn
// (by scheme, trim, view and scale), so a frame stamps a dozen images instead of re-drawing a hundred shapes. Its
// limbs, hose and effects stay live vector: they bend every frame.

export interface Baked {
  image: HTMLCanvasElement;
  /** The bitmap's top left, and its size, in the part's own units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

const coords = (d: readonly PathCmd[]): number[] => d.flatMap((c) => (c[0] === 'Z' ? [] : c.slice(1))) as number[];

/** A shape's box in its own units, padded for its outline, stroke and glow: [x0, y0, x1, y1]. */
export function shapeBounds(s: Shape, outline: number): [number, number, number, number] {
  let xs: number[];
  let ys: number[];
  if (s.kind === 'ellipse') {
    xs = [s.x - s.rx, s.x + s.rx];
    ys = [s.y - s.ry, s.y + s.ry];
  } else if (s.kind === 'rect') {
    xs = [s.x, s.x + s.w];
    ys = [s.y, s.y + s.h];
  } else {
    const n = s.kind === 'path' ? coords(s.d) : [...s.pts];
    xs = n.filter((_, i) => i % 2 === 0);
    ys = n.filter((_, i) => i % 2 === 1);
  }
  const width = s.kind === 'line' ? s.width / 2 + (s.outline ? outline : 0) : 0;
  const pad = width + outline + (s.stroke?.width ?? 0) / 2 + (s.glow ? s.glow.blur * 2 : 0) + 0.5;
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

const cache = new Map<string, Baked | null>();

/**
 * The part baked at `k` canvas px per unit (null outside a browser). `key` names what the part's shapes depend on
 * beyond its id (the scheme, the trim, the view).
 */
export function bakedPart(key: string, part: Part, k: number, o: DrawOpts): Baked | null {
  const id = `${key}/${part.id}@${k.toFixed(3)}`;
  if (cache.has(id)) return cache.get(id) ?? null;
  let baked: Baked | null = null;
  if (typeof document !== 'undefined' && part.shapes.length > 0) {
    const boxes = part.shapes.map((s) => shapeBounds(s, o.outline));
    const x = Math.floor(Math.min(...boxes.map((b) => b[0])));
    const y = Math.floor(Math.min(...boxes.map((b) => b[1])));
    const w = Math.ceil(Math.max(...boxes.map((b) => b[2]))) - x;
    const h = Math.ceil(Math.max(...boxes.map((b) => b[3]))) - y;
    const image = document.createElement('canvas');
    image.width = Math.max(1, Math.ceil(w * k));
    image.height = Math.max(1, Math.ceil(h * k));
    const c = image.getContext('2d');
    if (c) {
      c.setTransform(k, 0, 0, k, -x * k, -y * k);
      drawShapes(c, part.shapes, o);
      baked = { image, x, y, w: image.width / k, h: image.height / k };
    }
  }
  cache.set(id, baked);
  return baked;
}
