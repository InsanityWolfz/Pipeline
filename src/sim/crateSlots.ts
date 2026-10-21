import { CRATE_SLOTS } from '../data/foundry';
import { stackSize } from '../data/items';
import { count, type Inventory } from './inventory';

// A crate's slots (050, A.12): CRATE_SLOTS of them, each one stack of a kind at 047's stack sizes, as its screen
// shows them. How much more a crate takes of a kind follows from the slots the other kinds fill.

/** Slots a count of a kind fills: one per stack, the last one part full. */
const slotsOf = (itemId: string, n: number): number => (n > 0 ? Math.ceil(n / stackSize(itemId)) : 0);

/** How many more of `itemId` a crate holding `contents` takes: the free slots' stacks, and what its own last stack has room for. */
export function crateRoom(contents: Inventory, itemId: string): number {
  const others = Object.entries(contents).reduce((n, [id, k]) => n + (id === itemId ? 0 : slotsOf(id, k)), 0);
  return Math.max(0, (CRATE_SLOTS - others) * stackSize(itemId) - count(contents, itemId));
}
