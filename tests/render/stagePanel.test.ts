import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { STAGES } from '../../src/data/stages';
import { menuRows } from '../../src/render/foundryLayout';
import { stagePanelLayout } from '../../src/render/stagePanelLayout';

// The bench's Stages panel (029): beside the bench's own rows, on screen, never over them.

describe('the Stages panel layout', () => {
  it('has a row per stage, inside its panel, and the panel on screen', () => {
    for (const bench of [0, 1, 4, 12]) {
      const { panel, rows } = stagePanelLayout(bench);
      expect(rows.map((r) => r.stageId)).toEqual(Object.keys(STAGES));
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.w).toBeLessThanOrEqual(VIEW_WIDTH);
      expect(panel.y).toBeGreaterThanOrEqual(0);
      expect(panel.y + panel.h).toBeLessThanOrEqual(VIEW_HEIGHT);
      for (const r of rows) {
        expect(r.x).toBeGreaterThanOrEqual(panel.x);
        expect(r.x + r.w).toBeLessThanOrEqual(panel.x + panel.w);
        expect(r.y + r.h).toBeLessThanOrEqual(panel.y + panel.h);
      }
    }
  });

  it('is centred alone, and moves the bench rows left of it so they never overlap', () => {
    const alone = stagePanelLayout(0);
    expect(alone.benchShift).toBe(0);
    expect(alone.panel.x + alone.panel.w / 2).toBeCloseTo(VIEW_WIDTH / 2, 0);
    for (const bench of [1, 3, 12]) {
      const { panel, benchShift } = stagePanelLayout(bench);
      for (const r of menuRows(bench)) expect(r.x + benchShift + r.w).toBeLessThan(panel.x);
      expect(Math.min(...menuRows(bench).map((r) => r.x + benchShift))).toBeGreaterThanOrEqual(0);
    }
  });
});
