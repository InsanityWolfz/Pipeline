import { describe, expect, it } from 'vitest';
import { ellipse, inksOf, path, rect, type Shape } from '../../src/data/art/types';
import { drawRim, rimPath } from '../../src/render/vector/rim';

// 075: the `rim` style draws a band of light along a shape's top and left edges only: render clips to the shape and
// strokes the shape's own path shifted down and right by `offset`.

const RIM = { color: 'rim-light', width: 1.2, offset: 1.2 } as const;

/** Whether (x, y) is inside the rect. */
const inRect = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

describe('the rim light (075)', () => {
  it('shifts the shape down and right by its offset', () => {
    const r = rimPath(rect(0, 0, 10, 20, 2, { rim: RIM }));
    expect(r).toMatchObject({ kind: 'rect', x: 1.2, y: 1.2, w: 10, h: 20 });
    expect(rimPath(ellipse(5, 5, 3, 4, { rim: RIM }))).toMatchObject({ kind: 'ellipse', x: 6.2, y: 6.2, rx: 3, ry: 4 });
    const p = rimPath(path('M 0 0 Q 4 -2 8 0 L 8 8 C 6 9 2 9 0 8 Z', { rim: RIM }));
    expect(p.kind === 'path' && p.d).toEqual([['M', 1.2, 1.2], ['Q', 5.2, -0.8, 9.2, 1.2], ['L', 9.2, 9.2], ['C', 7.2, 10.2, 3.2, 10.2, 1.2, 9.2], ['Z']]);
  });

  it('puts the band inside along the top and left edges and clips it away along the bottom and right', () => {
    const box = { x: 0, y: 0, w: 10, h: 20 };
    const shifted = rimPath(rect(box.x, box.y, box.w, box.h, 0, { rim: RIM }));
    if (shifted.kind !== 'rect') throw new Error('not a rect');
    // Each edge of the shifted path: its middle point. The band is the stroke along it, kept only inside the shape.
    const top = [shifted.x + shifted.w / 2, shifted.y];
    const left = [shifted.x, shifted.y + shifted.h / 2];
    const bottom = [shifted.x + shifted.w / 2, shifted.y + shifted.h];
    const right = [shifted.x + shifted.w, shifted.y + shifted.h / 2];
    const half = RIM.width / 2;
    // The whole band's width at the top and left lies inside the shape: the light shows there.
    for (const [x, y] of [top, left]) {
      expect(inRect(box, (x ?? 0) + (y === top[1] ? 0 : -half), (y ?? 0) + (y === top[1] ? -half : 0))).toBe(true);
      expect(inRect(box, (x ?? 0) + (y === top[1] ? 0 : half), (y ?? 0) + (y === top[1] ? half : 0))).toBe(true);
    }
    // At the bottom and right the whole band lies outside it, so the clip drops it.
    expect(inRect(box, bottom[0] ?? 0, (bottom[1] ?? 0) - half)).toBe(false);
    expect(inRect(box, (right[0] ?? 0) - half, right[1] ?? 0)).toBe(false);
  });

  it('clips to the shape, then strokes the shifted path in the rim colour and width', () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, key: string) => (key === 'strokeStyle' || key === 'lineWidth' || key === 'globalAlpha' ? undefined : (...args: unknown[]) => calls.push(`${key}(${args.join(',')})`)),
        set: (_t, key: string, v: unknown) => {
          calls.push(`${key}=${String(v)}`);
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    const s: Shape = rect(0, 0, 10, 20, 0, { rim: RIM });
    drawRim(ctx, s);
    const clip = calls.indexOf('clip()');
    expect(clip).toBeGreaterThan(-1);
    // Traced at the shape before the clip, at the shifted shape after it.
    expect(calls.slice(0, clip)).toContain('roundRect(0,0,10,20,0)');
    expect(calls.slice(clip)).toContain('roundRect(1.2,1.2,10,20,0)');
    expect(calls).toContain('strokeStyle=#ffe6c4');
    expect(calls).toContain('lineWidth=1.2');
    expect(calls.at(-1)).toBe('restore()');
  });

  it('names its colour for the palette test', () => {
    expect(inksOf(rect(0, 0, 1, 1, 0, { fill: 'cobalt', rim: { ...RIM, color: { id: 'rim-light', alpha: 0.55 } } }))).toEqual(['cobalt', 'rim-light']);
  });
});
