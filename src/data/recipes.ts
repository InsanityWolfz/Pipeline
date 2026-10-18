// Hand-crafting recipes. Starting values from spec 005; tune in playtest.

export interface RecipeDef {
  id: string;
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
  shaft: recipe('shaft', { wood: 1 }, 'shaft', 2),
  arrowhead: recipe('arrowhead', { stone: 1 }, 'arrowhead', 2),
  rope: recipe('rope', { fiber: 1 }, 'rope', 2),
  arrow: recipe('arrow', { shaft: 1, arrowhead: 1, rope: 1 }, 'arrow', 4),
  casing: recipe('casing', { stone: 1 }, 'casing', 1),
  fuse: recipe('fuse', { 'husk-resin': 1 }, 'fuse', 1),
  'ley-shard': recipe('ley-shard', { 'ley-crystal': 1 }, 'ley-shard', 2),
  bomb: recipe('bomb', { casing: 1, fuse: 1, 'ley-shard': 1 }, 'bomb', 2),
  'ley-bolt': recipe('ley-bolt', { 'ley-shard': 1 }, 'ley-bolt', 2),
};

/** The crafting menu's groups, one per ammo, each listing its chain in order. */
export const CRAFT_GROUPS: readonly { ammoId: string; recipes: readonly string[] }[] = [
  { ammoId: 'arrow', recipes: ['shaft', 'arrowhead', 'rope', 'arrow'] },
  { ammoId: 'bomb', recipes: ['casing', 'fuse', 'ley-shard', 'bomb'] },
  { ammoId: 'ley-bolt', recipes: ['ley-bolt'] },
];

export function recipeDef(id: string): RecipeDef {
  const def = RECIPES[id];
  if (!def) throw new Error(`Unknown recipe '${id}'`);
  return def;
}
