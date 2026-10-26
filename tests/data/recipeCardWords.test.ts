import { describe, expect, it } from 'vitest';
import { RECIPE_CARD } from '../../src/data/descriptions';
import { ITEMS } from '../../src/data/items';

// 069: a recipe card's uncounted items (read as amounts: "2 ley dust") are real items.

describe('recipe card words (069)', () => {
  it('every uncounted id is an item', () => {
    expect(RECIPE_CARD.uncounted.filter((id) => ITEMS[id] === undefined)).toEqual([]);
  });
});
