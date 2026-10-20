import { describe, expect, it } from 'vitest';
import { OUTPUT_CAP } from '../../src/data/foundry';
import { PIECES } from '../../src/data/pieces';
import { RECIPES, recipeDef, type RecipeDef } from '../../src/data/recipes';
import { STAGES } from '../../src/data/stages';

// 046 (note 1, 046.7: Shaun, "2× per resource"): each raw resource makes twice the rounds it did, by hand and in
// machines (machines run the same recipes). Only the last step of each Region 1 chain doubles (arrows, bombs, ley
// bolts); parts keep their counts, and Region 2's landmine chain and the stages are as they were.

/** Each recipe's output count before 046. */
const BEFORE: Readonly<Record<string, number>> = {
  shaft: 2,
  arrowhead: 2,
  rope: 2,
  arrow: 4,
  casing: 1,
  fuse: 1,
  'ley-dust': 2,
  bomb: 2,
  'ley-bolt': 2,
  'iron-plate': 2,
  landmine: 2,
};
const FINALS = ['arrow', 'bomb', 'ley-bolt'];

/** Rounds of `itemId` one of each raw it's made from gives, following its chain with `recipes`' counts. */
function perRaw(itemId: string, out: (r: RecipeDef) => number): number {
  const r = RECIPES[itemId];
  if (!r) return 1;
  // How many crafts the parts from one of each raw allow: the scarcest input decides.
  const crafts = Math.min(...Object.entries(r.inputs).map(([id, n]) => perRaw(id, out) / n));
  return crafts * out(r);
}

describe('early ammo (046)', () => {
  it('doubles only the final craft of each Region 1 chain; parts and inputs are unchanged', () => {
    for (const [id, was] of Object.entries(BEFORE)) expect(RECIPES[id]?.output.count, id).toBe(FINALS.includes(id) ? was * 2 : was);
  });

  it('so each raw resource makes twice the rounds: one wood, stone and fiber make 16 arrows (from 8)', () => {
    const before = (r: RecipeDef): number => BEFORE[r.id] ?? r.output.count;
    for (const id of FINALS) expect(perRaw(id, (r) => r.output.count), id).toBe(perRaw(id, before) * 2);
    expect(perRaw('arrow', (r) => r.output.count)).toBe(16);
  });

  it("leaves the landmine's cost and count, and every stage, as they were", () => {
    expect(RECIPES.landmine?.inputs).toEqual({ 'iron-plate': 1, fuse: 1, 'ley-dust': 1 });
    expect(RECIPES['iron-plate']?.inputs).toEqual({ 'ley-iron': 1 });
    expect(perRaw('landmine', (r) => r.output.count)).toBe(perRaw('landmine', (r) => BEFORE[r.id] ?? r.output.count));
    for (const st of Object.values(STAGES)) expect(st.batch, st.id).toBe(4);
    expect(Object.keys(RECIPES).sort()).toEqual(Object.keys(BEFORE).sort());
  });

  it("keeps OUTPUT_CAP only as high as the biggest machine craft (a doubled arrow craft)", () => {
    const biggest = Math.max(...Object.values(PIECES).flatMap((d) => (d.kind === 'machine' ? [recipeDef(d.recipeId).output.count] : [])));
    expect(OUTPUT_CAP).toBe(biggest);
    expect(biggest).toBe(8);
  });
});
