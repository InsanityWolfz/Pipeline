import { INVENTORY_GROUPS } from '../data/hudPanels';
import { ITEMS, stackSize } from '../data/items';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';

// The grid inventory (047, note 12): the inventory keeps its counts by kind, and the grid shows them as stacks, each
// slot one stack of up to the kind's stack size (047.1), a kind's stacks full but the last. `bag` is the grid's order
// of kinds: a kind newly carried goes on the end, a kind used up leaves it, and Sort orders it by the inventory's
// groups (031: Raw, Parts, Ammo, Gear, Cores) and then by item. There's no limit on slots (047.2): the grid scrolls.

/** One grid slot: a stack of a kind, `n` its stack number within that kind (0 for the first). */
export interface Stack {
  itemId: string;
  count: number;
  n: number;
}

/** A count of one kind as stacks of its stack size, full first, the remainder last. */
export function stacksOf(itemId: string, n: number): Stack[] {
  if (n <= 0) return [];
  const size = stackSize(itemId);
  return Array.from({ length: Math.ceil(n / size) }, (_, i) => ({ itemId, count: Math.min(size, n - i * size), n: i }));
}

/** The kinds the grid lists, in its order: the bag's kinds still carried, then any carried kind it doesn't name yet, in item order. */
export function bagKinds(state: Pick<SimState, 'inventory' | 'bag'>): string[] {
  const held = (id: string) => count(state.inventory, id) > 0;
  const listed = state.bag.filter(held);
  return [...listed, ...Object.keys(ITEMS).filter((id) => held(id) && !listed.includes(id))];
}

/** Every grid slot, in order: each kind's stacks in turn. */
export function gridStacks(state: Pick<SimState, 'inventory' | 'bag'>): Stack[] {
  return bagKinds(state).flatMap((id) => stacksOf(id, count(state.inventory, id)));
}

/** Once a tick (and at the start): the bag follows the inventory, a new kind on its end, a used-up kind out. */
export function noteBag(state: Pick<SimState, 'inventory' | 'bag'>): void {
  state.bag = bagKinds(state);
}

/** The sort key of a kind: its group's place (031), then its place among the items. */
function sortKey(id: string): [number, number] {
  const group = INVENTORY_GROUPS.findIndex((g) => g.id === ITEMS[id]?.group);
  return [group < 0 ? INVENTORY_GROUPS.length : group, Object.keys(ITEMS).indexOf(id)];
}

/** The grid's Sort button (047): kinds by group, then by item. */
export function sortBag(state: Pick<SimState, 'inventory' | 'bag'>): void {
  state.bag = bagKinds(state).sort((a, b) => {
    const [ga, ia] = sortKey(a);
    const [gb, ib] = sortKey(b);
    return ga - gb || ia - ib;
  });
}

/** A container's contents as stacks (047: a hopper's or a crate's own slots), kinds in item order. */
export function containerStacks(contents: Inventory): Stack[] {
  return Object.keys(ITEMS).flatMap((id) => stacksOf(id, count(contents, id)));
}

/** A grid slot with what a death would take of it (031 carried over): a kind's safe items fill its first stacks. */
export interface GridSlot extends Stack {
  atRisk: number;
}

/** Every grid slot with its at-risk count: of a kind's carried items, min(held, banked) are safe, and they fill its first stacks. */
export function gridSlots(state: Pick<SimState, 'inventory' | 'bag' | 'banked'>): GridSlot[] {
  const before = new Map<string, number>();
  return gridStacks(state).map((st) => {
    const safe = Math.min(count(state.inventory, st.itemId), count(state.banked, st.itemId));
    const start = before.get(st.itemId) ?? 0;
    before.set(st.itemId, start + st.count);
    const safeHere = Math.max(0, Math.min(st.count, safe - start));
    return { ...st, atRisk: st.count - safeHere };
  });
}
