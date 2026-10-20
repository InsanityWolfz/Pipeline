import type { RecipeDef } from '../data/recipes';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';

// Making a recipe by hand (005): takes its inputs and gives its output. Shared by the crafting menu's plain recipes
// and its tagged rounds (047), so neither imports the other.

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
