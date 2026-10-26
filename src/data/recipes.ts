import { STAGE_RECIPES, STAGES } from './stages';

// Hand-crafting recipes. Starting values from spec 005; tune in playtest. A stage's
// recipe (029: hand-applied at the bench, run by its machine) is found here too.

export interface RecipeDef {
  id: string;
  /** Unknown until this holds (012): bombs, ley bolts and their parts appear once the tube attunes. */
  requires?: 'attuned';
  /** Unknown until this item (062: each of these items) has been carried (038: the landmine chain shows once ley-iron is picked up). */
  shownAfter?: string | readonly string[];
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
  // 062: the material tiers. The Smelter's and the kiln's materials show once both their inputs have been carried; each
  // family's steel part and steel round once ley-steel has (the glass bolt once ley glass has), in stone's counts.
  'ley-steel': { ...recipe('ley-steel', { 'ley-iron': 1, cinderite: 1 }, 'ley-steel', 1), shownAfter: ['ley-iron', 'cinderite'] },
  'steel-arrowhead': { ...recipe('steel-arrowhead', { 'ley-steel': 1 }, 'steel-arrowhead', 2), shownAfter: 'ley-steel' },
  'steel-arrow': { ...recipe('steel-arrow', { shaft: 1, 'steel-arrowhead': 1, rope: 1 }, 'arrow+steel', 8), shownAfter: 'ley-steel' },
  'steel-casing': { ...recipe('steel-casing', { 'ley-steel': 1 }, 'steel-casing', 1), requires: 'attuned', shownAfter: 'ley-steel' },
  'steel-bomb': { ...recipe('steel-bomb', { 'steel-casing': 1, fuse: 1, 'ley-dust': 1 }, 'bomb+steel', 4), requires: 'attuned', shownAfter: 'ley-steel' },
  'ley-glass': { ...recipe('ley-glass', { 'ley-dust': 1, cinderite: 1 }, 'ley-glass', 1), requires: 'attuned', shownAfter: ['ley-dust', 'cinderite'] },
  'glass-bolt': { ...recipe('glass-bolt', { 'ley-glass': 1 }, 'ley-bolt+glass', 4), requires: 'attuned', shownAfter: 'ley-glass' },
  'steel-plate': { ...recipe('steel-plate', { 'ley-steel': 1 }, 'steel-plate', 2), shownAfter: 'ley-steel' },
  'steel-landmine': { ...recipe('steel-landmine', { 'steel-plate': 1, fuse: 1, 'ley-dust': 1 }, 'landmine+steel', 2), shownAfter: 'ley-steel' },
  // 066: the storm tier. The Tempering coil's two show once their tier material and stormglass have been carried (storm
  // glass, like ley glass, once the tube is attuned); each family's stormsteel part and round once stormsteel has (the
  // storm glass bolt once storm glass has), in steel's counts.
  stormsteel: { ...recipe('stormsteel', { 'ley-steel': 1, stormglass: 1 }, 'stormsteel', 1), shownAfter: ['ley-steel', 'stormglass'] },
  'storm-glass': { ...recipe('storm-glass', { 'ley-glass': 1, stormglass: 1 }, 'storm-glass', 1), requires: 'attuned', shownAfter: ['ley-glass', 'stormglass'] },
  'stormsteel-arrowhead': { ...recipe('stormsteel-arrowhead', { stormsteel: 1 }, 'stormsteel-arrowhead', 2), shownAfter: 'stormsteel' },
  'stormsteel-arrow': { ...recipe('stormsteel-arrow', { shaft: 1, 'stormsteel-arrowhead': 1, rope: 1 }, 'arrow+stormsteel', 8), shownAfter: 'stormsteel' },
  'stormsteel-casing': { ...recipe('stormsteel-casing', { stormsteel: 1 }, 'stormsteel-casing', 1), requires: 'attuned', shownAfter: 'stormsteel' },
  'stormsteel-bomb': { ...recipe('stormsteel-bomb', { 'stormsteel-casing': 1, fuse: 1, 'ley-dust': 1 }, 'bomb+stormsteel', 4), requires: 'attuned', shownAfter: 'stormsteel' },
  'storm-glass-bolt': { ...recipe('storm-glass-bolt', { 'storm-glass': 1 }, 'ley-bolt+storm-glass', 4), requires: 'attuned', shownAfter: 'storm-glass' },
  'stormsteel-plate': { ...recipe('stormsteel-plate', { stormsteel: 1 }, 'stormsteel-plate', 2), shownAfter: 'stormsteel' },
  'stormsteel-landmine': { ...recipe('stormsteel-landmine', { 'stormsteel-plate': 1, fuse: 1, 'ley-dust': 1 }, 'landmine+stormsteel', 2), shownAfter: 'stormsteel' },
};

/** The items a recipe's or stage's rows wait on (038; 062: one or several), each to have been carried. */
export const revealsOf = (r: { shownAfter?: string | readonly string[] }): readonly string[] => (r.shownAfter === undefined ? [] : typeof r.shownAfter === 'string' ? [r.shownAfter] : r.shownAfter);

/** Items whose first carrying reveals recipes (038) or a stage's rows (060: the fire rune's, after cinderite), each remembered in `found`. */
export const REVEALING_ITEMS: readonly string[] = [...new Set([...Object.values(RECIPES), ...Object.values(STAGES)].flatMap(revealsOf))];

/** A hand-crafting recipe, or a stage's (029). */
export function recipeDef(id: string): RecipeDef {
  const def = RECIPES[id] ?? STAGE_RECIPES[id];
  if (!def) throw new Error(`Unknown recipe '${id}'`);
  return def;
}
