import { describe, expect, it } from 'vitest';
import { STORM_TIERED_ROUNDS } from '../../src/data/objectives';
import { KIT_COUNT } from '../../src/data/sandbox';
import { ROUND_CHOICES } from '../../src/render/sandboxRows';
import { craftKnown } from '../../src/sim/crafting';
import { unlockedPieces } from '../../src/sim/placement';
import { createSandboxSim } from '../../src/sim/sandbox';
import { run } from './fight';

// 066 in the sandbox (044): it gives the storm tier's parts and every stormsteel and storm glass round, the Tempering
// coil is unlocked, its rows and the stormsteel rows are known, and the loadout panel offers every storm round.

const PARTS = ['stormsteel', 'storm-glass', 'stormsteel-arrowhead', 'stormsteel-casing', 'stormsteel-plate'];

describe('the sandbox and the storm tier (066)', () => {
  it('carries the storm parts and every stormsteel and storm glass round', () => {
    const s = createSandboxSim(1);
    for (const id of [...PARTS, ...STORM_TIERED_ROUNDS]) expect(s.inventory[id], id).toBe(KIT_COUNT);
  });

  it('has the Tempering coil unlocked, and every storm row known', () => {
    const s = createSandboxSim(1);
    run(s, 1);
    expect(unlockedPieces(s)).toContain('tempering-coil');
    for (const id of ['stormsteel', 'storm-glass', 'stormsteel-arrowhead', 'stormsteel-arrow', 'stormsteel-casing', 'stormsteel-bomb', 'storm-glass-bolt', 'stormsteel-plate', 'stormsteel-landmine']) expect(craftKnown(s, id), id).toBe(true);
  });

  it('offers every storm round in the loadout', () => {
    for (const id of STORM_TIERED_ROUNDS) expect(ROUND_CHOICES).toContain(id);
  });
});
