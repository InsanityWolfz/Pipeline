import { enemyDef } from '../data/enemies';
import { HOLLOWS } from '../data/hollows';
import { OVERWORLD_ROOM } from '../data/overworld';
import { FEET_BOX } from '../data/player';
import { SANDBOX_ROOM } from '../data/rooms';
import { engaged } from './bulwarkAi';
import { resetFight } from './bulwarkPhases';
import { gapTo } from './claims';
import { defOf } from './champions';
import { overlapsRect, type Box, type Rect } from './collision';
import { createEnemy, type EnemyState } from './enemies';
import { tileRect } from './fixtures';
import type { Command } from './input';
import type { SimState } from './state';
import { insideTiles, tileCentre } from './tiles';

// The arena lock (043, was 041.18): while a region boss fights, a ley barrier seals its
// arena's way in, so the fight can't be walked out to a healing spot and back. Feet can't
// pass it, the player's or an enemy's. E at the sealed door leaves: the player stands just
// outside, and the fight resets as a leash reset does, at once (the boss back at its start
// at full health, its adds and bombs gone), so the seal drops. The seal is derived from
// the boss's state, never stored: it stands exactly while the boss is engaged. 044: the
// sandbox's room holds the forum at the same tiles, so its seal works there the same way.

export type Arena = typeof HOLLOWS.arena;

/** Every arena with a seal. */
export const ARENAS: readonly Arena[] = [HOLLOWS.arena];

/** The rooms the arenas stand in, at the same tiles: the overworld, and the sandbox's room (044). */
export const ARENA_ROOMS: readonly string[] = [OVERWORLD_ROOM, SANDBOX_ROOM];

/** The arena's boss, alive in `roomId`, if any. */
const bossOf = (state: Pick<SimState, 'enemies'>, arena: Arena, roomId: string): EnemyState | undefined =>
  state.enemies.find((e) => e.enemyId === arena.boss && e.roomId === roomId && e.health > 0);

/** True while the arena's boss fights in `roomId` (the overworld unless told): its way in is sealed. */
export function arenaSealed(state: Pick<SimState, 'enemies'>, arena: Arena, roomId: string = OVERWORLD_ROOM): boolean {
  const boss = bossOf(state, arena, roomId);
  return boss !== undefined && engaged(boss);
}

/** The solid boxes of every sealed arena's seal in a room. */
export function sealRects(state: Pick<SimState, 'enemies'>, roomId: string): Rect[] {
  if (!ARENA_ROOMS.includes(roomId)) return [];
  return ARENAS.filter((a) => arenaSealed(state, a, roomId)).flatMap((a) => a.seal.tiles.map(tileRect));
}

/**
 * Moves a body already overlapping a seal tile off it, to its own side (into the arena if its feet are in it), so it
 * can't walk on through. It moves straight north or south and assumes the tiles either side of the seal are open floor
 * (the forum's first floor row and the road outside its way in, both cleared in data), so it never lands in a wall.
 */
function pushOff(arena: Arena, body: { x: number; y: number }, box: Box): void {
  for (const r of arena.seal.tiles.map(tileRect)) {
    if (!overlapsRect(body.x, body.y, box, r)) continue;
    const south = insideTiles(arena.inside, body.x, body.y);
    body.y = south ? r.y + (r.h + box.h) / 2 : r.y - (r.h + box.h) / 2;
  }
}

/**
 * After enemies act: a body standing in a sealed doorway as the seal rises (the player's feet box reaches into the
 * door row as it wakes the boss) is pushed off it; the seal stops it from then on.
 */
export function stepSeal(state: SimState): void {
  for (const roomId of ARENA_ROOMS) {
    for (const arena of ARENAS) {
      if (!arenaSealed(state, arena, roomId)) continue;
      if (state.roomId === roomId) pushOff(arena, state.player, FEET_BOX);
      for (const e of state.enemies) if (e.roomId === roomId) pushOff(arena, e, defOf(e).feetBox);
    }
  }
}

/** The sealed arena whose seal is within reach of the player's feet box, if any. */
function sealInReach(state: SimState): Arena | undefined {
  if (!ARENA_ROOMS.includes(state.roomId)) return undefined;
  return ARENAS.find((a) => arenaSealed(state, a, state.roomId) && a.seal.tiles.some((t) => gapTo(state, t) <= a.seal.reach));
}

/** The boss back at its start as it was placed (full health, idle, nothing on it), its adds and bombs gone: a leash reset, at once (044: the sandbox's reset too). */
export function resetBoss(state: SimState, boss: EnemyState): void {
  // resetFight sinks its adds (it filters them out only while `addsRisen` is set), so it runs before the fresh copy clears that flag.
  const def = enemyDef(boss.enemyId);
  if (def.kind === 'bulwark') resetFight(state, boss, def);
  Object.assign(boss, createEnemy(boss.id, boss.enemyId, { x: boss.homeX, y: boss.homeY }, boss.roomId, boss.group));
  state.enemyBombs = state.enemyBombs.filter((b) => b.enemyId !== boss.enemyId || b.roomId !== boss.roomId);
}

/** E at a sealed door, before the altars: the player leaves and the fight resets. Returns the command the rest of the tick sees. */
export function stepArenaLock(state: SimState, cmd: Command): Command {
  if (!cmd.interact) return cmd;
  const arena = sealInReach(state);
  const boss = arena && bossOf(state, arena, state.roomId);
  if (!arena || !boss) return cmd;
  const out = tileCentre(arena.seal.leaveTo);
  state.player.x = out.x;
  state.player.y = out.y;
  resetBoss(state, boss);
  state.events.arenaLeaves.push({ arena: arena.id });
  return { ...cmd, interact: false };
}
