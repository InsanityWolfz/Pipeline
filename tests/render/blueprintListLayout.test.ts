import { describe, expect, it } from 'vitest';
import { BLUEPRINT_SLOTS } from '../../src/data/blueprints';
import { VIEW_WIDTH } from '../../src/data/config';
import { blueprintListLayout } from '../../src/render/blueprintListLayout';
import { toolsBox } from '../../src/render/blueprintLayout';

// 063: the blueprint list sits over the Tools group, inside the view with all 8 slots, each row's delete mark at its
// right end, inside the row.

describe('the blueprint list layout (063)', () => {
  it('fits 8 rows in the view, above the Tools group', () => {
    const L = blueprintListLayout(BLUEPRINT_SLOTS);
    expect(L.panel.y).toBeGreaterThanOrEqual(0);
    expect(L.panel.x).toBeGreaterThanOrEqual(0);
    expect(L.panel.x + L.panel.w).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(L.panel.y + L.panel.h).toBeLessThanOrEqual(toolsBox().y);
    expect(L.rows).toHaveLength(BLUEPRINT_SLOTS);
    for (const r of L.rows) {
      expect(r.y + r.h).toBeLessThanOrEqual(L.panel.y + L.panel.h);
      expect(r.del.x + r.del.w).toBeLessThanOrEqual(r.x + r.w);
      expect(r.del.x).toBeGreaterThan(r.x + r.w / 2);
      expect(r.del.y + r.del.h).toBeLessThanOrEqual(r.y + r.h);
    }
  });

  it('keeps one row of room when empty, its bottom where a full list ends', () => {
    const empty = blueprintListLayout(0);
    expect(empty.rows).toEqual([]);
    expect(empty.panel.y + empty.panel.h).toBe(blueprintListLayout(8).panel.y + blueprintListLayout(8).panel.h);
    expect(empty.panel.h).toBe(blueprintListLayout(1).panel.h);
  });
});
