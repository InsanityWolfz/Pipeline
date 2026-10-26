import { describe, expect, it } from 'vitest';
import { TIERED_ROUNDS } from '../../src/data/objectives';
import { KIT_COUNT } from '../../src/data/sandbox';
import { ROUND_CHOICES } from '../../src/render/sandboxRows';
import { craftKnown } from '../../src/sim/crafting';
import { unlockedPieces } from '../../src/sim/placement';
import { createSandboxSim } from '../../src/sim/sandbox';
import { run } from './fight';

// 062 in the sandbox (044): it gives the tier parts and every tiered round, the Forge's machines are unlocked, the
// tier rows are known, and the loadout panel offers every tiered round for an entrance.

describe('the sandbox and the material tiers (062)', () => {
  it('carries the tier parts and every steel and glass round', () => {
    const s = createSandboxSim(1);
    for (const id of ['ley-steel', 'ley-glass', 'steel-arrowhead', 'steel-casing', 'steel-plate', ...TIERED_ROUNDS]) expect(s.inventory[id], id).toBe(KIT_COUNT);
    expect(TIERED_ROUNDS).toHaveLength(21);
  });

  it('has the Smelter and the kiln unlocked, and every tier row known', () => {
    const s = createSandboxSim(1);
    run(s, 1);
    expect(unlockedPieces(s)).toEqual(expect.arrayContaining(['smelter', 'kiln']));
    for (const id of ['ley-steel', 'ley-glass', 'steel-arrowhead', 'steel-arrow', 'steel-casing', 'steel-bomb', 'glass-bolt', 'steel-plate', 'steel-landmine']) expect(craftKnown(s, id), id).toBe(true);
  });

  it('offers every tiered round in the loadout', () => {
    for (const id of TIERED_ROUNDS) expect(ROUND_CHOICES).toContain(id);
  });
});
