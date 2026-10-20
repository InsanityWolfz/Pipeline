import { RECIPES, type RecipeDef } from './recipes';
import { STAGE_ROWS, stageRow } from './stages';

// The crafting menu's tabs (047, notes 6 and 15): one per ammo family, each holding that ammo's whole chain, parts
// included (a part two families use shows in both), then its tagged rounds (frost arrows and the rest), crafted like
// any recipe. Tagged rounds are never called "stages" where the player sees them.

export interface CraftTab {
  /** The family's base ammo: the tab's icon. */
  ammoId: string;
  /** The tab's name (Shaun's: Arrows, Bombs, Ley, Landmines). */
  label: string;
  /** Recipe ids in order: the chain's parts (in the order its recipe takes them), the ammo, then its tagged rounds' rows. */
  recipes: readonly string[];
}

/** A recipe's chain: every recipe its inputs need, depth first in input order, then itself. */
function chain(recipeId: string): string[] {
  const r = RECIPES[recipeId];
  if (!r) return [];
  const parts = Object.keys(r.inputs).flatMap((input) => chain(input));
  return [...new Set([...parts, recipeId])];
}

const tab = (ammoId: string, label: string): CraftTab => ({
  ammoId,
  label,
  recipes: [...chain(ammoId), ...STAGE_ROWS.filter((row) => row.base === ammoId).map((row) => row.id)],
});

/** The tabs, left to right (top to bottom on the menu). */
export const CRAFT_TABS: readonly CraftTab[] = [tab('arrow', 'Arrows'), tab('bomb', 'Bombs'), tab('ley-bolt', 'Ley'), tab('landmine', 'Landmines')];

/** The most rows any tab holds: the menu is sized for it. */
export const CRAFT_TAB_ROWS = Math.max(...CRAFT_TABS.map((t) => t.recipes.length));

/** A crafting menu row's recipe: a hand-crafting recipe, or a tagged round's (by its row id, `frost-rune-arrow`). */
export function craftRecipeDef(id: string): RecipeDef {
  const def = RECIPES[id] ?? stageRow(id)?.recipe;
  if (!def) throw new Error(`Unknown crafting menu recipe '${id}'`);
  return def;
}

