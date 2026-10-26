import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { craft, canCraft } from '../../src/sim/crafting';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { lackingRaws, subStepLines } from '../../src/sim/subSteps';
import { run, SEED } from './fight';

// 051 (B.3): the bomb goal comes before the foundry, with an indented sub-line for each raw the player lacks ("Collect
// stone"), appearing only when lacking and ticking off once gathered. 067: "Craft bombs (C)" then "Craft ley bolts (C)",
// right after the arrows and before the ruin field, each with its own sub-lines.

const CRAFT = OBJECTIVES.findIndex((o) => o.text === 'Craft bombs (C)');
const LEY = OBJECTIVES.findIndex((o) => o.text === 'Craft ley bolts (C)');

/** A new game at the bomb goal, every gate but the shrine's shut, holding `inventory`. */
function atCraftGoal(inventory: Record<string, number>): SimState {
  const s = createSim(SEED, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((_, i) => i < CRAFT);
  s.hasTube = true;
  s.inventory = { ...inventory };
  run(s, 1);
  return s;
}

describe('the bomb and ley bolt goals come before the foundry (051, B.3; 067)', () => {
  it('follow the arrows, bombs then ley bolts, before the ruin field, each with sub-steps', () => {
    expect(OBJECTIVES[CRAFT - 1]?.text).toBe('Craft arrows (C)');
    expect(LEY).toBe(CRAFT + 1);
    expect(OBJECTIVES[LEY + 1]?.text).toBe('Clear the ruin field');
    expect(OBJECTIVES[CRAFT]?.subSteps).toBe('collect');
    expect(OBJECTIVES[LEY]?.subSteps).toBe('collect');
  });

  it('bombs and ley bolts can be crafted with the foundry still sealed, the tube unattuned, once their raws are carried', () => {
    const s = atCraftGoal({ stone: 1, 'husk-resin': 1, 'ley-crystal': 1 });
    expect([s.link.attuned, s.gates.foundry]).toEqual([false, false]);
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
    // 067: the ley bolt goal's own lines: only its ley crystal.
    expect(s.subSteps).toEqual({ goal: LEY, items: ['ley-crystal'] });
    s.objectives[LEY] = true;
    run(s, 1);
    expect(s.subSteps).toEqual({ goal: -1, items: [] });
    expect(subStepLines(s, currentObjective(s))).toEqual([]);
  });
});
