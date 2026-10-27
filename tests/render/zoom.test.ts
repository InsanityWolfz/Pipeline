import { describe, expect, it } from 'vitest';
import { BUILD_ZOOMS } from '../../src/data/config';
import { centredBounds, stepZoom } from '../../src/render/zoom';

// 069: in build mode the wheel steps the world's zoom between 1× and 0.75× (so the foundry fits); leaving build mode is
// 1× again. A room narrower than the zoomed-out view sits centred in it.

describe('build mode’s zoom (069)', () => {
  it('has two steps, 1 and 0.75', () => {
    expect(BUILD_ZOOMS).toEqual([1, 0.75]);
  });

  it('steps out on the wheel down and in on the wheel up, never past either end', () => {
    expect(stepZoom(0, 1)).toBe(1);
    expect(stepZoom(1, 1)).toBe(1);
    expect(stepZoom(1, -1)).toBe(0);
    expect(stepZoom(0, -3)).toBe(0);
    expect(stepZoom(0, 4)).toBe(1);
  });

  it('widens a narrower room’s bounds evenly so it sits centred, and leaves a wider one alone', () => {
    // The foundry: 24 × 16 tiles and 48 px of wall above, in a 640 / 0.75 px wide view.
    const room = { x: 0, y: -48, w: 768, h: 560 };
    const viewW = 640 / 0.75;
    const b = centredBounds(room, viewW);
    expect(b.w).toBeCloseTo(viewW, 5);
    expect(b.x).toBeCloseTo(-(viewW - 768) / 2, 5);
    expect(b.x + b.w / 2).toBeCloseTo(room.x + room.w / 2, 5);
    expect({ y: b.y, h: b.h }).toEqual({ y: -48, h: 560 });
    expect(centredBounds(room, 640)).toEqual(room);
  });
});
