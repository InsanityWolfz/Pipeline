import { STAGE_RECIPES } from './stages';

// Hand-crafting recipes. Starting values from spec 005; tune in playtest. A stage's
// recipe (029: hand-applied at the bench, run by its machine) is found here too.

export interface RecipeDef {
  id: string;
  /** Unknown until this holds (012): bombs, ley bolts and their parts appear once the tube attunes. */
  requires?: 'attuned';
  /** Unknown until this item has been carried (038: the landmine chain shows once ley-iron is picked up). */
  shownAfter?: string;
  /** Item id to count taken from the inventory. */
  inputs: Readonly<Record<string, number>>;
  output: { itemId: string; count: number };
}

const recipe = (id: string, inputs: Record<string, number>, itemId: string, count: number): RecipeDef => ({
  id,
  inputs,
  output: { itemId, count },
});

export const RECIPES: Readonly<Record<string, RecipeDef>> = {
  // 046 (note 1, 046.7, Shaun: "2× per resource"): the last step of each Region 1 chain makes twice what it did
  // (arrows 4 → 8, bombs and ley bolts 2 → 4), so each raw makes twice the rounds; parts are as they were, and so
  // is the landmine chain (Region 2, from ley-iron).
  shaft: recipe('shaft', { wood: 1 }, 'shaft', 2),
  arrowhead: recipe('arrowhead', { stone: 1 }, 'arrowhead', 2),
  rope: recipe('rope', { fiber: 1 }, 'rope', 2),
  arrow: recipe('arrow', { shaft: 1, arrowhead: 1, rope: 1 }, 'arrow', 8),
  casing: { ...recipe('casing', { stone: 1 }, 'casing', 1), requires: 'attuned' },
  fuse: { ...recipe('fuse', { 'husk-resin': 1 }, 'fuse', 1), requires: 'attuned' },
  'ley-dust': { ...recipe('ley-dust', { 'ley-crystal': 1 }, 'ley-dust', 2), requires: 'attuned' },
  bomb: { ...recipe('bomb', { casing: 1, fuse: 1, 'ley-dust': 1 }, 'bomb', 4), requires: 'attuned' },
  'ley-bolt': { ...recipe('ley-bolt', { 'ley-dust': 1 }, 'ley-bolt', 4), requires: 'attuned' },
  // 038: the landmine chain, reusing the bomb chain's fuse and shard.
  'iron-plate': { ...recipe('iron-plate', { 'ley-iron': 1 }, 'iron-plate', 2), shownAfter: 'ley-iron' },
  landmine: { ...recipe('landmine', { 'iron-plate': 1, fuse: 1, 'ley-dust': 1 }, 'landmine', 2), shownAfter: 'ley-iron' },
};

/** Items whose first carrying reveals recipes (038), each remembered in `found`. */
export const REVEALING_ITEMS: readonly string[] = [...new Set(Object.values(RECIPES).flatMap((r) => (r.shownAfter ? [r.shownAfter] : [])))];

/** A hand-crafting recipe, or a stage's (029). */
export function recipeDef(id: string): RecipeDef {
  const def = RECIPES[id] ?? STAGE_RECIPES[id];
  if (!def) throw new Error(`Unknown recipe '${id}'`);
  return def;
}
