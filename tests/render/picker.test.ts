import { describe, expect, it } from 'vitest';
import { pickerEntries } from '../../src/render/foundryLayout';

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
