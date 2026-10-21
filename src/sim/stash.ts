import { fixtureInReach } from './claims';
import { fromStack } from './foundryUse';
import type { Command } from './input';
import { count, type Inventory } from './inventory';
import type { SimState } from './state';

// The stash (009) as storage (052, C.3): its screen moves stacks both ways with the
// grid's clicks (047: one, Shift half, Ctrl the stack), standing at it, with no limit.
// A claimed pylon's "send haul home" fills it too (claims.ts). It is always safe (052.3).

/** Moves `n` of a kind from one inventory to another; a kind emptied leaves `from`. */
function move(from: Inventory, to: Inventory, itemId: string, n: number): Inventory {
  to[itemId] = count(to, itemId) + n;
  const left = count(from, itemId) - n;
  return left > 0 ? { ...from, [itemId]: left } : Object.fromEntries(Object.entries(from).filter(([k]) => k !== itemId));
}

/** Takes from the stash: a click's amount of a kind, all of a kind with no amount, or everything for a null item. */
function takeStash(state: SimState, take: NonNullable<Command['takeStash']>): void {
  const ids = take.itemId === null ? Object.keys(state.stash) : [take.itemId];
  const items: Inventory = {};
  for (const id of ids) {
    const have = count(state.stash, id);
    const n = take.amount === undefined ? have : fromStack(take.amount, have, take.stack);
    if (n <= 0) continue;
    state.stash = move(state.stash, state.inventory, id, n);
    items[id] = n;
  }
  if (Object.keys(items).length > 0) state.events.stashTakes.push({ items });
}

/** Puts a click's amount of a held kind into the stash. */
function putStash(state: SimState, put: NonNullable<Command['stashPut']>): void {
  const n = fromStack(put.amount, count(state.inventory, put.itemId), put.stack);
  if (n <= 0) return;
  state.inventory = move(state.inventory, state.stash, put.itemId, n);
  state.events.stashPuts.push({ items: { [put.itemId]: n } });
}

/** The stash screen's moves, standing at the stash. */
export function stepStash(state: SimState, cmd: Command): void {
  if (!fixtureInReach(state, 'stash')) return;
  if (cmd.takeStash) takeStash(state, cmd.takeStash);
  if (cmd.stashPut) putStash(state, cmd.stashPut);
}
