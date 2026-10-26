// Blueprints' and area pick-up's events (063), and 069's purge, joined into SimEvents (src/sim/events.ts, kept under 300 lines): what
// render plays and tests read.

export interface BlueprintEvents {
  /** An area pick-up: how many pieces it lifted, and everything they held (069: to the inventory, the rest to the stash). */
  areaPickUps: { count: number; items: Record<string, number> }[];
  /** A blueprint saved into a slot (an index into the blueprints), under its name. */
  blueprintSaves: { slot: number; name: string }[];
  /** A save refused: every slot full and none named to overwrite, nothing to save, or no Blueprint table. */
  blueprintSaveFails: { reason: 'full' | 'empty' | 'locked' }[];
  /** A blueprint deleted from a slot. */
  blueprintDeletes: { slot: number; name: string }[];
  /** A blueprint stamped down: the slot, how many pieces went down, and how many were skipped. */
  stamps: { slot: number; placed: number; skipped: number }[];
  /** 069: an intake entrance purged: its index, the item, and how many went to the stash and to the inventory. */
  purges: { entrance: number; itemId: string; stash: number; inventory: number }[];
}

export function createBlueprintEvents(): BlueprintEvents {
  return { areaPickUps: [], blueprintSaves: [], blueprintSaveFails: [], blueprintDeletes: [], stamps: [], purges: [] };
}
