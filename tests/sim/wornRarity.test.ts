import { describe, expect, it } from 'vitest';
import { RARITY_ORDER, RARITIES, type Rarity } from '../../src/data/gear';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { wornRarity } from '../../src/sim/worn';
import { SEED } from './fight';
import { piece, wear } from '../fixtures/gear';

// 075: the cloak's trim shows the rarity of the best piece worn, over all four slots. The sim decides it; render only
// reads `getState().wornRarity`.

describe('the worn rarity (075)', () => {
  it('ranks the rarities lowest first, each once', () => {
    expect(RARITY_ORDER).toEqual(['common', 'fine', 'rare', 'relic']);
    expect([...RARITY_ORDER].sort()).toEqual((Object.keys(RARITIES) as Rarity[]).sort());
  });

  it('is null with nothing worn', () => {
    const s = createSim(SEED);
    expect(wornRarity(s)).toBeNull();
    expect(summarize(s).wornRarity).toBeNull();
  });

  it('is the one piece worn', () => {
    expect(wornRarity(wear(createSim(SEED), piece(1, 'boots', { rarity: 'fine' })))).toBe('fine');
    expect(wornRarity(wear(createSim(SEED), piece(1, 'trinket', { rarity: 'common' })))).toBe('common');
  });

  it('is the highest of several, a relic over a rare and a rare over a fine', () => {
    const s = wear(createSim(SEED), piece(1, 'helm', { rarity: 'rare' }), piece(2, 'body', { rarity: 'common' }), piece(3, 'trinket', { rarity: 'relic', relic: null }));
    expect(wornRarity(s)).toBe('relic');
    const t = wear(createSim(SEED), piece(1, 'helm', { rarity: 'fine' }), piece(2, 'boots', { rarity: 'rare' }));
    expect(wornRarity(t)).toBe('rare');
    expect(summarize(t).wornRarity).toBe('rare');
  });

  it('drops back when the best piece comes off, and only counts what is worn', () => {
    const s = wear(createSim(SEED), piece(1, 'helm', { rarity: 'fine' }), piece(2, 'body', { rarity: 'rare' }));
    // A relic carried but not worn doesn't count.
    s.gear.push(piece(3, 'trinket', { rarity: 'relic' }));
    expect(wornRarity(s)).toBe('rare');
    s.equipped = { ...s.equipped, body: null };
    expect(wornRarity(s)).toBe('fine');
    s.equipped = { ...s.equipped, helm: null };
    expect(wornRarity(s)).toBeNull();
  });
});
