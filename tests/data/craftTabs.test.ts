import { describe, expect, it } from 'vitest';
import { CRAFT_TAB_COLUMNS, CRAFT_TAB_ROWS, CRAFT_TABS, craftRecipeDef } from '../../src/data/craftTabs';
import { ITEMS } from '../../src/data/items';
import { CRAFT_MENU_LAYOUT } from '../../src/data/hudLayout';
import { OBJECTIVES } from '../../src/data/objectives';
import { roundBase } from '../../src/data/tags';

// 047 (notes 6 and 15): a crafting tab per ammo family, each holding its whole chain, parts included, then its
// tagged rounds, crafted like any recipe. Tagged rounds are never called "stages" where the player sees them.

describe('the crafting tabs (047)', () => {
  it('are Arrows, Bombs, Ley and Landmines, each its whole chain then its tagged rounds', () => {
    expect(CRAFT_TABS.map((t) => [t.label, t.recipes.slice(0, t.tierFrom)])).toEqual([
      // 060: the Fire rune's rows beside the frost rune's (shown once cinderite is carried).
      ['Arrows', ['shaft', 'arrowhead', 'rope', 'arrow', 'frost-rune-arrow', 'fire-rune-arrow']],
      ['Bombs', ['casing', 'fuse', 'ley-dust', 'bomb', 'frost-rune-bomb', 'fire-rune-bomb', 'cluster-die-bomb']],
      ['Ley', ['ley-dust', 'ley-bolt', 'frost-rune-ley-bolt', 'fire-rune-ley-bolt', 'ley-guide-ley-bolt', 'prism-lens-ley-bolt']],
      ['Landmines', ['iron-plate', 'fuse', 'ley-dust', 'landmine', 'frost-rune-landmine', 'fire-rune-landmine']],
    ]);
  });

  it('062: then its tier’s chain, the Smelter’s or the kiln’s material first, in a column of their own', () => {
    expect(CRAFT_TABS.map((t) => [t.label, t.recipes.slice(t.tierFrom)])).toEqual([
      ['Arrows', ['ley-steel', 'steel-arrowhead', 'steel-arrow']],
      ['Bombs', ['ley-steel', 'steel-casing', 'steel-bomb']],
      ['Ley', ['ley-glass', 'glass-bolt']],
      ['Landmines', ['ley-steel', 'steel-plate', 'steel-landmine']],
    ]);
    expect(CRAFT_TAB_ROWS).toBe(7);
    expect(CRAFT_TAB_COLUMNS).toBe(2);
  });

  it('show a part two families use in each (fuse, ley dust)', () => {
    const tabsWith = (id: string) => CRAFT_TABS.filter((t) => t.recipes.includes(id)).map((t) => t.label);
    expect(tabsWith('fuse')).toEqual(['Bombs', 'Landmines']);
    expect(tabsWith('ley-dust')).toEqual(['Bombs', 'Ley', 'Landmines']);
  });

  it("put each tagged round in its family's tab: frost arrows under Arrows, Frost ley bolts under Ley", () => {
    for (const t of CRAFT_TABS) {
      for (const id of t.recipes) {
        const out = craftRecipeDef(id).output.itemId;
        expect(ITEMS[out], id).toBeDefined();
        // Each tab's rounds are its own family's (a part or raw-made input aside).
        if (ITEMS[out]?.kind === 'ammo') expect(roundBase(out), `${t.label}: ${id}`).toBe(t.ammoId);
      }
    }
    expect(craftRecipeDef('frost-rune-arrow')).toMatchObject({ inputs: { arrow: 4, rimestone: 1 }, output: { itemId: 'arrow+frost', count: 4 } });
  });

  it('never call a tagged round a stage (Shaun)', () => {
    const shown = [...CRAFT_TABS.map((t) => t.label), CRAFT_MENU_LAYOUT.title.text, ...OBJECTIVES.map((o) => o.text)];
    for (const text of shown) expect(text, text).not.toMatch(/\bstages?\b/i);
  });
});
