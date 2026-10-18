import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { shelfPack } from '../../src/render/vector/pack';
import { fitScreen, toView } from '../../src/render/scale';
import { vectorFrames } from '../../src/render/vector/catalog';

describe('the screen fit (016)', () => {
  it('keeps a whole-number CSS zoom and draws at the device resolution', () => {
    expect(fitScreen(1920, 1080, 1)).toEqual({ zoom: 3, scale: 3, width: VIEW_WIDTH * 3, height: VIEW_HEIGHT * 3 });
    expect(fitScreen(1280, 800, 2)).toEqual({ zoom: 2, scale: 4, width: VIEW_WIDTH * 4, height: VIEW_HEIGHT * 4 });
    expect(fitScreen(300, 200, 1).zoom).toBe(1);
  });

  it('maps backbuffer pointer px back to view px', () => {
    expect(toView(960, 540, 3)).toEqual({ x: 320, y: 180 });
  });
});

describe('shelf packing', () => {
  it('lays frames in rows without overlap and starts a page when one fills', () => {
    const sizes = Array.from({ length: 30 }, () => [40, 30] as const);
    const { placed, pages } = shelfPack(sizes, 100, 2);
    expect(pages.length).toBeGreaterThan(1);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        if (!a || !b || a.page !== b.page) continue;
        const apart = a.x + 40 <= b.x || b.x + 40 <= a.x || a.y + 30 <= b.y || b.y + 30 <= a.y;
        expect(apart).toBe(true);
      }
    }
    for (const p of placed) expect(p.x + 40).toBeLessThanOrEqual(100);
  });

  it('fits every vector frame at the largest texture scale', () => {
    const sizes = vectorFrames().map((f) => [f.size[0] * 4, f.size[1] * 4] as const);
    expect(() => shelfPack(sizes, 2048, 2)).not.toThrow();
  });
});
