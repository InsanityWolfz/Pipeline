import { AMMO } from '../data/ammo';
import { BASE_FAMILY } from '../data/roundKeywords';
import { ROUNDS, roundBase } from '../data/tags';
import { fillFirstEmpty } from './hotbar';
import type { SimState } from './state';

// The rounds the player knows (040.2): hand-crafted or hand-applied (`crafted`), made by a
// machine (`machineMade`), or carried at least once (`carried`, noted each tick and kept
// through a KO). The Build tab lists them; rounds never seen stay hidden, as recipes do.
// 047: a round carried for the first time also fills the carried bar's first empty slot.

/** Every round, by family in BASE_FAMILY's order (Arrow, Bomb, Ley, Landmine), each plain round before its tagged ones. */
export function roundsByFamily(): string[] {
  return Object.keys(BASE_FAMILY).flatMap((base) => [base, ...ROUNDS.filter((r) => roundBase(r) === base)]);
}

/** Notes every round in the inventory as carried (once a tick, and at the start); a new one takes the carried bar's first empty slot. */
export function noteCarried(state: Pick<SimState, 'inventory' | 'carried' | 'hotbar'>): void {
  for (const [id, n] of Object.entries(state.inventory)) {
    if (n <= 0 || !AMMO[id] || state.carried.includes(id)) continue;
    state.carried.push(id);
    fillFirstEmpty(state, id);
  }
}

/** The rounds the player knows, by family. */
export function knownRounds(state: Pick<SimState, 'crafted' | 'machineMade' | 'carried'>): string[] {
  return roundsByFamily().filter((id) => state.crafted.includes(id) || (state.machineMade[id] ?? 0) > 0 || state.carried.includes(id));
}
