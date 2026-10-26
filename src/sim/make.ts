import type { RecipeDef } from '../data/recipes';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';

// Making a recipe by hand (005): takes its inputs and gives its output. Shared by the crafting menu's plain recipes
// and its tagged rounds (047), so neither imports the other.

/** True if the inventory holds every input of a recipe. */
export function hasInputs(inventory: Inventory, recipe: RecipeDef): boolean {
  return Object.entries(recipe.inputs).every(([itemId, n]) => count(inventory, itemId) >= n);
}

/** How many whole batches of a recipe the inventory's own items make (070: craft max). */
export function batchesHeld(inventory: Inventory, recipe: RecipeDef): number {
  return Math.min(...Object.entries(recipe.inputs).map(([itemId, n]) => Math.floor(count(inventory, itemId) / n)));
}

/**
 * Takes a recipe's inputs and gives its output, `batches` times over (070: craft max) as one craft, marking the output
 * hand-made (it unlocks the machine that makes it). The caller has checked the inputs. Its one event names the batches
 * only when there's more than one.
 */
export function make(state: SimState, recipe: RecipeDef, batches = 1): void {
  for (const [itemId, n] of Object.entries(recipe.inputs)) state.inventory[itemId] = count(state.inventory, itemId) - n * batches;
  const { itemId, count: made } = recipe.output;
  state.inventory[itemId] = count(state.inventory, itemId) + made * batches;
  if (!state.crafted.includes(itemId)) {
    state.crafted.push(itemId);
    state.crafted.sort();
  }
  state.events.crafts.push(batches > 1 ? { recipeId: recipe.id, batches } : { recipeId: recipe.id });
}
