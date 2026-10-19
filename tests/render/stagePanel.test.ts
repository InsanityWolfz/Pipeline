import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { GEAR_PANEL } from '../../src/data/gearAssets';
import { STAGES } from '../../src/data/stages';
import { stagePanelLayout } from '../../src/render/stagePanelLayout';
import { gearPanelLayout } from '../../src/render/gearPanelLayout';

// The bench's Stages panel (029): beside the bench's gear panel (036), on screen, never over it.

describe('the Stages panel layout', () => {
  it('has a row per stage, inside its panel, and the panel on screen', () => {
    for (const bench of [0, GEAR_PANEL.w]) {
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

  it('is centred alone, and sits right of the gear panel with the pair centred, never over it', () => {
    const alone = stagePanelLayout(0);
    expect(alone.panel.x + alone.panel.w / 2).toBeCloseTo(VIEW_WIDTH / 2, 0);
    const { panel } = stagePanelLayout(GEAR_PANEL.w);
    const gear = gearPanelLayout(true, [], 0).panel;
    expect(gear.x + gear.w).toBeLessThan(panel.x);
    expect(gear.x).toBeGreaterThanOrEqual(0);
    expect(gear.x - 0).toBeCloseTo(VIEW_WIDTH - (panel.x + panel.w), 0);
  });
});
