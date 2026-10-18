import { recipeDef } from '../data/recipes';
import { count } from './inventory';
import type { SimState } from './state';
import { knownRecipe } from './tutorial';

// Hand crafting: instant, from the inventory. Render calls this between ticks
// (the menu pauses the sim), so it's an action on the state, not part of a step.

/** Crafts one batch of a recipe. Returns false, changing nothing but the events, if an input is short. */
export function craft(state: SimState, recipeId: string): boolean {
  const recipe = recipeDef(recipeId);
  if (!canCraft(state, recipeId)) {
    state.events.craftFails.push({ recipeId });
    return false;
  }
  for (const [itemId, n] of Object.entries(recipe.inputs)) state.inventory[itemId] = count(state.inventory, itemId) - n;
  const { itemId, count: made } = recipe.output;
  state.inventory[itemId] = count(state.inventory, itemId) + made;
  if (!state.crafted.includes(itemId)) {
    state.crafted.push(itemId);
    state.crafted.sort();
  }
  state.events.crafts.push({ recipeId });
  return true;
}

/** True if the recipe is known (012) and the inventory holds every input. */
export function canCraft(state: Pick<SimState, 'inventory' | 'link'>, recipeId: string): boolean {
  if (!knownRecipe(state, recipeId)) return false;
  return Object.entries(recipeDef(recipeId).inputs).every(([itemId, n]) => count(state.inventory, itemId) >= n);
}
