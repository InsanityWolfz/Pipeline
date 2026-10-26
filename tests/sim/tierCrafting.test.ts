import { describe, expect, it } from 'vitest';
import { CRAFT_TABS } from '../../src/data/craftTabs';
import { craft, craftKnown } from '../../src/sim/crafting';
import { knownRounds } from '../../src/sim/knownRounds';
import { unlockedPieces } from '../../src/sim/placement';
import type { SimState } from '../../src/sim/state';
import { arena, run } from './fight';

// 062: hand-crafting the tiers. The Smelter's and the kiln's rows show once both their inputs have been carried, and
// crafting their material once at the bench unlocks the machine; each family's tier rows show once its tier part
// (ley-steel, ley glass) has been carried.

const STEEL_ROWS = ['steel-arrowhead', 'steel-arrow', 'steel-casing', 'steel-bomb', 'steel-plate', 'steel-landmine'];

function attuned(): SimState {
  const s = arena();
  s.link.attuned = true;
  s.inventory = {};
  s.found = [];
  return s;
}

/** Carries items for a tick, so they're found (038), then puts them down again. */
function carry(s: SimState, items: Record<string, number>): void {
  Object.assign(s.inventory, items);
  run(s, 1);
}

describe('the Smelter’s and the kiln’s rows (062)', () => {
  it('show only once both of their inputs have been carried', () => {
    const s = attuned();
    expect(craftKnown(s, 'ley-steel')).toBe(false);
    carry(s, { 'ley-iron': 1 });
    expect(craftKnown(s, 'ley-steel')).toBe(false);
    carry(s, { cinderite: 1 });
    expect(craftKnown(s, 'ley-steel')).toBe(true);
    expect(craftKnown(s, 'ley-glass')).toBe(false);
    carry(s, { 'ley-dust': 1 });
    expect(craftKnown(s, 'ley-glass')).toBe(true);
  });

  it('crafting ley-steel by hand unlocks the Smelter, and ley glass the kiln', () => {
    const s = attuned();
    carry(s, { 'ley-iron': 2, cinderite: 2, 'ley-dust': 1 });
    expect(unlockedPieces(s)).not.toContain('smelter');
    expect(unlockedPieces(s)).not.toContain('kiln');
    expect(craft(s, 'ley-steel')).toBe(true);
    expect(s.inventory).toMatchObject({ 'ley-iron': 1, cinderite: 1, 'ley-steel': 1 });
    expect(unlockedPieces(s)).toContain('smelter');
    expect(unlockedPieces(s)).not.toContain('kiln');
    expect(craft(s, 'ley-glass')).toBe(true);
    expect(unlockedPieces(s)).toContain('kiln');
    expect(unlockedPieces(s).slice(-2)).toEqual(['smelter', 'kiln']);
  });
});

describe('the tier rows in the family tabs (062)', () => {
  it('show once their tier part has been carried: steel rows after ley-steel, the glass bolt after ley glass', () => {
    const s = attuned();
    carry(s, { 'ley-iron': 1, cinderite: 1 });
    for (const id of [...STEEL_ROWS, 'glass-bolt']) expect(craftKnown(s, id), id).toBe(false);
    carry(s, { 'ley-steel': 1 });
    for (const id of STEEL_ROWS) expect(craftKnown(s, id), id).toBe(true);
    expect(craftKnown(s, 'glass-bolt')).toBe(false);
    carry(s, { 'ley-glass': 1 });
    expect(craftKnown(s, 'glass-bolt')).toBe(true);
    // Every tab's tier rows, the kiln's ley glass once ley dust has been carried too.
    carry(s, { 'ley-dust': 1 });
    const tierRows = CRAFT_TABS.flatMap((t) => t.recipes.slice(t.tierFrom));
    for (const id of tierRows) expect(craftKnown(s, id), id).toBe(true);
  });

  it('a steel arrow crafted by hand is a known round, from a steel arrowhead and the shared shaft and rope', () => {
    const s = attuned();
    carry(s, { 'ley-steel': 1 });
    s.inventory = { 'ley-steel': 1, shaft: 1, rope: 1 };
    expect(craft(s, 'steel-arrowhead')).toBe(true);
    expect(s.inventory['steel-arrowhead']).toBe(2);
    expect(craft(s, 'steel-arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ 'arrow+steel': 8, 'steel-arrowhead': 1, shaft: 0, rope: 0 });
    expect(knownRounds(s)).toContain('arrow+steel');
  });
});
