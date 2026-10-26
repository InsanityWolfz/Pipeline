import { STASH_CAP } from '../data/blueprints';
import { INVENTORY_CAP } from '../data/items';
import { FOUNDRY_ROOM } from '../data/rooms';
import { wholeRefusal } from './guided';
import { count, type Inventory } from './inventory';
import { footprint, type FoundryState, type PieceState, type Tile } from './pieces';
import { pieceContents, removePieceAt } from './placement';
import type { SimState } from './state';
import { tunnelContents } from './tunnels';

// Area pick-up (063): the area tool's box over the foundry grid counts every piece wholly inside it (a 3x1 needs all
// three tiles); fixtures (the intake, the ports, the bench, the stash) aren't pieces, so they never count. Pick up
// lifts every counted piece at once, as picking each up by hand does (pieces are free, so nothing is refunded); 069:
// what they held goes to the inventory, and the stash takes what it can't hold. It is refused whole if the two together
// can't hold it all, and by the tutorial's build lock (058) as a single pick-up is. It needs no research.

/** A box of foundry tiles, corners inclusive, `tx0 <= tx1` and `ty0 <= ty1`. */
export interface AreaBox {
  tx0: number;
  ty0: number;
  tx1: number;
  ty1: number;
}

/** The box between two corner tiles, whichever way it was dragged. */
export function boxOf(a: Tile, b: Tile): AreaBox {
  return { tx0: Math.min(a.tx, b.tx), ty0: Math.min(a.ty, b.ty), tx1: Math.max(a.tx, b.tx), ty1: Math.max(a.ty, b.ty) };
}

export const inBox = (box: AreaBox, t: Tile): boolean => t.tx >= box.tx0 && t.tx <= box.tx1 && t.ty >= box.ty0 && t.ty <= box.ty1;

/** The pieces wholly inside a box, in placement order. */
export function piecesInBox(foundry: FoundryState, box: AreaBox): PieceState[] {
  return foundry.pieces.filter((p) => footprint(p.pieceId, p.tx, p.ty, p.facing).every((t) => inBox(box, t)));
}

/** How many items a stash (or any store) holds in all. */
export const stashTotal = (stash: Inventory): number => Object.values(stash).reduce((n, k) => n + k, 0);

/** Everything a set of pieces holds, their tunnels included (an entrance's own; an exit's comes with its entrance). */
function contentsOf(pieces: readonly PieceState[], foundry: FoundryState): Inventory {
  const items: Inventory = {};
  const add = (from: Inventory): void => {
    for (const [itemId, n] of Object.entries(from)) items[itemId] = count(items, itemId) + n;
  };
  for (const p of pieces) {
    add(pieceContents(p));
    // An exit whose entrance stays behind takes the tunnel with it (052.2), as by hand.
    if (p.kind === 'tunnel-out' && p.pair !== null && !pieces.some((q) => q.id === p.pair)) {
      const entrance = foundry.pieces.find((q) => q.id === p.pair);
      if (entrance?.kind === 'tunnel-in') add(tunnelContents(entrance));
    }
  }
  return items;
}

/** 069: where an area pick-up's contents may go: each store's most items (INVENTORY_CAP and STASH_CAP, unbounded today). */
export interface StoreCaps {
  inventory: number;
  stash: number;
}

const CAPS: StoreCaps = { inventory: INVENTORY_CAP, stash: STASH_CAP };

/**
 * Picks up every piece wholly inside the box, their contents to the inventory and the rest to the stash (069). Returns
 * whether it did. Refused (a pick-up fail on the box's first piece, nothing changed) by the build lock, or when the
 * inventory and the stash, at their `caps`, can't hold it between them.
 */
export function areaPickUp(state: SimState, box: AreaBox, caps: StoreCaps = CAPS): boolean {
  if (state.roomId !== FOUNDRY_ROOM) return false;
  const pieces = piecesInBox(state.foundry, box);
  const first = pieces[0];
  if (!first) return false;
  const refused = wholeRefusal(state);
  if (refused) {
    state.events.pickUpFails.push({ tx: first.tx, ty: first.ty, reason: refused });
    return false;
  }
  const items = contentsOf(pieces, state.foundry);
  let invRoom = Math.max(0, caps.inventory - stashTotal(state.inventory));
  const stashRoom = Math.max(0, caps.stash - stashTotal(state.stash));
  if (stashTotal(items) > invRoom + stashRoom) {
    state.events.pickUpFails.push({ tx: first.tx, ty: first.ty, reason: 'stash-full' });
    return false;
  }
  const lifted: Inventory = {};
  for (const p of pieces) removePieceAt(state, p.tx, p.ty, lifted);
  // The inventory first, kind by kind, then the stash for the rest.
  for (const [itemId, n] of Object.entries(lifted)) {
    const mine = Math.min(n, invRoom);
    invRoom -= mine;
    if (mine > 0) state.inventory[itemId] = count(state.inventory, itemId) + mine;
    if (n > mine) state.stash[itemId] = count(state.stash, itemId) + n - mine;
  }
  state.events.areaPickUps.push({ count: pieces.length, items });
  return true;
}
