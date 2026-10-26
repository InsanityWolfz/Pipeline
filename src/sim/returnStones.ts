import { ARENAS } from '../data/arenas';
import { RETURN_STONE, RETURN_STONES, type ReturnStoneDef } from '../data/returnStones';
import { playerInside } from './arenaLock';
import { gapTo } from './claims';
import { roomOf } from './roomLookup';
import type { SimState } from './state';

// Boss return points (072): a return waystone just outside each boss arena's door (src/data/returnStones.ts). It is
// dormant until the player first walks within its wake reach outside every arena, then woken for good (kept through a
// KO and saved), with an event render glows and chimes on. A woken stone is a fast travel destination
// (src/sim/claims.ts `travelDestinations`). No safe zone, deposit or supply, and no XP.

/** True once a return stone has woken. */
export const isWoken = (state: Pick<SimState, 'returnStones'>, id: string): boolean => state.returnStones.includes(id);

/** The return stones standing in the player's room (the overworld's, or the sandbox's at the same tiles). */
export function stonesHere(state: SimState): ReturnStoneDef[] {
  const here = roomOf(state).returnStones ?? [];
  return RETURN_STONES.filter((s) => here.some((h) => h.id === s.id));
}

/** True while the player stands inside any arena. */
const inAnyArena = (state: SimState): boolean => ARENAS.some((a) => playerInside(state, a));

/** Once a tick, after the player moves: wakes each dormant stone in the room whose wake reach the player's feet are in, from outside every arena. */
export function stepReturnWake(state: SimState): void {
  if (state.player.dying > 0) return;
  const stones = stonesHere(state);
  if (stones.length === 0 || inAnyArena(state)) return;
  for (const s of stones) {
    if (isWoken(state, s.id) || gapTo(state, s) > RETURN_STONE.wakeReach) continue;
    state.returnStones.push(s.id);
    state.events.returnWakes.push({ id: s.id });
  }
}
