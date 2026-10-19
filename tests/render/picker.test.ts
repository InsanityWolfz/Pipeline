import { describe, expect, it } from 'vitest';
import { menuRows, pickerEntries } from '../../src/render/foundryLayout';
import { ITEMS } from '../../src/data/items';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { MENU_MAX_ROWS } from '../../src/data/hudLayout';

describe('hopper menu rows', () => {
  it('an empty hopper lists every held item to put in, in item order', () => {
    expect(pickerEntries({ item: null, count: 0 }, { stone: 2, wood: 1, fiber: 0 })).toEqual([
      { action: 'put', itemId: 'wood' },
      { action: 'put', itemId: 'stone' },
    ]);
  });

  it('a filled hopper offers to take out, then to put in more of the same if any is held', () => {
    expect(pickerEntries({ item: 'wood', count: 3 }, { wood: 2, stone: 5 })).toEqual([
      { action: 'take', itemId: 'wood' },
      { action: 'put', itemId: 'wood' },
    ]);
    expect(pickerEntries({ item: 'wood', count: 3 }, { stone: 5 })).toEqual([{ action: 'take', itemId: 'wood' }]);
  });
});

describe('site menu rows', () => {
  it("stay inside the view however many rows: a sorter's menu lists every item and None (038 added three)", () => {
    for (const n of [1, 10, 21, 30, 1 + Object.keys(ITEMS).length]) {
      const rows = menuRows(n);
      expect(rows).toHaveLength(n);
      for (const r of rows) {
        expect(r.x, `${n} rows`).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, `${n} rows`).toBeLessThanOrEqual(VIEW_WIDTH);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y + r.h).toBeLessThanOrEqual(VIEW_HEIGHT);
      }
    }
    // Up to MENU_MAX_ROWS a column, as before, while the columns fit.
    expect(new Set(menuRows(30).map((r) => r.x)).size).toBe(3);
    expect(menuRows(30).filter((r) => r.x === menuRows(30)[0]?.x)).toHaveLength(MENU_MAX_ROWS);
  });
});
