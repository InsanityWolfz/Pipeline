import { HOPPER_CLICK, HOVER_USE_REACH, USE_REACH } from '../data/foundry';
import { crateRoom } from './crateSlots';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { Command, HopperAmount } from './input';
import { count } from './inventory';
import { pieceRect, type CrateState, type HopperState, type PieceState } from './pieces';
import type { SimState } from './state';

// Using hoppers and crates (the intake's caps are restored at their diagrams, 033).
// E on a hopper or a crate opens render's screen (047: its own slots over the grid
// inventory); its clicks arrive as deposit (put some of a held item in) and withdraw
// (take some out) commands. Deposits and withdraws move one, half (rounded up) or all
// of the stack clicked (022, 047); 069: a hopper screen's plain click moves ten (all, if fewer).

type Usable = HopperState | CrateState;

const usable = (p: PieceState): p is Usable => p.kind === 'hopper' || p.kind === 'crate';

/** Gap between the player's feet box and a piece's box, px; 0 when they touch. */
function gapTo(state: SimState, p: PieceState): number {
  const r = pieceRect(p);
  const pl = state.player;
  const gapX = Math.max(0, Math.abs(r.x - pl.x) - (FEET_BOX.w + r.w) / 2);
  const gapY = Math.max(0, Math.abs(r.y - pl.y) - (FEET_BOX.h + r.h) / 2);
  return Math.hypot(gapX, gapY);
}

const inReach = (state: SimState, p: PieceState): boolean =>
  state.roomId === FOUNDRY_ROOM && gapTo(state, p) <= USE_REACH;

/** 050: a hopper or crate is worked (deposits, withdraws, its open screen) while the player is this close to it. */
const inHoverReach = (state: SimState, p: PieceState): boolean => state.roomId === FOUNDRY_ROOM && gapTo(state, p) <= HOVER_USE_REACH;

/** The hopper or crate under the cursor (the player's aim point) within HOVER_USE_REACH (050), if any. */
export function hoveredStore(state: SimState): Usable | undefined {
  const { aimX, aimY } = state.player;
  return state.foundry.pieces.find((p): p is Usable => {
    if (!usable(p) || !inHoverReach(state, p)) return false;
    const r = pieceRect(p);
    return Math.abs(aimX - r.x) <= r.w / 2 && Math.abs(aimY - r.y) <= r.h / 2;
  });
}

/** 050: whether the hopper or crate with this id can still be worked (its screen stays open): it stands within HOVER_USE_REACH. */
export function stillUsable(state: SimState, id: number): boolean {
  const p = state.foundry.pieces.find((q) => q.id === id);
  return p !== undefined && usable(p) && inHoverReach(state, p);
}

/**
 * What E acts on among the foundry's pieces: the hopper or crate under the cursor within 3 tiles (050); else the
 * nearest hopper or crate in reach, by centre distance, the first placed winning ties.
 */
export function usableInReach(state: SimState): Usable | undefined {
  const hovered = hoveredStore(state);
  if (hovered) return hovered;
  let best: Usable | undefined;
  let bestDist = Infinity;
  for (const p of state.foundry.pieces) {
    if (!usable(p) || !inReach(state, p)) continue;
    const r = pieceRect(p);
    const d = Math.hypot(r.x - state.player.x, r.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

/** How many of a stack of `n` an amount moves: one, ten (069), half rounded up, or all; never more than `n`. */
export function amountOf(amount: HopperAmount, n: number): number {
  if (n <= 0) return 0;
  if (amount === 'one') return 1;
  if (amount === 'ten') return Math.min(HOPPER_CLICK, n);
  if (amount === 'half') return Math.ceil(n / 2);
  return n;
}

/** How many a click moves from a stack of `stack` items (047) with `have` in all: one, half or the stack, never more than there are. */
export const fromStack = (amount: HopperAmount, have: number, stack: number | undefined): number => amountOf(amount, Math.min(have, stack ?? have));

/**
 * Moves some of a held item into a hopper in reach that's empty or already holds it, or into a crate in reach while its
 * 8 slots have room (047: the crate's screen; 050: each slot a stack); how many by `amount` of the clicked stack (`stack`, or all held).
 */
export function deposit(state: SimState, id: number, itemId: string, amount: HopperAmount, stack?: number): void {
  const p = state.foundry.pieces.find((q) => q.id === id);
  if (!p || !usable(p) || !inHoverReach(state, p)) return;
  const held = count(state.inventory, itemId);
  if (p.kind === 'crate') {
    const n = Math.min(fromStack(amount, held, stack), crateRoom(p.contents, itemId));
    if (n <= 0) return;
    state.inventory[itemId] = held - n;
    p.contents[itemId] = count(p.contents, itemId) + n;
    state.events.deposits.push({ id, itemId, count: n });
    return;
  }
  if (p.item !== null && p.item !== itemId) return;
  const n = fromStack(amount, held, stack);
  if (n === 0) return;
  state.inventory[itemId] = held - n;
  p.item = itemId;
  p.count += n;
  state.events.deposits.push({ id, itemId, count: n });
}

/**
 * Moves some of what's in a hopper or crate in reach back into the inventory (a crate's `itemId` kind, 047); how many
 * by `amount` of the clicked stack (`stack`, or all of the kind). At 0 a hopper forgets its type.
 */
export function withdraw(state: SimState, id: number, amount: HopperAmount, itemId?: string, stack?: number): void {
  const p = state.foundry.pieces.find((q) => q.id === id);
  if (!p || !usable(p) || !inHoverReach(state, p)) return;
  if (p.kind === 'crate') {
    if (itemId === undefined) return;
    const have = count(p.contents, itemId);
    const n = fromStack(amount, have, stack);
    if (n === 0) return;
    state.inventory[itemId] = count(state.inventory, itemId) + n;
    // A kind taken out whole leaves the crate's contents (as the old empty-all left `{}`).
    p.contents = have - n > 0 ? { ...p.contents, [itemId]: have - n } : Object.fromEntries(Object.entries(p.contents).filter(([k]) => k !== itemId));
    state.events.withdraws.push({ id, itemId, count: n });
    return;
  }
  if (!p.item || p.count === 0 || (itemId !== undefined && itemId !== p.item)) return;
  const n = fromStack(amount, p.count, stack);
  state.inventory[p.item] = count(state.inventory, p.item) + n;
  state.events.withdraws.push({ id, itemId: p.item, count: n });
  p.count -= n;
  if (p.count > 0) return;
  p.item = null;
  p.timer = 0;
}

/**
 * Withdraws and deposits. E on a hopper or a crate (047: its screen, as Factorio's) does nothing here; render opens
 * its screen, whose clicks arrive as these commands.
 */
export function stepFoundryUse(state: SimState, cmd: Command): void {
  if (cmd.withdraw) withdraw(state, cmd.withdraw.id, cmd.withdraw.amount, cmd.withdraw.itemId, cmd.withdraw.stack);
  if (cmd.deposit) deposit(state, cmd.deposit.id, cmd.deposit.itemId, cmd.deposit.amount, cmd.deposit.stack);
}
