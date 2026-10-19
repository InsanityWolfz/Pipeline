import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { TIP } from '../../src/data/legibility';
import { placeTip, type Box, type Side } from '../../src/render/tipPlace';

// Where the hover tablet goes (040): beside the hovered thing, flipped or moved so it
// always stays at least 4 px inside the 640×360 view; docked in the talent tree's info area.

const insideView = (at: { x: number; y: number }, w: number, h: number) => {
  expect(at.x).toBeGreaterThanOrEqual(TIP.edge);
  expect(at.y).toBeGreaterThanOrEqual(TIP.edge);
  expect(at.x + w).toBeLessThanOrEqual(VIEW_WIDTH - TIP.edge);
  expect(at.y + h).toBeLessThanOrEqual(VIEW_HEIGHT - TIP.edge);
};

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('placeTip', () => {
  it('sits on the first side that fits, the gap away from the thing', () => {
    const box = { x: 300, y: 300, w: 24, h: 28 };
    const at = placeTip({ box, prefer: ['above'] }, 120, 40);
    expect(at.y + 40 + TIP.gap).toBe(box.y);
    expect(at.x + 60).toBe(box.x + 12);
    const right = placeTip({ box: { x: 100, y: 100, w: 50, h: 14 }, prefer: ['right', 'left'] }, 200, 50);
    expect(right.x).toBe(100 + 50 + TIP.gap);
  });

  it('flips to the other side when the first runs off the view', () => {
    const box = { x: 560, y: 100, w: 60, h: 14 };
    const at = placeTip({ box, prefer: ['right', 'left'] }, 200, 50);
    expect(at.x + 200 + TIP.gap).toBe(box.x);
    const top = placeTip({ box: { x: 300, y: 10, w: 20, h: 20 }, prefer: ['above', 'below'] }, 100, 40);
    expect(top.y).toBe(10 + 20 + TIP.gap);
  });

  it('stays at least 4 px inside the view for anchors at every edge and corner, at the largest sizes', () => {
    const sizes = [
      [TIP.summaryW, 60],
      [TIP.breakdownW, TIP.nameRow + (TIP.maxLines - 1) * TIP.lineHeight + 2 * TIP.pad],
    ] as const;
    const spots = [0, 0.5, 1].flatMap((fx) => [0, 0.5, 1].map((fy) => ({ x: Math.round(fx * (VIEW_WIDTH - 30)), y: Math.round(fy * (VIEW_HEIGHT - 20)), w: 30, h: 20 })));
    const orders: Side[][] = [['above', 'below'], ['right', 'left'], ['below'], ['left', 'right']];
    for (const [w, h] of sizes) for (const box of spots) for (const prefer of orders) insideView(placeTip({ box, prefer }, w, h), w, h);
  });

  it('never covers the thing when a side fits', () => {
    const box = { x: 20, y: 300, w: 24, h: 28 };
    const at = placeTip({ box, prefer: ['above', 'right'] }, TIP.summaryW, 50);
    expect(overlaps({ ...at, w: TIP.summaryW, h: 50 }, box)).toBe(false);
  });

  it('docks in the bottom corner away from the hovered thing', () => {
    const dock = { x: 178, y: 100, w: 284, h: 180 };
    const leftNode = placeTip({ box: { x: 200, y: 250, w: 18, h: 18 }, prefer: [], dock }, 150, 40);
    expect(leftNode).toEqual({ x: dock.x + dock.w - 150, y: dock.y + dock.h - 40 });
    const rightNode = placeTip({ box: { x: 420, y: 250, w: 18, h: 18 }, prefer: [], dock }, 150, 40);
    expect(rightNode).toEqual({ x: dock.x, y: dock.y + dock.h - 40 });
  });
});
