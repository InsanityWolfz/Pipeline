import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { GEAR_SLOTS } from '../../src/data/gear';
import { GEAR_PANEL } from '../../src/data/gearAssets';
import { hotbarBox, tubeSlotBox } from '../../src/render/bottomHud';
import { gearPanelLayout, inBox, lastScroll, type Box, type RowSpec } from '../../src/render/gearPanelLayout';

// The bench's gear panel (036): every part inside the panel and the panel on screen,
// nothing overlapping, the open tab's rows scrolled by row (050, A.13: no pages).

const inside = (b: Box, p: Box): boolean => b.x >= p.x && b.y >= p.y && b.x + b.w <= p.x + p.w && b.y + b.h <= p.y + p.h;
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const rows = (n: number, relicEvery = 0): RowSpec[] => Array.from({ length: n }, (_, i) => ({ id: i, relic: relicEvery > 0 && i % relicEvery === 0 }));

describe('the gear panel layout', () => {
  it('fits the screen, centred alone, its parts inside it and apart', () => {
    {
      const L = gearPanelLayout(rows(4, 2), 0);
      expect(inside(L.panel, { x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT })).toBe(true);
      const parts = [L.identify, ...L.cells.map((c) => c.box), ...L.tabs.map((t) => t.box), ...L.rows.map((r) => r.box), L.track];
      for (const p of parts) expect(inside(p, L.panel), JSON.stringify(p)).toBe(true);
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlaps(parts[i] as Box, parts[j] as Box)).toBe(false);
      for (const t of L.totals) expect(t.y).toBeGreaterThan(L.track.y + L.track.h - 1);
      expect(L.cells.map((c) => c.slot)).toEqual(GEAR_SLOTS);
      expect(L.tabs.map((t) => t.slot)).toEqual(GEAR_SLOTS);
    }
    const alone = gearPanelLayout([], 0).panel;
    expect(alone.x + alone.w / 2).toBeCloseTo(VIEW_WIDTH / 2, 0);
    // Clear of the bottom HUD: the hotbar row and the tube slot at its widest.
    for (const hud of [hotbarBox(), tubeSlotBox(5)]) expect(overlaps(alone, hud), JSON.stringify(hud)).toBe(false);
  });

  it('shows the rows from the scrolled-to one while they fit, a relic’s row taller (050: no pages)', () => {
    const fits = (shown: RowSpec[]) => shown.reduce((h, r, i) => h + (r.relic ? GEAR_PANEL.list.relicH : GEAR_PANEL.list.rowH) + (i > 0 ? GEAR_PANEL.list.gap : 0), 0) <= GEAR_PANEL.list.h;
    for (const [n, relics] of [[3, 0], [5, 0], [12, 0], [9, 2], [20, 3]] as const) {
      const all = rows(n, relics);
      for (let first = 0; first <= lastScroll(all); first++) {
        const L = gearPanelLayout(all, first);
        const shown = L.rows.map((r) => all.find((a) => a.id === r.id) as RowSpec);
        expect(shown[0]?.id).toBe(first);
        expect(fits(shown)).toBe(true);
        // As many as fit: one more wouldn't.
        const next = all[first + shown.length];
        if (next) expect(fits([...shown, next])).toBe(false);
      }
    }
  });

  it('scrolls no further than shows the last row, nor above the first; the thumb follows', () => {
    expect(lastScroll([])).toBe(0);
    expect(lastScroll(rows(4))).toBe(0);
    const all = rows(14);
    const last = lastScroll(all);
    expect(last).toBeGreaterThan(0);
    const end = gearPanelLayout(all, last + 5);
    expect(end.scroll).toEqual({ first: last, last });
    expect(end.rows.at(-1)?.id).toBe(13);
    const top = gearPanelLayout(all, -3);
    expect(top.scroll.first).toBe(0);
    expect(top.thumb.y).toBe(top.track.y);
    expect(end.thumb.y + end.thumb.h).toBeCloseTo(end.track.y + end.track.h, 5);
    expect(gearPanelLayout(rows(4), 0).thumb.h).toBe(gearPanelLayout(rows(4), 0).track.h);
    const tab = end.tabs[2]?.box;
    if (!tab) throw new Error('no tab');
    expect(inBox(tab, tab.x + 1, tab.y + 1)).toBe(true);
    expect(inBox(tab, tab.x + tab.w, tab.y)).toBe(false);
  });
});
