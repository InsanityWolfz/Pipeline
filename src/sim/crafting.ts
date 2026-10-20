import { RECIPES, recipeDef } from '../data/recipes';
import { stageRow } from '../data/stages';
import type { SimState } from './state';
import { craftTagged, taggedAffordable, taggedKnown, type TaggedStores } from './stages';
import { knownRecipe } from './tutorial';
import { hasInputs, make } from './make';

// Hand crafting: instant, from the inventory. Render calls this between ticks (the menu doesn't pause the world), so
// it's an action on the state, not part of a step. 047: a tagged round (frost arrows and the rest) is a recipe of the
// crafting menu too, made anywhere, its rounds counted carried plus in the intake's entrances (src/sim/stages.ts).

export { hasInputs, make } from './make';

/** What deciding a craft reads: the inventory, the attunement and entrances, the revealing items found and the claims. */
export type CraftStores = TaggedStores & { link: Pick<SimState['link'], 'attuned'>; found: readonly string[]; claims: readonly string[] };

/** Crafts one batch of a recipe or a tagged round. Returns false, changing nothing but the events, if it can't. */
export function craft(state: SimState, recipeId: string): boolean {
  if (!canCraft(state, recipeId)) {
    state.events.craftFails.push({ recipeId });
    return false;
  }
  if (RECIPES[recipeId]) make(state, recipeDef(recipeId));
  else craftTagged(state, recipeId);
  return true;
}

/** True if the recipe is known (012, 038; a tagged round's once its family is and the shrine is claimed, 029) and its inputs are held. */
export function canCraft(state: CraftStores, recipeId: string): boolean {
  if (RECIPES[recipeId]) return knownRecipe(state, recipeId) && hasInputs(state.inventory, recipeDef(recipeId));
  const row = stageRow(recipeId);
  if (!row) throw new Error(`Unknown recipe '${recipeId}'`);
  return taggedKnown(state, row) && taggedAffordable(state, row.id);
}
