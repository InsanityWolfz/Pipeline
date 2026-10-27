import { ARENAS } from '../data/arenas';
import { RETURN_STONE, RETURN_STONES, type ReturnStoneDef } from '../data/returnStones';
import { playerInside } from './arenaLock';
import { FIXTURE_REACH } from '../data/claims';
import { FOUNDRY_ROOM } from '../data/rooms';
import { claimedPylonInReach, gapTo, travelTo, travelToDestination } from './claims';
import type { Command } from './input';
import { roomById, roomOf } from './roomLookup';
import type { SimState } from './state';

// Boss return points (072): a return waystone just outside each boss arena's door (src/data/returnStones.ts). It is
// dormant until the player first walks within its wake reach outside every arena, then woken for good (kept through a
// KO and saved), with an event render glows and chimes on. A woken stone is a fast travel destination
// (src/sim/claims.ts `travelDestinations`), from the foundry's waystone and from a claimed pylon's menu, and E at it
// offers "Travel to foundry" (`travel` = FOUNDRY_ROOM). No safe zone, deposit or supply, and no XP. The sandbox's stand
// woken but travel nowhere: the sandbox has no way to the foundry.

/** True once a return stone has woken. */
export const isWoken = (state: Pick<SimState, 'returnStones'>, id: string): boolean => state.returnStones.includes(id);

/** The return stones standing in the player's room (the overworld's, or the sandbox's at the same tiles). */
export function stonesHere(state: SimState): ReturnStoneDef[] {
  const here = roomOf(state).returnStones ?? [];
  return RETURN_STONES.filter((s) => here.some((h) => h.id === s.id));
}

/** 072.9: the woken return stones in the player's room, in data order (the minimap marks these). */
export const wokenStonesHere = (state: SimState): ReturnStoneDef[] => stonesHere(state).filter((s) => isWoken(state, s.id));

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

/** The return stone in the player's room nearest their feet within E's reach (a fixture's), woken or not, if any. */
export function returnStoneInReach(state: SimState): ReturnStoneDef | undefined {
  let best: ReturnStoneDef | undefined;
  for (const s of stonesHere(state)) if (gapTo(state, s) <= FIXTURE_REACH && (!best || gapTo(state, s) < gapTo(state, best))) best = s;
  return best;
}

/** The woken return stone in reach whose E offers "Travel to foundry", if any: never the sandbox's. */
export function usableStoneInReach(state: SimState): ReturnStoneDef | undefined {
  const s = returnStoneInReach(state);
  return s && !state.sandbox && isWoken(state, s.id) ? s : undefined;
}

/**
 * After the pylons and fixtures: a woken stone's menu choice home (`travel` = FOUNDRY_ROOM), a claimed pylon's menu choice
 * of a woken stone (`travel` = its id), and E at a woken stone, which opens render's menu (so it doesn't also harvest).
 * Returns the command the rest of the tick sees.
 */
export function stepReturnStones(state: SimState, cmd: Command): Command {
  if (cmd.travel !== null) {
    if (cmd.travel === FOUNDRY_ROOM && usableStoneInReach(state)) travelTo(state, FOUNDRY_ROOM, roomById(FOUNDRY_ROOM).spawn);
    else if (isWoken(state, cmd.travel) && claimedPylonInReach(state)) travelToDestination(state, cmd.travel);
  }
  return cmd.interact && usableStoneInReach(state) ? { ...cmd, interact: false } : cmd;
}
