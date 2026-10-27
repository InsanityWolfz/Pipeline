import { RECIPE_CARD as W } from '../data/descriptions';
import { itemDef } from '../data/items';
import type { MachineCard, RecipeCard } from '../sim/recipeCard';

// 069: a recipe card's words (src/data/descriptions.ts), pure. The numbers are the sim's (src/sim/recipeCard.ts).

/** An item's name for a count of it: lower case, plural past one unless it's raw or reads as an amount. */
function itemWords(itemId: string, n: number): string {
  const def = itemDef(itemId);
  const name = def.name.toLowerCase();
  return n === 1 || def.group === 'raw' || W.uncounted.includes(itemId) ? name : `${name}s`;
}

const counted = (c: { itemId: string; count: number }): string => `${c.count} ${itemWords(c.itemId, c.count)}`;

/** "1 wood → 2 shafts · 1.0 s". */
export function cardText(card: RecipeCard): string {
  return `${card.inputs.map(counted).join(W.join)}${W.arrow}${counted(card.output)}${W.sep}${W.seconds(card.seconds.toFixed(W.places))}`;
}

/** A placed machine's card, and while it runs its items a minute: "… · 120 shafts/min". */
export function machineCardText(card: MachineCard): string {
  const base = cardText(card);
  if (!card.running) return base;
  const n = Math.round(card.perMinute);
  return `${base}${W.sep}${W.perMinute(n, itemWords(card.output.itemId, n))}`;
}
