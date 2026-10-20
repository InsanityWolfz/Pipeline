import { itemDef, UNKNOWN_SCHEMATIC } from '../data/items';
import { schematicKnown } from '../sim/schematics';
import type { SimState } from '../sim/state';

// How an item shows by name and icon (033): a schematic whose node isn't revealed yet
// (it hasn't been banked) shows as "Unknown schematic" with one shared icon wherever it
// shows, so which node it reveals stays hidden. Everything else shows as itself.

/** The key lines and rows merge unknown schematics under, so two different unknowns never tell apart. */
export const UNKNOWN_SCHEMATIC_KEY = 'unknown-schematic';

/** The key an item shows under: its id, or UNKNOWN_SCHEMATIC_KEY for a schematic not yet known. */
export function shownKey(sim: Pick<SimState, 'research'>, itemId: string): string {
  return itemDef(itemId).kind === 'schematic' && !schematicKnown(sim, itemId) ? UNKNOWN_SCHEMATIC_KEY : itemId;
}

/** The name and icon for a shown key (an item id, or UNKNOWN_SCHEMATIC_KEY). */
export function keyLook(key: string): { name: string; icon: string } {
  if (key === UNKNOWN_SCHEMATIC_KEY) return { name: UNKNOWN_SCHEMATIC.name, icon: UNKNOWN_SCHEMATIC.icon };
  const def = itemDef(key);
  return { name: def.name, icon: def.icon };
}

/** The name and icon an item shows with now. */
export const shownItem = (sim: Pick<SimState, 'research'>, itemId: string): { name: string; icon: string } => keyLook(shownKey(sim, itemId));
