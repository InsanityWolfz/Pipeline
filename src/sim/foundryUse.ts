import { USE_REACH } from '../data/foundry';
import { FEET_BOX } from '../data/player';
import { ITEMS } from '../data/items';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { Command } from './input';
import { count } from './inventory';
import { pieceRect, type CrateState, type HopperState, type PieceState, type SorterState, type StagerState } from './pieces';
import { cycleAngle } from './spread';
import type { SimState } from './state';

// Using hoppers, crates, stagers and sorters: E empties a crate into the
// inventory and turns a gravity stager to its next angle. E on a hopper or a
// sorter opens render's menu, whose choices arrive as deposit (put all of a held
// item in), withdraw (take everything out) and setFilter commands.

type Usable = HopperState | CrateState | StagerState | SorterState;

const usable = (p: PieceState): p is Usable => p.kind === 'hopper' || p.kind === 'crate' || p.kind === 'stager' || p.kind === 'sorter';

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

/** The nearest hopper, crate, stager or sorter in reach, by centre distance; the first placed wins ties. */
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

/** Moves all of a held item into a hopper in reach that's empty or already holds it. */
export function deposit(state: SimState, id: number, itemId: string): void {
  const h = state.foundry.pieces.find((p) => p.id === id);
  if (h?.kind !== 'hopper' || !inReach(state, h) || (h.item !== null && h.item !== itemId)) return;
  const n = count(state.inventory, itemId);
  if (n === 0) return;
  state.inventory[itemId] = 0;
  h.item = itemId;
  h.count += n;
  state.events.deposits.push({ id, itemId, count: n });
}

/** Moves everything in a hopper in reach back into the inventory; the hopper forgets its type. */
export function withdraw(state: SimState, id: number): void {
  const h = state.foundry.pieces.find((p) => p.id === id);
  if (h?.kind !== 'hopper' || !inReach(state, h) || !h.item || h.count === 0) return;
  state.inventory[h.item] = count(state.inventory, h.item) + h.count;
  state.events.withdraws.push({ id, itemId: h.item, count: h.count });
  h.item = null;
  h.count = 0;
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
 * Withdraws, deposits, filters, then E on the nearest crate or stager. E on a
 * hopper or sorter does nothing here; render opens its menu.
 */
export function stepFoundryUse(state: SimState, cmd: Command): void {
  if (cmd.withdraw) withdraw(state, cmd.withdraw.id);
  if (cmd.setFilter) setFilter(state, cmd.setFilter.id, cmd.setFilter.itemId);
  if (cmd.deposit) deposit(state, cmd.deposit.id, cmd.deposit.itemId);
  if (!cmd.interact) return;
  const target = usableInReach(state);
  if (target?.kind === 'crate') takeCrate(state, target);
  if (target?.kind === 'stager') cycleAngle(state, target.id);
}
