import { RECIPES, type RecipeDef } from './recipes';
import { STAGE_ROWS, stageRow } from './stages';
import { roundBase, roundTier } from './tags';

// The crafting menu's tabs (047, notes 6 and 15): one per ammo family, each holding that ammo's whole chain, parts
// included (a part two families use shows in both), then its tagged rounds (frost arrows and the rest), crafted like
// any recipe. Tagged rounds are never called "stages" where the player sees them.

export interface CraftTab {
  /** The family's base ammo: the tab's icon. */
  ammoId: string;
  /** The tab's name (Shaun's: Arrows, Bombs, Ley, Landmines). */
  label: string;
  /** Recipe ids in order: the chain's parts (in the order its recipe takes them), the ammo, its tagged rounds' rows, then (062) its tier's chain. */
  recipes: readonly string[];
  /** 062: where its tier's chain starts in `recipes`: those rows stand in a second column beside the stone ones. */
  tierFrom: number;
}

/** A recipe's chain: every recipe its inputs need, depth first in input order, then itself. */
function chain(recipeId: string): string[] {
  const r = RECIPES[recipeId];
  if (!r) return [];
  const parts = Object.keys(r.inputs).flatMap((input) => chain(input));
  return [...new Set([...parts, recipeId])];
}

/** 062: the family's tiered rounds' recipes (the steel arrow's), by output. */
const tierRecipes = (ammoId: string): string[] =>
  Object.values(RECIPES)
    .filter((r) => roundBase(r.output.itemId) === ammoId && roundTier(r.output.itemId) !== 'stone')
    .map((r) => r.id);

const tab = (ammoId: string, label: string): CraftTab => {
  const stone = chain(ammoId);
  // 062: after the stone chain and its tagged rounds, its tier's chain (ley-steel, the steel part, the steel round).
  const tiers = tierRecipes(ammoId).flatMap((id) => chain(id)).filter((id) => !stone.includes(id));
  const first = [...stone, ...STAGE_ROWS.filter((row) => row.base === ammoId).map((row) => row.id)];
  return { ammoId, label, recipes: [...first, ...new Set(tiers)], tierFrom: first.length };
};

/** The tabs, left to right (top to bottom on the menu). */
export const CRAFT_TABS: readonly CraftTab[] = [tab('arrow', 'Arrows'), tab('bomb', 'Bombs'), tab('ley-bolt', 'Ley'), tab('landmine', 'Landmines')];

/** The most rows any tab's column holds (062: its stone column or its tier column): the menu is sized for it. */
export const CRAFT_TAB_ROWS = Math.max(...CRAFT_TABS.map((t) => Math.max(t.tierFrom, t.recipes.length - t.tierFrom)));

/** 062: the menu's columns of rows: the stone rows, and beside them the tier rows when any tab has them. */
export const CRAFT_TAB_COLUMNS = CRAFT_TABS.some((t) => t.recipes.length > t.tierFrom) ? 2 : 1;

/** A crafting menu row's recipe: a hand-crafting recipe, or a tagged round's (by its row id, `frost-rune-arrow`). */
export function craftRecipeDef(id: string): RecipeDef {
  const def = RECIPES[id] ?? stageRow(id)?.recipe;
  if (!def) throw new Error(`Unknown crafting menu recipe '${id}'`);
  return def;
}

