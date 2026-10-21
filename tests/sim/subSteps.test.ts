import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { craft, canCraft } from '../../src/sim/crafting';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { lackingRaws, subStepLines } from '../../src/sim/subSteps';
import { run, SEED } from './fight';

// 051 (B.3): "Craft bombs and ley bolts (C)" comes before the foundry, with an indented sub-line for each raw the
// player lacks ("Collect stone"), appearing only when lacking and ticking off once gathered.

const CRAFT = OBJECTIVES.findIndex((o) => o.text === 'Craft bombs and ley bolts (C)');
const ENTER = OBJECTIVES.findIndex((o) => o.text === 'Enter the foundry');

/** A new game at the bomb goal: the field cleared (the foundry's stairs open), holding `inventory`. */
function atCraftGoal(inventory: Record<string, number>): SimState {
  const s = createSim(SEED, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((_, i) => i < CRAFT);
  s.hasTube = true;
  s.gates.foundry = true;
  s.inventory = { ...inventory };
  run(s, 1);
  return s;
}

describe('the bomb goal comes before the foundry (051, B.3)', () => {
  it('sits right before "Enter the foundry", with sub-steps', () => {
    expect(CRAFT).toBeGreaterThan(0);
    expect(ENTER).toBe(CRAFT + 1);
    expect(OBJECTIVES[CRAFT]?.subSteps).toBe('collect');
  });

  it('bombs and ley bolts can be crafted once the foundry is open, before the tube attunes', () => {
    const s = atCraftGoal({ stone: 1, 'husk-resin': 1, 'ley-crystal': 1 });
    expect(s.link.attuned).toBe(false);
    for (const r of ['casing', 'fuse', 'ley-dust']) expect(craft(s, r), r).toBe(true);
    expect(canCraft(s, 'bomb')).toBe(true);
    expect(canCraft(s, 'ley-bolt')).toBe(true);
    const shut = createSim(SEED, { start: TUTORIAL_START });
    shut.inventory = { stone: 1 };
    expect(canCraft(shut, 'casing')).toBe(false);
  });
});

describe('what a craft lacks (051)', () => {
  it('a bomb and a ley bolt need one stone, one resin and one ley crystal (the dust shared)', () => {
    expect(lackingRaws({}, ['bomb', 'ley-bolt'])).toEqual(['stone', 'husk-resin', 'ley-crystal']);
    expect(lackingRaws({ stone: 1, 'husk-resin': 1, 'ley-crystal': 1 }, ['bomb', 'ley-bolt'])).toEqual([]);
  });

  it('parts already made count: a casing in hand means no stone is needed', () => {
    expect(lackingRaws({ casing: 1, 'husk-resin': 1 }, ['bomb', 'ley-bolt'])).toEqual(['ley-crystal']);
    // Two dust in hand cover both crafts; one dust leaves the ley crystal needed.
    expect(lackingRaws({ casing: 1, fuse: 1, 'ley-dust': 2 }, ['bomb', 'ley-bolt'])).toEqual([]);
    expect(lackingRaws({ casing: 1, fuse: 1, 'ley-dust': 1 }, ['bomb', 'ley-bolt'])).toEqual(['ley-crystal']);
  });
});

describe('the sub-lines (051)', () => {
  it('appear only when lacking, each ticking off once gathered', () => {
    const full = atCraftGoal({ stone: 2, 'husk-resin': 2, 'ley-crystal': 2 });
    expect(currentObjective(full)).toBe(CRAFT);
    expect(subStepLines(full, CRAFT)).toEqual([]);

    const s = atCraftGoal({ 'husk-resin': 2 });
    expect(subStepLines(s, CRAFT)).toEqual([
      { itemId: 'stone', done: false },
      { itemId: 'ley-crystal', done: false },
    ]);
    s.inventory.stone = 1;
    run(s, 1);
    expect(subStepLines(s, CRAFT)).toEqual([
      { itemId: 'stone', done: true },
      { itemId: 'ley-crystal', done: false },
    ]);
    // Stone spent again (on arrows, say) brings the line back.
    s.inventory.stone = 0;
    run(s, 1);
    expect(subStepLines(s, CRAFT)[0]).toEqual({ itemId: 'stone', done: false });
  });

  it('other goals have none, and a new goal starts afresh', () => {
    const s = atCraftGoal({});
    expect(s.subSteps.goal).toBe(CRAFT);
    s.objectives[CRAFT] = true;
    run(s, 1);
    expect(s.subSteps).toEqual({ goal: -1, items: [] });
    expect(subStepLines(s, currentObjective(s))).toEqual([]);
  });
});
