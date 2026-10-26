import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/state';
import { knownRounds, roundsByFamily } from '../../src/sim/knownRounds';
import { die, run } from './fight';

// The rounds the player knows (040.2): hand-crafted or hand-applied, made by a machine, or
// carried at least once. Rounds never seen stay hidden, as recipes do before they're found.

describe('known rounds', () => {
  it('lists every round by family (Arrow, Bomb, Ley, Landmine), plain first', () => {
    const all = roundsByFamily();
    expect(all.slice(0, 2)).toEqual(['arrow', 'arrow+frost']);
    expect(all.indexOf('bomb')).toBeLessThan(all.indexOf('bomb+cluster'));
    expect(all.indexOf('bomb+frost+cluster')).toBeLessThan(all.indexOf('ley-bolt'));
    // 060: the seven Fire rounds, each after its family's Frost one (064: then its Lightning one). 062: then each family's tiered rounds.
    // 066: then its stormsteel ones.
    expect(all.slice(-11)).toEqual([
      'landmine+frost', 'landmine+fire', 'landmine+lightning', 'landmine+steel', 'landmine+steel+frost', 'landmine+steel+fire', 'landmine+steel+lightning',
      'landmine+stormsteel', 'landmine+stormsteel+frost', 'landmine+stormsteel+fire', 'landmine+stormsteel+lightning',
    ]);
    expect(all).toHaveLength(84);
  });

  it('knows a round once carried, and keeps it after it’s gone and through a KO', () => {
    const s = createSim(1);
    s.inventory = {};
    s.carried = [];
    expect(knownRounds(s)).not.toContain('bomb+frost');
    s.inventory['bomb+frost'] = 2;
    run(s, 1);
    expect(knownRounds(s)).toContain('bomb+frost');
    // Spent, then a real KO (the death plays out and the player wakes in the foundry): still known.
    s.inventory['bomb+frost'] = 0;
    die(s);
    run(s, 1);
    expect(s.inventory['bomb+frost'] ?? 0).toBe(0);
    expect(knownRounds(s)).toContain('bomb+frost');
    expect(s.carried).toContain('bomb+frost');
  });

  it('knows a round hand-crafted or hand-applied, or made by a machine', () => {
    const s = createSim(1);
    s.inventory = {};
    s.carried = [];
    s.crafted = [];
    expect(knownRounds(s)).toEqual([]);
    s.crafted.push('arrow');
    s.machineMade['ley-bolt+homing'] = 4;
    expect(knownRounds(s)).toEqual(['arrow', 'ley-bolt+homing']);
  });

  it('a start’s carried rounds are known from its first tick', () => {
    const s = createSim(1, { start: { ...createSim(1).start, inventory: { landmine: 3 } } });
    expect(knownRounds(s)).toContain('landmine');
  });
});
