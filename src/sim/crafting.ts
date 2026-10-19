import { RECIPES, recipeDef, type RecipeDef } from '../data/recipes';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';
import { knownRecipe } from './tutorial';

// Hand crafting: instant, from the inventory. Render calls this between ticks
// (the menu pauses the sim), so it's an action on the state, not part of a step.
// Stage recipes (029) aren't hand crafts: they go through the bench (src/sim/stages.ts).

/** True if the inventory holds every input of a recipe. */
export function hasInputs(inventory: Inventory, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([itemId, n]) => count(inventory, itemId) >= n);
}

/** Takes a recipe's inputs and gives its output, marking the output hand-made (it unlocks the machine that makes it). The caller has checked the inputs. */
export function make(state: SimState, recipe: RecipeDef): void {
  for (const [itemId, n] of Object.entries(recipe.inputs)) state.inventory[itemId] = count(state.inventory, itemId) - n;
  const { itemId, count: made } = recipe.output;
  state.inventory[itemId] = count(state.inventory, itemId) + made;
  if (!state.crafted.includes(itemId)) {
    state.crafted.push(itemId);
    state.crafted.sort();
  }
  state.events.crafts.push({ recipeId: recipe.id });
}

/** Crafts one batch of a recipe. Returns false, changing nothing but the events, if an input is short. */
export function craft(state: SimState, recipeId: string): boolean {
  if (!canCraft(state, recipeId)) {
    state.events.craftFails.push({ recipeId });
    return false;
  }
  make(state, recipeDef(recipeId));
  return true;
}

/** True if the recipe is a hand-crafting recipe (never a stage's), known (012), and the inventory holds every input. */
export function canCraft(state: Pick<SimState, 'inventory'> & { link: Pick<SimState['link'], 'attuned'>; found: readonly string[] }, recipeId: string): boolean {
  // An unknown id throws; a stage's recipe is known but never a hand craft.
  const recipe = recipeDef(recipeId);
  if (!RECIPES[recipeId] || !knownRecipe(state, recipeId)) return false;
  return hasInputs(state.inventory, recipe);
}
