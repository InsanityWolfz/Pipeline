// What the player carries: item id to count. Plain data so it serializes with the sim.

export type Inventory = Record<string, number>;

export function count(inv: Inventory, itemId: string): number {
  return inv[itemId] ?? 0;
}

/** Removes one of an item. Returns false, changing nothing, if there is none. */
export function take(inv: Inventory, itemId: string): boolean {
  const have = count(inv, itemId);
  if (have < 1) return false;
  inv[itemId] = have - 1;
  return true;
}
