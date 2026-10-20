import { describe, expect, it } from 'vitest';
import { OUTPUT_CAP } from '../../src/data/foundry';
import { PIECES } from '../../src/data/pieces';
import { RECIPES, recipeDef } from '../../src/data/recipes';
import { STAGES } from '../../src/data/stages';

// 046 (note 1): Region 1's recipes make twice as many per craft, by hand and in machines (machines run the same
// recipes). Their inputs, Region 2's recipes (the landmine chain, from ley-iron) and the stages don't change.

/** Each recipe's output count before 046, and its inputs, which stay. */
const BEFORE: Readonly<Record<string, { out: number; inputs: Readonly<Record<string, number>> }>> = {
  shaft: { out: 2, inputs: { wood: 1 } },
  arrowhead: { out: 2, inputs: { stone: 1 } },
  rope: { out: 2, inputs: { fiber: 1 } },
  arrow: { out: 4, inputs: { shaft: 1, arrowhead: 1, rope: 1 } },
  casing: { out: 1, inputs: { stone: 1 } },
  fuse: { out: 1, inputs: { 'husk-resin': 1 } },
  'ley-dust': { out: 2, inputs: { 'ley-crystal': 1 } },
  bomb: { out: 2, inputs: { casing: 1, fuse: 1, 'ley-dust': 1 } },
  'ley-bolt': { out: 2, inputs: { 'ley-dust': 1 } },
};
const REGION_2 = { 'iron-plate': 2, landmine: 2 };

describe('early ammo (046)', () => {
  it("doubles every Region 1 recipe's output, its inputs unchanged", () => {
    for (const [id, was] of Object.entries(BEFORE)) {
      expect(RECIPES[id]?.output.count, id).toBe(was.out * 2);
      expect(RECIPES[id]?.inputs, id).toEqual(was.inputs);
    }
  });

  it("leaves Region 2's recipes and every stage as they were", () => {
    for (const [id, n] of Object.entries(REGION_2)) expect(RECIPES[id]?.output.count, id).toBe(n);
    for (const st of Object.values(STAGES)) expect(st.batch, st.id).toBe(4);
    expect(Object.keys(RECIPES).sort()).toEqual([...Object.keys(BEFORE), ...Object.keys(REGION_2)].sort());
  });

  it("lets every machine hold one craft's output, so none can stall on a doubled one", () => {
    for (const def of Object.values(PIECES)) if (def.kind === 'machine') expect(recipeDef(def.recipeId).output.count, def.id).toBeLessThanOrEqual(OUTPUT_CAP);
  });
});
