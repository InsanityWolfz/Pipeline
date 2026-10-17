// What the player carries: item id to count. Plain data so it serializes with the sim.

export type Inventory = Record<string, number>;

export function count(inv: Inventory, itemId: string): number {
  return inv[itemId] ?? 0;
}

/** Removes `n` of an item. Returns false, changing nothing, if there aren't enough. */
export function take(inv: Inventory, itemId: string, n = 1): boolean {
  const have = count(inv, itemId);
  if (have < n) return false;
  inv[itemId] = have - n;
  return true;
}
