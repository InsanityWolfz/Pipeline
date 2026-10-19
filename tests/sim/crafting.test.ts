import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../src/data/recipes';
import { craft } from '../../src/sim/crafting';
import { arena, die } from './fight';

describe('crafting', () => {
  it.each(Object.values(RECIPES))('$id takes its inputs and adds its output', (recipe) => {
    const s = arena();
    s.link.attuned = true;
    // 038: the landmine chain shows once ley-iron has been carried.
    s.found = ['ley-iron'];
    s.inventory = { ...recipe.inputs };
    expect(craft(s, recipe.id)).toBe(true);
    for (const id of Object.keys(recipe.inputs)) if (id !== recipe.output.itemId) expect(s.inventory[id]).toBe(0);
    expect(s.inventory[recipe.output.itemId]).toBe(recipe.output.count);
    expect(s.events.crafts).toEqual([{ recipeId: recipe.id }]);
  });

  it('makes the specced amounts', () => {
    const s = arena();
    s.link.attuned = true;
    s.inventory = { wood: 1, shaft: 0, arrowhead: 1, rope: 1, arrow: 0 };
    craft(s, 'shaft');
    expect(s.inventory.shaft).toBe(2);
    craft(s, 'arrow');
    expect(s.inventory).toMatchObject({ shaft: 1, arrowhead: 0, rope: 0, arrow: 4 });
    s.inventory = { casing: 1, fuse: 1, 'ley-dust': 1 };
    craft(s, 'bomb');
    expect(s.inventory.bomb).toBe(2);
  });

  it('refuses bomb and ley bolt recipes until the tube attunes (012)', () => {
    const s = arena();
    s.inventory = { 'ley-crystal': 1, stone: 1 };
    expect(craft(s, 'ley-dust')).toBe(false);
    expect(craft(s, 'casing')).toBe(false);
    expect(s.events.craftFails).toEqual([{ recipeId: 'ley-dust' }, { recipeId: 'casing' }]);
    s.link.attuned = true;
    expect(craft(s, 'ley-dust')).toBe(true);
  });

  it('does nothing when any input is short, and records the failure', () => {
    const s = arena();
    s.inventory = { shaft: 1, arrowhead: 1 };
    expect(craft(s, 'arrow')).toBe(false);
    expect(s.inventory).toEqual({ shaft: 1, arrowhead: 1 });
    expect(s.events.craftFails).toEqual([{ recipeId: 'arrow' }]);
    expect(s.events.crafts).toEqual([]);
    expect(s.crafted).toEqual([]);
  });

  it('records each crafted item once, sorted', () => {
    const s = arena();
    s.inventory = { wood: 2, stone: 1 };
    craft(s, 'shaft');
    craft(s, 'shaft');
    craft(s, 'arrowhead');
    expect(s.crafted).toEqual(['arrowhead', 'shaft']);
  });

  it('keeps the crafted set through a death; the unbanked rope is lost', () => {
    const s = arena();
    s.inventory = { fiber: 1 };
    s.banked = {};
    craft(s, 'rope');
    die(s);
    expect(s.crafted).toEqual(['rope']);
    expect(s.inventory.rope).toBeUndefined();
  });

  it('throws on an unknown recipe', () => {
    expect(() => craft(arena(), 'nope')).toThrow();
  });
});
