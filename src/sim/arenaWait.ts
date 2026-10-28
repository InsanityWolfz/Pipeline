import { ARENAS, type ArenaDef } from '../data/arenas';
import { playerInside } from './arenaLock';
import type { EnemyState } from './enemies';
import type { SimState } from './state';
import { insideTiles } from './tiles';

// Arena enemies wait inside (059, 059.2, Shaun: "stay put and don't react until the player is through the door"): an
// enemy posted inside a boss arena's walls (its home on the arena's floor, in a room the arena stands in) doesn't
// wake, even on sight, until E at the door has put the player inside (055's lock, src/sim/arenaLock.ts). One awake when
// the player leaves goes back to its post, as a leash does. The Warden's Wisps and Husks, the Warden itself, and
// anything posted in the forum; the Bulwark already wakes only to a player inside (034) and its adds rise only then.

/** The arena whose floor holds this enemy's post, if any. */
export function arenaOfPost(e: Pick<EnemyState, 'roomId' | 'homeX' | 'homeY'>): ArenaDef | undefined {
  return ARENAS.find((a) => a.rooms.includes(e.roomId) && insideTiles(a.inside, e.homeX, e.homeY));
}

/** True while this enemy is posted in an arena and the player isn't inside that arena (in its room, on its floor). */
export function arenaWaits(state: Pick<SimState, 'player' | 'roomId'>, e: Pick<EnemyState, 'roomId' | 'homeX' | 'homeY'>): boolean {
  const arena = arenaOfPost(e);
  return arena !== undefined && !(state.roomId === e.roomId && playerInside(state, arena));
}

/** 073.5: true while this enemy's feet are on an arena's floor (in a room it stands in) and the player is inside that same arena. */
export function inArenaWithPlayer(state: Pick<SimState, 'player' | 'roomId'>, e: Pick<EnemyState, 'roomId' | 'x' | 'y'>): boolean {
  return ARENAS.some((a) => a.rooms.includes(e.roomId) && insideTiles(a.inside, e.x, e.y) && state.roomId === e.roomId && playerInside(state, a));
}
