import { USE_REACH } from '../data/foundry';
import { FEET_BOX } from '../data/player';
import { ITEMS } from '../data/items';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { Command, HopperAmount } from './input';
import { count } from './inventory';
import { diagramInReach } from './research';
import { pieceRect, type CrateState, type HopperState, type PieceState, type SorterState } from './pieces';
import type { SimState } from './state';

// Using hoppers, crates and sorters: E empties a crate into the inventory (the
// intake's caps are restored at their diagrams, 033). E on a hopper or a
// sorter opens render's menu, whose choices arrive as deposit (put some of a held
// item in), withdraw (take some out) and setFilter commands. Deposits and
// withdraws move one, half (rounded up) or all of the stack they draw from (022).

type Usable = HopperState | CrateState | SorterState;

const usable = (p: PieceState): p is Usable => p.kind === 'hopper' || p.kind === 'crate' || p.kind === 'sorter';

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

/** The nearest hopper, crate or sorter in reach, by centre distance; the first placed wins ties. */
export function usableInReach(state: SimState): Usable | undefined {
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

/** How many of a stack of `n` an amount moves: one, half rounded up, or all; never more than `n`. */
export function amountOf(amount: HopperAmount, n: number): number {
  if (n <= 0) return 0;
  if (amount === 'one') return 1;
  if (amount === 'half') return Math.ceil(n / 2);
  return n;
}

/** Moves some of a held item into a hopper in reach that's empty or already holds it. */
export function deposit(state: SimState, id: number, itemId: string, amount: HopperAmount): void {
  const h = state.foundry.pieces.find((p) => p.id === id);
  if (h?.kind !== 'hopper' || !inReach(state, h) || (h.item !== null && h.item !== itemId)) return;
  const held = count(state.inventory, itemId);
  const n = amountOf(amount, held);
  if (n === 0) return;
  state.inventory[itemId] = held - n;
  h.item = itemId;
  h.count += n;
  state.events.deposits.push({ id, itemId, count: n });
}

/** Moves some of what's in a hopper in reach back into the inventory; at 0 the hopper forgets its type. */
export function withdraw(state: SimState, id: number, amount: HopperAmount): void {
  const h = state.foundry.pieces.find((p) => p.id === id);
  if (h?.kind !== 'hopper' || !inReach(state, h) || !h.item || h.count === 0) return;
  const n = amountOf(amount, h.count);
  state.inventory[h.item] = count(state.inventory, h.item) + n;
  state.events.withdraws.push({ id, itemId: h.item, count: n });
  h.count -= n;
  if (h.count > 0) return;
  h.item = null;
  h.timer = 0;
}

function takeCrate(state: SimState, c: CrateState): void {
  const items = c.contents;
  if (Object.keys(items).length === 0) return;
  for (const [itemId, n] of Object.entries(items)) state.inventory[itemId] = count(state.inventory, itemId) + n;
  c.contents = {};
  state.events.crateTakes.push({ id: c.id, items });
}

/** Sets the item a sorter in reach sends out its side; null passes everything (015). */
export function setFilter(state: SimState, id: number, itemId: string | null): void {
  const p = state.foundry.pieces.find((q) => q.id === id);
  if (p?.kind !== 'sorter' || !inReach(state, p)) return;
  if (itemId !== null && !(itemId in ITEMS)) return;
  p.filter = itemId;
}

/**
 * Withdraws, deposits, filters, then E: on the nearest crate it empties it. E on a
 * hopper or sorter does nothing here; render opens its menu. With a diagram in reach
 * (033) E is the restore panel's (render opens it), so it empties no crate.
 */
export function stepFoundryUse(state: SimState, cmd: Command): void {
  if (cmd.withdraw) withdraw(state, cmd.withdraw.id, cmd.withdraw.amount);
  if (cmd.setFilter) setFilter(state, cmd.setFilter.id, cmd.setFilter.itemId);
  if (cmd.deposit) deposit(state, cmd.deposit.id, cmd.deposit.itemId, cmd.deposit.amount);
  if (!cmd.interact || diagramInReach(state)) return;
  const target = usableInReach(state);
  if (target?.kind === 'crate') takeCrate(state, target);
}
