import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { HUD_HEALTH_LAYOUT } from '../../src/data/hudPanels';
import { BUILD_BAR } from '../../src/data/pieces';
import { buildBarLabelTop, hotbarBox, tubeSlotBox, type ScreenBox } from '../../src/render/bottomHud';
import { buildBarBox } from '../../src/render/foundryLayout';
import { healthBlockBox } from '../../src/render/healthLayout';

// Where the HP block sits (031): bottom-left, never over the 025 hotbar row or tube
// slot (a volley up to five entrances wide), and above the build bar's labels when
// the bar would reach it.

const overlaps = (a: ScreenBox, b: ScreenBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inView = (b: ScreenBox) => b.x >= 0 && b.y >= 0 && b.x + b.w <= VIEW_WIDTH && b.y + b.h <= VIEW_HEIGHT;

describe('the HP block', () => {
  it('sits margin px from the left and bottom edges in play', () => {
    const box = healthBlockBox(null);
    expect(box.x).toBe(HUD_LAYOUT.margin);
    expect(box.y + box.h).toBe(VIEW_HEIGHT - HUD_LAYOUT.margin);
    expect(box.w).toBeGreaterThanOrEqual(HUD_HEALTH_LAYOUT.frame.w);
    expect(inView(box)).toBe(true);
  });

  it('never meets the hotbar row or the tube slot, up to five units wide', () => {
    const box = healthBlockBox(null);
    expect(overlaps(box, hotbarBox())).toBe(false);
    for (let units = 1; units <= 5; units++) expect(overlaps(box, tubeSlotBox(units)), `${units} units`).toBe(false);
  });

  it('stays down when a short build bar leaves room, and rises over the labels of a long one', () => {
    const short = buildBarBox(['conduit', 'hopper']);
    expect(healthBlockBox(short)).toEqual(healthBlockBox(null));
    const all = buildBarBox(BUILD_BAR);
    const box = healthBlockBox(all);
    // Every piece unlocked: the bar reaches the block, so the block sits gap px above the label row.
    expect(all.x).toBeLessThan(healthBlockBox(null).x + healthBlockBox(null).w + HUD_LAYOUT.gap);
    expect(box.y + box.h).toBe(buildBarLabelTop() - HUD_LAYOUT.gap);
    expect(box.x).toBe(HUD_LAYOUT.margin);
    expect(overlaps(box, all)).toBe(false);
    for (let units = 1; units <= 5; units++) expect(overlaps(box, tubeSlotBox(units, true)), `${units} units`).toBe(false);
    expect(inView(box)).toBe(true);
  });
});
