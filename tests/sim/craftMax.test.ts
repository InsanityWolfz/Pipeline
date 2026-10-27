import { describe, expect, it } from 'vitest';
import { recipeDef } from '../../src/data/recipes';
import { stageRow } from '../../src/data/stages';
import { craft, craftMax, maxBatches } from '../../src/sim/crafting';
import { arena } from './fight';
import { foundry } from './foundryKit';

// 070: Shift-click on a crafting row crafts as many as the inventory can afford, as one action (one event); a plain
// click still crafts one.

const ARROW = recipeDef('arrow');
const FROST = stageRow('frost-rune-arrow');

describe('craft max (070)', () => {
  it('makes as many batches as the inputs allow, as one craft event', () => {
    const s = arena();
    s.inventory = { shaft: 4, arrowhead: 5, rope: 7 };
    expect(maxBatches(s, 'arrow')).toBe(4);
    expect(craftMax(s, 'arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ shaft: 0, arrowhead: 1, rope: 3, arrow: 4 * ARROW.output.count });
    expect(s.events.crafts).toEqual([{ recipeId: 'arrow', batches: 4 }]);
    expect(s.crafted).toEqual(['arrow']);
  });

  it('with inputs for one batch, crafts one, its event still naming its batch (one feed line)', () => {
    const s = arena();
    s.inventory = { shaft: 1, arrowhead: 1, rope: 3 };
    expect(craftMax(s, 'arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ shaft: 0, arrowhead: 0, rope: 2, arrow: ARROW.output.count });
    expect(s.events.crafts).toEqual([{ recipeId: 'arrow', batches: 1 }]);
  });

  it('a plain craft still makes one batch', () => {
    const s = arena();
    s.inventory = { shaft: 4, arrowhead: 4, rope: 4 };
    expect(craft(s, 'arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ shaft: 3, arrowhead: 3, rope: 3, arrow: ARROW.output.count });
    expect(s.events.crafts).toEqual([{ recipeId: 'arrow' }]);
  });

  it('changes nothing but a failure event when it cannot afford one', () => {
    const s = arena();
    s.inventory = { shaft: 3, arrowhead: 3 };
    expect(maxBatches(s, 'arrow')).toBe(0);
    expect(craftMax(s, 'arrow')).toBe(false);
    expect(s.inventory).toEqual({ shaft: 3, arrowhead: 3 });
    expect(s.events.crafts).toEqual([]);
    expect(s.events.craftFails).toEqual([{ recipeId: 'arrow' }]);
  });

  it('a one-input recipe makes a batch per input held', () => {
    const s = arena();
    s.inventory = { wood: 3 };
    expect(maxBatches(s, 'shaft')).toBe(3);
    craftMax(s, 'shaft');
    expect(s.inventory).toMatchObject({ wood: 0, shaft: 3 * recipeDef('shaft').output.count });
  });

  describe('a tagged round', () => {
    function shrine() {
      const s = foundry(false);
      s.claims.push('shrine');
      return s;
    }
    const need = (id: string): number => FROST?.recipe.inputs[id] ?? 0;
    const made = FROST?.recipe.output.count ?? 0;

    it('counts only what is carried, leaving the intake entrances alone', () => {
      const s = shrine();
      s.inventory = { arrow: need('arrow') * 2 + 1, rimestone: 5 };
      const entrance = s.link.entrances[0];
      if (!entrance) throw new Error('no entrance');
      Object.assign(entrance, { ammoId: 'arrow', count: 40 });
      expect(maxBatches(s, 'frost-rune-arrow')).toBe(2);
      expect(craftMax(s, 'frost-rune-arrow')).toBe(true);
      expect(s.inventory).toMatchObject({ arrow: 1, rimestone: 5 - 2 * need('rimestone'), 'arrow+frost': 2 * made });
      expect(entrance.count).toBe(40);
      expect(s.events.crafts).toEqual([{ recipeId: 'frost-rune-arrow', batches: 2 }]);
    });

    it('with the carried rounds short but the entrances making up the rest, crafts one as a plain click would', () => {
      const s = shrine();
      s.inventory = { arrow: 1, rimestone: 5 };
      const entrance = s.link.entrances[0];
      if (!entrance) throw new Error('no entrance');
      Object.assign(entrance, { ammoId: 'arrow', count: 40 });
      expect(craftMax(s, 'frost-rune-arrow')).toBe(true);
      expect(s.inventory).toMatchObject({ arrow: 0, 'arrow+frost': made });
      expect(entrance.count).toBe(40 - (need('arrow') - 1));
      expect(s.events.crafts).toEqual([{ recipeId: 'frost-rune-arrow', batches: 1 }]);
    });
  });
});
