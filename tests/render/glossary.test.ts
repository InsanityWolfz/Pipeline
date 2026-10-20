import { describe, expect, it } from 'vitest';
import { KEYWORDS, type KeywordId } from '../../src/data/keywords';
import { TALENT_START } from '../../src/data/talents';
import { describeKeyword } from '../../src/render/describe';
import { texts } from '../../src/render/tipTypes';
import { createSim, type SimState } from '../../src/sim/state';

// The glossary (040): every entry generated from 039's data: name, group and chip; the rule
// with the data's numbers and "yours:" where the player's bonuses change one; Sources,
// Payoffs ("None yet" for a debt keyword's further ones) and Changes.

function player(...talents: string[]): SimState {
  const s = createSim(1);
  s.talents = [TALENT_START, ...talents];
  s.crafted = ['arrow', 'bomb', 'bomb+cluster', 'landmine'];
  return s;
}

const entry = (s: SimState, id: KeywordId | 'all-ammo' | 'you') => {
  const d = describeKeyword(s, id);
  if (!d) throw new Error(`no entry for ${id}`);
  return d;
};

describe('glossary entries', () => {
  it('Pool: Blastfletch as source and payoff, and "None yet" for further payoffs (it’s in the debt)', () => {
    const lines = texts(entry(player(), 'pool').breakdown);
    expect(lines[0]).toBe('Ground');
    expect(lines).toContain('Sources: Blastfletch');
    expect(lines).toContain('Payoffs: Blastfletch (more: None yet)');
    expect(lines).toContain('Changes: duration');
  });

  it('Burst: its rule with "yours:" under Wide Casing, Wide Casing among its payoffs, known rounds among its sources', () => {
    const d = entry(player('b1', 'b2'), 'burst');
    const lines = texts(d.breakdown);
    // 041: the bomb's 12 (was 15, yours 16.5).
    expect(lines[1]).toBe('Deals 12 (yours: 13.2) to every enemy within 48 px (yours: 55.2 px). Ignores Shield. No Knockback.');
    expect(lines.find((l) => l.startsWith('Payoffs:'))).toContain('Wide Casing');
    expect(lines.find((l) => l.startsWith('Sources:'))).toBe('Sources: Bomb, Cluster bomb, Landmine, Blastfletch, Mine');
    expect(d.chips.map((c) => c.id)).toEqual(['burst', 'mine', 'shield', 'knockback']);
    expect(texts(entry(player(), 'burst').breakdown)[1]).toBe('Deals 12 to every enemy within 48 px. Ignores Shield. No Knockback.'); // 041: was 15
  });

  it('a keyword with no payoff says "None yet"; times read to 2 decimals where 1 isn’t exact', () => {
    const lines = texts(entry(player(), 'stun').breakdown);
    expect(lines).toContain('Payoffs: None yet');
    expect(lines[1]).toContain('0.67 s');
  });

  it('All ammo and You have their own entries (039.1)', () => {
    expect(texts(entry(player(), 'all-ammo').breakdown)).toContain('Payoffs: Oiled Breech, Hard Bore, Overpressure');
    expect(texts(entry(player(), 'you').breakdown).find((l) => l.startsWith('Payoffs:'))).toContain('gear affixes');
  });

  it('reserved keywords have no entry; every live one has one', () => {
    for (const k of Object.values(KEYWORDS)) {
      const d = describeKeyword(player(), k.id);
      if (k.state === 'reserved') expect(d, k.id).toBeNull();
      else expect(d?.name, k.id).toBe(k.name);
    }
  });
});
