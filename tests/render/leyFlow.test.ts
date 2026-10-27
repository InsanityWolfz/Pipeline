import { describe, expect, it } from 'vitest';
import { LEY_FLOW } from '../../src/data/ambient';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD_SHAPE } from '../../src/data/worldShape';
import { beadsInView } from '../../src/render/world/leyFlow';

// 077: ley beads run along every line toward its end (the foundry, or a vein seam's pylon), one every 4 tiles on
// Medium and 3 on High, at most 24 and 48 in view, none on Low, and only from the segments in view.

const T = 32;
/** A view on a line home, a few tiles out from the ruin. */
const line = OVERWORLD.leyLines.shrine;
const mid = line[Math.floor(line.length / 2)] ?? { tx: 0, ty: 0 };
const view = { x: (mid.tx + 0.5) * T - 320, y: (mid.ty + 0.5) * T - 180, width: 640, height: 360 };

describe('ley flow (077)', () => {
  it('places no bead on Low and keeps to the cap on Medium and High', () => {
    expect(beadsInView(view, 0, 'low')).toEqual([]);
    const m = beadsInView(view, 1000, 'medium');
    const h = beadsInView(view, 1000, 'high');
    expect(m.length).toBeGreaterThan(0);
    expect(m.length).toBeLessThanOrEqual(LEY_FLOW.max.medium);
    expect(h.length).toBeGreaterThan(m.length);
    expect(h.length).toBeLessThanOrEqual(LEY_FLOW.max.high);
    for (const b of h) {
      expect(b.x).toBeGreaterThanOrEqual(view.x);
      expect(b.x).toBeLessThanOrEqual(view.x + view.width);
      expect(b.y).toBeGreaterThanOrEqual(view.y);
      expect(b.y).toBeLessThanOrEqual(view.y + view.height);
    }
  });

  it('caps a view holding many lines (round the ruin, where every line meets) at 24 and 48', () => {
    const ruin = { x: WORLD_SHAPE.centre.tx * T - 1200, y: WORLD_SHAPE.centre.ty * T - 1200, width: 2400, height: 2400 };
    expect(beadsInView(ruin, 500, 'medium').length).toBe(LEY_FLOW.max.medium);
    expect(beadsInView(ruin, 500, 'high').length).toBe(LEY_FLOW.max.high);
  });

  it('moves every bead toward the foundry along a line home, at 24 px/s', () => {
    const near = (a: { x: number; y: number }) => Math.hypot(a.x - (WORLD_SHAPE.centre.tx + 0.5) * T, a.y - (WORLD_SHAPE.centre.ty + 0.5) * T);
    const before = beadsInView(view, 1000, 'high');
    const after = beadsInView(view, 1100, 'high');
    // Each bead 0.1 s later is 2.4 px further along: the nearest later bead to each is closer to the ruin.
    let closer = 0;
    for (const b of before) {
      const next = after.reduce((best, a) => (Math.hypot(a.x - b.x, a.y - b.y) < Math.hypot(best.x - b.x, best.y - b.y) ? a : best), after[0] ?? b);
      expect(Math.hypot(next.x - b.x, next.y - b.y)).toBeLessThan(3);
      if (near(next) < near(b)) closer += 1;
    }
    expect(closer).toBeGreaterThan(before.length * 0.8);
  });

  it('looks at nothing far from every line', () => {
    expect(beadsInView({ x: 0, y: 0, width: 640, height: 360 }, 0, 'high')).toEqual([]);
  });
});
