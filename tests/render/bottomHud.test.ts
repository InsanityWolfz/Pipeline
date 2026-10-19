import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { INTAKE } from '../../src/data/foundry';
import { TEXT_STYLES } from '../../src/data/fonts';
import { BUILD_BAR, PIECE_CATEGORIES, pieceDef } from '../../src/data/pieces';
import { BUILD_BAR_LAYOUT, CRAFT_MENU_LAYOUT, HUD_LAYOUT } from '../../src/data/hudLayout';
import { SLOT_AMMOS } from '../../src/data/tube';
import { hotbarBox, hotbarCells, tubeSlotBox, tubeSlotUnits, type ScreenBox } from '../../src/render/bottomHud';
import { craftMenuLines, craftPanelAt } from '../../src/render/craftMenuLayout';
import { buildBarBox, buildBarCells, buildBarDividers, buildBarGroups } from '../../src/render/foundryLayout';

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

const overlaps = (a: ScreenBox, b: ScreenBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('the build bar in groups (026)', () => {
  /** The logistics pieces only (a fresh start), logistics plus the first arrow machine, and everything. */
  const SHOWN: readonly (readonly string[])[] = [
    BUILD_BAR.filter((id) => pieceDef(id).category === 'logistics'),
    BUILD_BAR.filter((id) => pieceDef(id).category === 'logistics' || id === 'cutter'),
    BUILD_BAR,
  ];

  it('lays out only the shown (unlocked) pieces, in bar order, centred and inside the view', () => {
    for (const shown of SHOWN) {
      const cells = buildBarCells(shown);
      expect(cells.map((c) => c.pieceId)).toEqual([...shown]);
      const bar = buildBarBox(shown);
      expect(Math.abs(centre(bar) - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
      expect(inView(bar)).toBe(true);
      for (const c of cells) expect(inView(c)).toBe(true);
    }
  });

  it('leaves out a group with nothing unlocked: no label, no divider', () => {
    const [logistics, withCutter] = SHOWN;
    if (!logistics || !withCutter) throw new Error('no subsets');
    expect(buildBarGroups(logistics).map((g) => g.label)).toEqual(['Logistics']);
    expect(buildBarDividers(logistics)).toEqual([]);
    expect(buildBarGroups(withCutter).map((g) => g.label)).toEqual(['Logistics', 'Arrows']);
    expect(buildBarDividers(withCutter)).toHaveLength(1);
  });

  it('puts groupGap px between groups, a divider centred in each gap, and a label row over each group', () => {
    const cells = buildBarCells(BUILD_BAR);
    const groups = buildBarGroups(BUILD_BAR);
    expect(groups.map((g) => g.label)).toEqual(PIECE_CATEGORIES.map((c) => c.label));
    const L = BUILD_BAR_LAYOUT;
    for (const [i, g] of groups.entries()) {
      const mine = cells.filter((c) => pieceDef(c.pieceId).category === g.category);
      const first = mine[0];
      const last = mine[mine.length - 1];
      if (!first || !last) throw new Error(`empty group ${g.category}`);
      // The label row spans the group's cells, just above them.
      expect(g.x).toBe(first.x);
      expect(g.x + g.w).toBe(last.x + last.w);
      expect(g.y + g.h).toBe(first.y - L.label.gap);
      expect(inView(g)).toBe(true);
      // Within a group cells sit cellStep apart; the next group starts groupGap past this one's last cell.
      mine.forEach((c, j) => expect(c.x).toBe(first.x + j * L.cellStep));
      const next = groups[i + 1];
      if (next) expect(next.x - (last.x + last.w)).toBe(L.groupGap);
    }
    const dividers = buildBarDividers(BUILD_BAR);
    expect(dividers).toHaveLength(groups.length - 1);
    dividers.forEach((d, i) => {
      const left = groups[i];
      const right = groups[i + 1];
      if (!left || !right) throw new Error('divider without groups');
      expect(Math.abs(d.x - (left.x + left.w + right.x) / 2)).toBeLessThanOrEqual(0.5);
      expect(d.y).toBeGreaterThanOrEqual(left.y);
      expect(d.y + d.h).toBeLessThanOrEqual(VIEW_HEIGHT - L.bottom);
    });
  });

  it('lifts the tube slot above the label row while building, clear of every label and cell', () => {
    const top = Math.min(...buildBarGroups(BUILD_BAR).map((g) => g.y));
    for (let n = 1; n <= INTAKE.entrances.length; n++) {
      const slot = tubeSlotBox(n, true);
      expect(slot.y + slot.h).toBe(top - HUD_LAYOUT.gap);
      expect(Math.abs(centre(slot) - VIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
      expect(inView(slot)).toBe(true);
      for (const g of buildBarGroups(BUILD_BAR)) expect(overlaps(slot, g)).toBe(false);
      for (const c of buildBarCells(BUILD_BAR)) expect(overlaps(slot, c)).toBe(false);
    }
  });
});

describe('the crafting menu with labels (026)', () => {
  it('fits the panel and its title card in the view', () => {
    const L = CRAFT_MENU_LAYOUT;
    const panel = craftPanelAt();
    const top = panel.y - L.title.gap - L.title.h;
    expect(top).toBeGreaterThanOrEqual(0);
    expect(panel.y + L.height).toBeLessThanOrEqual(VIEW_HEIGHT);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + L.width).toBeLessThanOrEqual(VIEW_WIDTH);
  });

  it('keeps every row, with room under its icons for their names, inside the panel', () => {
    const L = CRAFT_MENU_LAYOUT;
    const panel = craftPanelAt();
    // A name sits under its icon, inside the row.
    expect(L.labelY).toBeGreaterThanOrEqual(L.iconY + L.iconSize);
    expect(L.labelY + TEXT_STYLES.label.lineHeight).toBeLessThanOrEqual(L.rowHeight);
    const lines = craftMenuLines();
    for (const [i, line] of lines.entries()) {
      const h = line.kind === 'header' ? L.headerHeight : L.rowHeight;
      expect(line.y + h).toBeLessThanOrEqual(panel.y + L.height);
      expect(line.x + L.rowWidth).toBeLessThanOrEqual(panel.x + L.width);
      const next = lines[i + 1];
      if (next) expect(next.y).toBeGreaterThanOrEqual(line.y + h);
    }
  });
});
