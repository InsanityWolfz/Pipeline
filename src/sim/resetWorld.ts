import { DEFAULT_ROOM } from '../data/rooms';
import { LANDMARK_LIST } from '../data/landmarks';
import { bossReturns, settleSummons } from './altar';
import { makeChampion, rollChampions } from './champions';
import { createEnemy } from './enemies';
import { clearMines } from './mines';
import { createNodes } from './nodes';
import { createPlayer } from './player';
import { inSafeZone, resetPopulation } from './population';
import { roomOf } from './roomLookup';
import type { SimState } from './state';
import { playerStats } from './stats';
import { tileCentre } from './tiles';
import { createTube } from './tube';
import { WORLD } from './world';

// Resetting the world to its start (a KO's wake, Continue): split from state.ts (047) to keep it under 300 lines.

/**
 * Puts the world back to its start: player at the spawn room's spawn with full
 * health, the tube on its starting ammo, every
 * room's enemies at home and nodes at full, and nothing harvesting, on the
 * ground or in flight, and build mode off. The tick, seed, RNG, id counters,
 * the inventory (a death trims it first), the crafted set, the tube's link and
 * the intake's entrances, research (033), claims, the stash, gear and the whole foundry carry on. Claimed rooms get no enemies back.
 */
export function resetWorld(state: SimState, spawnRoomId = DEFAULT_ROOM): void {
  const rooms = Object.values(WORLD);
  state.roomId = spawnRoomId;
  // The start's own spawn when waking in its room (017: the overworld has several), else the room's.
  const spawn = spawnRoomId === state.start.room ? state.start.spawn : roomOf(state).spawn;
  state.player = createPlayer(tileCentre(spawn));
  // Waking at full health means the worn gear's max (036).
  state.player.health = playerStats(state).maxHealth;
  state.tube = createTube();
  state.arrows = [];
  state.groundItems = [];
  state.nodes = createNodes(rooms, state.seed);
  state.harvest = null;
  state.bombs = [];
  clearMines(state);
  state.pools = [];
  state.enemyBombs = [];
  settleSummons(state);
  state.orbs = [];
  state.claimHold = null;
  state.cacheHold = null;
  state.building = false;
  // A claimed site's guards are gone for good (017: a site is a group of the room's enemies), and no guard comes back
  // inside a claimed pylon's safe zone (032).
  state.enemies = rooms.flatMap((room) =>
    (room.enemies ?? [])
      .filter((p) => (!p.group || !state.claims.includes(p.group)) && !inSafeZone(state, room.id, tileCentre(p).x, tileCentre(p).y) && bossReturns(state, p.enemyId))
      .map((p) => {
        const e = createEnemy(state.nextEnemyId++, p.enemyId, tileCentre(p), room.id, p.group);
        // 049: a guard placed as its pack's champion (the Husk Hive's) is always one.
        if (p.champion) makeChampion(state.rng, e);
        return e;
      }),
  );
  // Each landmark's guard pack may hold a champion (032); the tutorial's packs never do, and one that already holds its
  // placed champion (049) draws none.
  for (const l of LANDMARK_LIST) {
    const pack = state.enemies.filter((e) => e.group === l.id);
    if (!pack.some((e) => e.champion !== null)) rollChampions(state.rng, pack, l.ring);
  }
  resetPopulation(state);
}
