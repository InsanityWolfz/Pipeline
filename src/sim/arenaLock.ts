import { ARENAS, type ArenaDef } from '../data/arenas';
import { enemyDef } from '../data/enemies';
import { OVERWORLD_ROOM } from '../data/overworld';
import { SANDBOX_ROOM } from '../data/rooms';
import { engaged } from './bulwarkAi';
import { resetFight } from './bulwarkPhases';
import { gapTo } from './claims';
import { createEnemy, type EnemyState } from './enemies';
import type { Command } from './input';
import type { SimState } from './state';
import { insideTiles, tileCentre } from './tiles';

// The arena doors and lock (055, D.5; 043's lock, was 041.18). Each boss arena (src/data/arenas.ts) is walled all
// round, its door part of the wall: solid to feet and shots, always. The door is sealed until its gate opens (the
// shrine's for the Warden, the Hollows' barrier for the Bulwark); then E at it from outside stands the player just
// inside. From inside, E at it leaves, sealed or not: the player stands just outside, and if the boss lives the fight
// resets as 043's did, at once (the boss back at its start at full health, its adds and bombs gone). "Locked" is 043's
// seal, derived from the boss, never stored: it stands exactly while the boss fights, and render draws it over the door.
// The sandbox's room holds the forum at the same tiles (044), its door always open.

export type Arena = ArenaDef;
export { ARENAS };

/** The rooms any arena stands in: the overworld, and the sandbox's room (044). */
export const ARENA_ROOMS: readonly string[] = [...new Set(ARENAS.flatMap((a) => a.rooms))];

/** The arena's boss, alive in `roomId`, if any: the one in the arena's group, or (044) any in the sandbox. */
const bossOf = (state: Pick<SimState, 'enemies'>, arena: Arena, roomId: string): EnemyState | undefined =>
  !arena.rooms.includes(roomId) ? undefined : state.enemies.find((e) => e.enemyId === arena.boss && e.roomId === roomId && e.health > 0 && (roomId === SANDBOX_ROOM || e.group === arena.id));

/**
 * True while the player is inside the arena (in `roomId`, the overworld unless told) and its boss fights them: 043's
 * lock, drawn over the door. (The Warden wakes on sight, through its walls, so a fight seen from outside isn't one.)
 */
export function arenaLocked(state: Pick<SimState, 'enemies' | 'player' | 'roomId'>, arena: Arena, roomId: string = OVERWORLD_ROOM): boolean {
  const boss = bossOf(state, arena, roomId);
  return boss !== undefined && engaged(boss) && state.roomId === roomId && insideTiles(arena.inside, state.player.x, state.player.y);
}

/** True once the arena's door opens to E from outside: its gate is open, or (044) it stands in the sandbox. */
export function doorUnlocked(state: Pick<SimState, 'gates'>, arena: Arena, roomId: string = OVERWORLD_ROOM): boolean {
  return roomId === SANDBOX_ROOM || state.gates[arena.door.unlock];
}

/** True if the player's feet are inside the arena (in a room it stands in). */
export const playerInside = (state: Pick<SimState, 'player' | 'roomId'>, arena: Arena): boolean => arena.rooms.includes(state.roomId) && insideTiles(arena.inside, state.player.x, state.player.y);

/** The arena in the player's room whose door is within reach of the player's feet box, if any. */
export function doorInReach(state: SimState): Arena | undefined {
  return ARENAS.find((a) => a.rooms.includes(state.roomId) && a.door.tiles.some((t) => gapTo(state, t) <= a.door.reach));
}

/** What E at a door in reach would do: go in, go out, or nothing (sealed, from outside). */
export function doorUse(state: SimState, arena: Arena): 'enter' | 'leave' | null {
  if (playerInside(state, arena)) return 'leave';
  return doorUnlocked(state, arena, state.roomId) ? 'enter' : null;
}

/** The boss back at its start as it was placed (full health, idle, nothing on it), its adds and bombs gone: a leash reset, at once (044: the sandbox's reset too). */
export function resetBoss(state: SimState, boss: EnemyState): void {
  // resetFight sinks its adds (it filters them out only while `addsRisen` is set), so it runs before the fresh copy clears that flag.
  const def = enemyDef(boss.enemyId);
  if (def.kind === 'bulwark') resetFight(state, boss, def);
  Object.assign(boss, createEnemy(boss.id, boss.enemyId, { x: boss.homeX, y: boss.homeY }, boss.roomId, boss.group));
  state.enemyBombs = state.enemyBombs.filter((b) => b.enemyId !== boss.enemyId || b.roomId !== boss.roomId);
}

/** E at a door, before the altars: in, or out with the fight reset. Returns the command the rest of the tick sees. */
export function stepArenaLock(state: SimState, cmd: Command): Command {
  if (!cmd.interact) return cmd;
  const arena = doorInReach(state);
  const use = arena && doorUse(state, arena);
  if (!arena || !use) return cmd;
  const to = tileCentre(use === 'enter' ? arena.door.enterTo : arena.door.leaveTo);
  state.player.x = to.x;
  state.player.y = to.y;
  if (use === 'enter') state.events.arenaEnters.push({ arena: arena.id });
  else {
    const boss = bossOf(state, arena, state.roomId);
    if (boss) resetBoss(state, boss);
    state.events.arenaLeaves.push({ arena: arena.id });
  }
  return { ...cmd, interact: false };
}
