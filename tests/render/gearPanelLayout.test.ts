import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { GEAR_SLOTS } from '../../src/data/gear';
import { GEAR_PANEL } from '../../src/data/gearAssets';
import { hotbarBox, tubeSlotBox } from '../../src/render/bottomHud';
import { gearPages, gearPanelLayout, inBox, type Box, type RowSpec } from '../../src/render/gearPanelLayout';

// The bench's gear panel (036): every part inside the panel and the panel on screen,
// nothing overlapping, the open tab's rows paged by height.

const inside = (b: Box, p: Box): boolean => b.x >= p.x && b.y >= p.y && b.x + b.w <= p.x + p.w && b.y + b.h <= p.y + p.h;
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const rows = (n: number, relicEvery = 0): RowSpec[] => Array.from({ length: n }, (_, i) => ({ id: i, relic: relicEvery > 0 && i % relicEvery === 0 }));

describe('the gear panel layout', () => {
  it('fits the screen, centred alone, its parts inside it and apart', () => {
    {
      const L = gearPanelLayout(rows(4, 2), 0);
      expect(inside(L.panel, { x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT })).toBe(true);
      const parts = [L.identify, ...L.cells.map((c) => c.box), ...L.tabs.map((t) => t.box), ...L.rows.map((r) => r.box), L.pager];
      for (const p of parts) expect(inside(p, L.panel), JSON.stringify(p)).toBe(true);
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlaps(parts[i] as Box, parts[j] as Box)).toBe(false);
      for (const t of L.totals) expect(t.y).toBeGreaterThan(L.pager.y + L.pager.h - 1);
      expect(L.cells.map((c) => c.slot)).toEqual(GEAR_SLOTS);
      expect(L.tabs.map((t) => t.slot)).toEqual(GEAR_SLOTS);
    }
    const alone = gearPanelLayout([], 0).panel;
    expect(alone.x + alone.w / 2).toBeCloseTo(VIEW_WIDTH / 2, 0);
    // Clear of the bottom HUD: the hotbar row and the tube slot at its widest.
    for (const hud of [hotbarBox(), tubeSlotBox(5)]) expect(overlaps(alone, hud), JSON.stringify(hud)).toBe(false);
  });

  it('pages the rows by height, a relic’s row taller, every row on exactly one page', () => {
    expect(gearPages([])).toEqual([[]]);
    for (const [n, relics] of [[3, 0], [5, 0], [6, 0], [12, 0], [9, 2], [20, 3]] as const) {
      const all = rows(n, relics);
      const pages = gearPages(all);
      expect(pages.flat()).toEqual(all);
      for (const page of pages) {
        const used = page.reduce((h, r, i) => h + (r.relic ? GEAR_PANEL.list.relicH : GEAR_PANEL.list.rowH) + (i > 0 ? GEAR_PANEL.list.gap : 0), 0);
        expect(used).toBeLessThanOrEqual(GEAR_PANEL.list.h);
        expect(page.length).toBeGreaterThan(0);
      }
      // Each page is as full as it can be: the next page's first row wouldn't have fit.
      for (let i = 0; i + 1 < pages.length; i++) expect(gearPages([...(pages[i] ?? []), ...(pages[i + 1] ?? []).slice(0, 1)])).toHaveLength(2);
    }
    expect(gearPages(rows(4))).toHaveLength(1);
  });

  it('shows the asked page, wrapping round, and hit-tests its parts', () => {
    const all = rows(14);
    const count = gearPages(all).length;
    expect(count).toBeGreaterThan(1);
    const second = gearPanelLayout(all, 1);
    expect(second.page).toEqual({ index: 1, count });
    expect(second.rows[0]?.id).toBe(gearPages(all)[1]?.[0]?.id);
    expect(gearPanelLayout(all, count).page.index).toBe(0);
    const tab = second.tabs[2]?.box;
    if (!tab) throw new Error('no tab');
    expect(inBox(tab, tab.x + 1, tab.y + 1)).toBe(true);
    expect(inBox(tab, tab.x + tab.w, tab.y)).toBe(false);
  });
});
