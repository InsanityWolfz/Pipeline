import { describe, expect, it } from 'vitest';
import { TABLET } from '../../src/data/hudLook';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import { drawTablet, type TabletGraphics } from '../../src/render/tablet';

// 081: one tablet look. drawTablet keeps its box (x−1..x+w+1, y−1..y+h+1) and draws the gradient, the carved inner
// line, the bevel, the base and lit brass brackets.

interface Rect {
  color: number;
  alpha: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const recorder = (): { g: TabletGraphics; rects: Rect[] } => {
  const rects: Rect[] = [];
  let color = 0;
  let alpha = 1;
  const g = {
    fillStyle(c: number, a = 1) {
      color = c;
      alpha = a;
      return g;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ color, alpha, x, y, w, h });
      return g;
    },
  };
  return { g: g as unknown as TabletGraphics, rects };
};

const num = (id: string) => {
  const [r, g, b] = hexToRgb(paletteHex(id));
  return (r << 16) | (g << 8) | b;
};

describe('drawTablet (081)', () => {
  it('draws nothing outside its box', () => {
    for (const [x, y, w, h] of [
      [10, 20, 120, 40],
      [0, 0, 6, 6],
      [5, 5, 30, 12],
    ] as const) {
      const { g, rects } = recorder();
      drawTablet(g, x, y, w, h, 0.85);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(x - 1);
        expect(r.y).toBeGreaterThanOrEqual(y - 1);
        expect(r.x + r.w).toBeLessThanOrEqual(x + w + 1);
        expect(r.y + r.h).toBeLessThanOrEqual(y + h + 1);
      }
    }
  });

  it('shades the stone from carve at the top to carve-dark at the foot, covering the face once', () => {
    const { g, rects } = recorder();
    drawTablet(g, 10, 20, 120, 40);
    const bands = rects.filter((r) => r.x === 10 && r.w === 120 && r.alpha === TABLET.fillAlpha);
    expect(bands.length).toBe(TABLET.bands);
    expect(bands[0]?.color).toBe(num(TABLET.top));
    expect(bands.at(-1)?.color).toBe(num(TABLET.fill));
    expect(bands.reduce((s, b) => s + b.h, 0)).toBe(40);
    expect(bands[0]?.y).toBe(20);
  });

  it('carves the bevel, the inner line and the base, and lights each bracket at its top-left end', () => {
    const { g, rects } = recorder();
    drawTablet(g, 10, 20, 120, 40);
    expect(rects.some((r) => r.color === num(TABLET.bevel) && r.y === 20 && r.h === 1)).toBe(true);
    expect(rects.some((r) => r.color === num(TABLET.base) && r.y === 59 && r.h === 1)).toBe(true);
    const inner = rects.filter((r) => r.color === num(TABLET.inner.color) && r.alpha === TABLET.inner.alpha);
    expect(inner.length).toBe(4);
    expect(inner.some((r) => r.x === 12 && r.y === 22 && r.w === 116)).toBe(true);
    const brass = rects.filter((r) => r.color === num(TABLET.brass));
    const lit = rects.filter((r) => r.color === num(TABLET.brassLit));
    expect(brass.length).toBe(8);
    expect(lit.length).toBe(8);
    expect(Math.max(...brass.map((r) => Math.max(r.w, r.h)))).toBe(TABLET.corner);
    expect(Math.max(...lit.map((r) => Math.max(r.w, r.h)))).toBe(TABLET.lit);
    // The top-left bracket's lit end is the corner itself.
    expect(lit.some((r) => r.x === 10 && r.y === 20)).toBe(true);
  });

  it("shortens a small box's brackets as before, and leaves out the inner line where there's no room", () => {
    const { g, rects } = recorder();
    drawTablet(g, 0, 0, 6, 6);
    const brass = rects.filter((r) => r.color === num(TABLET.brass));
    expect(Math.max(...brass.map((r) => Math.max(r.w, r.h)))).toBe(2);
    expect(rects.filter((r) => r.color === num(TABLET.inner.color) && r.alpha === TABLET.inner.alpha).length).toBe(0);
  });
});
