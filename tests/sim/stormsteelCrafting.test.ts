import { describe, expect, it } from 'vitest';
import { LEFT_OUT_OF_KIT, PLAYTEST_START } from '../../src/data/playtest';
import { craft, craftKnown } from '../../src/sim/crafting';
import { knownRounds } from '../../src/sim/knownRounds';
import { unlockedPieces } from '../../src/sim/placement';
import type { SimState } from '../../src/sim/state';
import { arena, run } from './fight';

// 066: hand-crafting the storm tier. The Tempering coil's rows show once ley-steel (or ley glass) and stormglass have
// been carried, and tempering either at the bench unlocks the coil; each family's stormsteel rows show once stormsteel
// (the storm glass bolt's once storm glass) has been carried.

const STORMSTEEL_ROWS = ['stormsteel-arrowhead', 'stormsteel-arrow', 'stormsteel-casing', 'stormsteel-bomb', 'stormsteel-plate', 'stormsteel-landmine'];

function attuned(): SimState {
  const s = arena();
  s.link.attuned = true;
  s.inventory = {};
  s.found = [];
  return s;
}

/** Carries items for a tick, so they're found (038). */
function carry(s: SimState, items: Record<string, number>): void {
  Object.assign(s.inventory, items);
  run(s, 1);
}

describe('the Tempering coil’s rows (066)', () => {
  it('stormsteel shows once ley-steel and stormglass have been carried; storm glass once ley glass and stormglass have', () => {
    const s = attuned();
    carry(s, { 'ley-steel': 1, 'ley-glass': 1 });
    expect(craftKnown(s, 'stormsteel')).toBe(false);
    expect(craftKnown(s, 'storm-glass')).toBe(false);
    const t = attuned();
    carry(t, { stormglass: 1 });
    expect(craftKnown(t, 'stormsteel')).toBe(false);
    carry(t, { 'ley-steel': 1 });
    expect(craftKnown(t, 'stormsteel')).toBe(true);
    expect(craftKnown(t, 'storm-glass')).toBe(false);
    carry(t, { 'ley-glass': 1 });
    expect(craftKnown(t, 'storm-glass')).toBe(true);
  });

  it('storm glass waits for the tube’s attunement, as ley glass does', () => {
    const s = attuned();
    s.found = ['ley-glass', 'stormglass', 'ley-steel'];
    s.link.attuned = false;
    s.gates.foundry = false;
    expect(craftKnown(s, 'storm-glass')).toBe(false);
    expect(craftKnown(s, 'stormsteel')).toBe(true);
  });

  it('hand-crafting stormsteel unlocks the coil; so does hand-crafting storm glass', () => {
    for (const [made, inputs] of [['stormsteel', { 'ley-steel': 1, stormglass: 1 }], ['storm-glass', { 'ley-glass': 1, stormglass: 1 }]] as const) {
      const s = attuned();
      carry(s, inputs);
      expect(unlockedPieces(s), made).not.toContain('tempering-coil');
      expect(craft(s, made)).toBe(true);
      expect(s.inventory[made]).toBe(1);
      expect(s.inventory.stormglass).toBe(0);
      expect(unlockedPieces(s), made).toContain('tempering-coil');
      expect(unlockedPieces(s).at(-1)).toBe('tempering-coil');
    }
  });

  it('a machine unlocks once anything it makes has been hand-made: a stormsteel arrowhead unlocks the knapper', () => {
    const s = attuned();
    s.crafted = [];
    expect(unlockedPieces(s)).not.toContain('knapper');
    s.crafted = ['stormsteel-arrowhead'];
    expect(unlockedPieces(s)).toContain('knapper');
    expect(unlockedPieces(s)).not.toContain('assembler');
  });
});

describe('the stormsteel rows in the family tabs (066)', () => {
  it('show once stormsteel has been carried; the storm glass bolt once storm glass has', () => {
    const s = attuned();
    carry(s, { 'ley-steel': 1, stormglass: 1 });
    for (const id of [...STORMSTEEL_ROWS, 'storm-glass-bolt']) expect(craftKnown(s, id), id).toBe(false);
    carry(s, { stormsteel: 1 });
    for (const id of STORMSTEEL_ROWS) expect(craftKnown(s, id), id).toBe(true);
    expect(craftKnown(s, 'storm-glass-bolt')).toBe(false);
    carry(s, { 'storm-glass': 1 });
    expect(craftKnown(s, 'storm-glass-bolt')).toBe(true);
  });

  it('a stormsteel arrow crafted by hand is a known round, from a stormsteel arrowhead and the shared shaft and rope', () => {
    const s = attuned();
    carry(s, { stormsteel: 1 });
    s.inventory = { stormsteel: 1, shaft: 1, rope: 1 };
    expect(craft(s, 'stormsteel-arrowhead')).toBe(true);
    expect(s.inventory['stormsteel-arrowhead']).toBe(2);
    expect(craft(s, 'stormsteel-arrow')).toBe(true);
    expect(s.inventory).toMatchObject({ 'arrow+stormsteel': 8, 'stormsteel-arrowhead': 1, shaft: 0, rope: 0 });
    run(s, 1);
    expect(knownRounds(s)).toContain('arrow+stormsteel');
  });
});

describe('the playtest kit (066)', () => {
  it('leaves the storm tier’s parts out, carrying the raws and stormglass they come from', () => {
    for (const id of ['stormsteel', 'storm-glass', 'stormsteel-arrowhead', 'stormsteel-casing', 'stormsteel-plate']) {
      expect(LEFT_OUT_OF_KIT).toContain(id);
      expect(PLAYTEST_START.inventory[id], id).toBeUndefined();
    }
    for (const id of ['ley-iron', 'cinderite', 'ley-dust', 'stormglass']) expect(PLAYTEST_START.inventory[id], id).toBeGreaterThan(0);
  });
});
