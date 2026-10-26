import { describe, expect, it } from 'vitest';
import { BUILD_BAR, machineRecipeIds, pieceDef } from '../../src/data/pieces';
import { TUTORIAL_START } from '../../src/data/player';
import { RECIPES, REVEALING_ITEMS, recipeDef } from '../../src/data/recipes';
import { craft, craftKnown } from '../../src/sim/crafting';
import { unlockedPieces } from '../../src/sim/placement';
import { createSim, type SimState } from '../../src/sim/state';
import { arena, run } from './fight';

// 066.1: a machine unlocks once anything it makes has been hand-crafted (design.md, "Unlocks": "Crafting something by
// hand once unlocks the machine that makes it"), not only its first recipe's output as on 065. So a player who skipped
// landmines unlocks the plate press with a Steel plate, or the mine packer with a Steel landmine, once ley-steel has
// been carried. Before any tier material has been carried, nothing changes: the guided tutorial (058) unlocks nothing early.

/** A player who has hand-crafted nothing, the tube attuned. */
function fresh(): SimState {
  const s = arena();
  s.link.attuned = true;
  s.inventory = {};
  s.found = [];
  s.crafted = [];
  return s;
}

/** Carries items for a tick, so they're found (038). */
function carry(s: SimState, items: Record<string, number>): void {
  Object.assign(s.inventory, items);
  run(s, 1);
}

/** The tier materials: carrying any of them starts a tier's rows (062, 066). */
const TIER_MATERIALS = ['ley-steel', 'ley-glass', 'stormsteel', 'storm-glass'];

describe('what unlocks a machine (066.1)', () => {
  it('a Steel plate hand-crafted unlocks the plate press, with no iron plate ever made', () => {
    const s = fresh();
    carry(s, { 'ley-steel': 1 });
    expect(unlockedPieces(s)).not.toContain('plate-press');
    expect(craft(s, 'steel-plate')).toBe(true);
    expect(s.crafted).toEqual(['steel-plate']);
    expect(unlockedPieces(s)).toContain('plate-press');
    expect(unlockedPieces(s)).not.toContain('mine-packer');
  });

  it('a Steel landmine hand-crafted unlocks the mine packer, with no landmine ever made', () => {
    const s = fresh();
    carry(s, { 'ley-steel': 1, 'steel-plate': 1, fuse: 1, 'ley-dust': 1 });
    expect(unlockedPieces(s)).not.toContain('mine-packer');
    expect(craft(s, 'steel-landmine')).toBe(true);
    expect(s.crafted).toEqual(['landmine+steel']);
    expect(unlockedPieces(s)).toContain('mine-packer');
    expect(unlockedPieces(s)).not.toContain('plate-press');
  });

  it('in the guided tutorial (058), nothing unlocks early: before a tier material is carried, a machine unlocks only from its own recipe', () => {
    const s = createSim(3, { start: TUTORIAL_START });
    s.link.attuned = true;
    s.gates.foundry = true;
    // Everything found but the tier materials, and everything the bench then knows hand-crafted.
    s.found = REVEALING_ITEMS.filter((id) => !TIER_MATERIALS.includes(id));
    s.crafted = Object.keys(RECIPES)
      .filter((r) => craftKnown(s, r))
      .map((r) => recipeDef(r).output.itemId)
      .filter((id) => !TIER_MATERIALS.includes(id));
    for (const id of BUILD_BAR) {
      const def = pieceDef(id);
      if (def.kind !== 'machine' || def.stage) continue;
      for (const variant of machineRecipeIds(def).slice(1)) expect(craftKnown(s, variant), variant).toBe(false);
      expect(unlockedPieces(s).includes(id), id).toBe(s.crafted.includes(recipeDef(def.recipeId).output.itemId));
    }
  });
});
