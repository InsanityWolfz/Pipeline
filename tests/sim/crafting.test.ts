import { describe, expect, it } from 'vitest';
import { RECIPES, REVEALING_ITEMS } from '../../src/data/recipes';
import { TUTORIAL_START } from '../../src/data/player';
import { craft, craftKnown } from '../../src/sim/crafting';
import { createSim } from '../../src/sim/state';
import { arena, die, run, SEED } from './fight';

describe('crafting', () => {
  it.each(Object.values(RECIPES))('$id takes its inputs and adds its output', (recipe) => {
    const s = arena();
    s.link.attuned = true;
    // 038: the landmine chain shows once ley-iron has been carried; 062: the tiers' once ley-steel, ley glass and their inputs have.
    s.found = [...REVEALING_ITEMS];
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
    // 046: the final craft of each Region 1 chain doubled.
    expect(s.inventory).toMatchObject({ shaft: 1, arrowhead: 0, rope: 0, arrow: 8 });
    s.inventory = { casing: 1, fuse: 1, 'ley-dust': 1 };
    craft(s, 'bomb');
    expect(s.inventory.bomb).toBe(4);
  });

  it('knows the bomb and ley bolt chains from the start once their raws have been carried, with no attunement (067)', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    const chain = ['casing', 'fuse', 'ley-dust', 'bomb', 'ley-bolt'];
    const known = () => chain.filter((r) => craftKnown(s, r));
    expect(known()).toEqual([]);
    s.inventory = { stone: 1 };
    run(s, 1);
    expect(known()).toEqual(['casing']);
    s.inventory = { stone: 1, 'husk-resin': 1, 'ley-crystal': 2 };
    run(s, 1);
    expect(known()).toEqual(chain);
    expect([s.link.attuned, s.gates.foundry]).toEqual([false, false]);
    for (const r of ['casing', 'fuse', 'ley-dust', 'ley-dust', 'bomb', 'ley-bolt']) expect(craft(s, r), r).toBe(true);
    expect(s.inventory).toMatchObject({ bomb: 4, 'ley-bolt': 4 });
    // Known for good: the raws spent and a KO taken.
    die(s);
    expect(known()).toEqual(chain);
  });

  it('every recipe is known once what it is shown after has been carried, never waiting on attunement (067)', () => {
    const s = createSim(SEED, { start: TUTORIAL_START });
    s.found = [...REVEALING_ITEMS];
    expect(s.link.attuned).toBe(false);
    for (const id of Object.keys(RECIPES)) expect(craftKnown(s, id), id).toBe(true);
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
    s.link.attuned = true; // Past the first foundry entry: before it, a KO loses nothing (067.16).
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
