import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { INTAKE } from '../../src/data/foundry';
import { BUILD_BAR } from '../../src/data/pieces';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { SLOT_AMMOS } from '../../src/data/tube';
import { hotbarBox, hotbarCells, tubeSlotBox, tubeSlotUnits, type ScreenBox } from '../../src/render/bottomHud';
import { buildBarCells } from '../../src/render/foundryLayout';

// The bottom HUD's layout (025): the hotbar row and the tube slot centred, the slot
// above the row and bigger, everything inside the 640×360 view.

const centre = (b: ScreenBox) => b.x + b.w / 2;
const inView = (b: ScreenBox) => b.x >= 0 && b.y >= 0 && b.x + b.w <= VIEW_WIDTH && b.y + b.h <= VIEW_HEIGHT;

describe('the bottom HUD layout', () => {
  it('centres the three hotbar cells, in key order, margin px above the bottom', () => {
    const cells = hotbarCells();
    expect(cells.map((c) => c.ammoId)).toEqual([...SLOT_AMMOS]);
    expect(cells).toHaveLength(3);
    const row = hotbarBox();
    expect(Math.abs(centre(row) - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
    expect(row.y + row.h).toBe(VIEW_HEIGHT - HUD_LAYOUT.margin);
    expect(inView(row)).toBe(true);
  });

  it('centres the tube slot gap px above the row, for every number of rounds a volley can have', () => {
    const row = hotbarBox();
    for (let n = 1; n <= INTAKE.entrances.length; n++) {
      const slot = tubeSlotBox(n);
      expect(Math.abs(centre(slot) - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
      expect(slot.y + slot.h).toBe(row.y - HUD_LAYOUT.gap);
      expect(inView(slot)).toBe(true);
      const units = tubeSlotUnits(n);
      expect(units).toHaveLength(n);
      expect(units[0]?.x).toBe(slot.x);
      expect((units[n - 1]?.x ?? 0) + HUD_LAYOUT.tubeSlot.w).toBe(slot.x + slot.w);
    }
  });

  it('makes the tube slot activeScale times the hotbar cell', () => {
    expect(HUD_LAYOUT.activeScale).toBe(1.4);
    expect(HUD_LAYOUT.tubeSlot.w).toBeGreaterThanOrEqual(Math.round(HUD_LAYOUT.cell.w * HUD_LAYOUT.activeScale));
    expect(HUD_LAYOUT.tubeSlot.h).toBe(Math.round(HUD_LAYOUT.cell.h * HUD_LAYOUT.activeScale));
  });

  it('puts the build bar in the hotbar row, where it replaces it in build mode', () => {
    const row = hotbarBox();
    for (const c of buildBarCells(BUILD_BAR)) {
      expect(c.y).toBe(row.y);
      expect(c.h).toBe(row.h);
      expect(inView(c)).toBe(true);
    }
  });
});
