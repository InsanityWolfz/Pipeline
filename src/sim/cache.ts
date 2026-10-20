import { PYLON_REACH } from '../data/claims';
import { CACHE_BURST, CACHE_DROPS, LANDMARK_LIST, LANDMARKS, landmarkDef } from '../data/landmarks';
import { OVERWORLD_ROOM } from '../data/overworld';
import type { Command } from './input';
import { gapTo, holdBroken, occupied } from './claims';
import { rollDrops, scatterItems } from './drops';
import { areaInView } from './landmarks';
import { roomOf, type SimState } from './state';
import { tileCentre } from './tiles';
import { createEnemy } from './enemies';
import { rollChampions } from './champions';
import { inSafeZone } from './population';

// The Ruined Cache (032): a sealed reliquary guarded by a hand-placed pack. While any
// guard lives E finds it sealed; after, holding E opens it (like a harvest) and its drop
// table, rolled with the seeded RNG, scatters on the ground like an enemy's. It stays open
// and empty until it re-arms after `cacheRearmTicks` of play, on a tick it's out of view:
// its contents return, and any dead guards. A KO never refills it.

export interface CacheState {
  /** The landmark's id. */
  id: string;
  /** The tick it was opened, or null while it's full. */
  openedAt: number | null;
}

export interface CacheHold {
  id: string;
  progress: number;
}

export function createCaches(): CacheState[] {
  return LANDMARK_LIST.filter((l) => l.cache).map((l) => ({ id: l.id, openedAt: null }));
}

/** The reliquary in the player's room within reach, if any. */
export function cacheInReach(state: SimState): { id: string; tx: number; ty: number } | undefined {
  return (roomOf(state).caches ?? []).find((c) => gapTo(state, c) <= PYLON_REACH);
}

export const isOpened = (state: Pick<SimState, 'caches'>, id: string): boolean => state.caches.some((c) => c.id === id && c.openedAt !== null);

/** Runs a cache being opened, then E at a cache in reach. Returns the command the rest of the tick sees. */
export function stepCache(state: SimState, cmd: Command): Command {
  advance(state, cmd);
  if (!cmd.interact) return cmd;
  const cache = cacheInReach(state);
  if (!cache) return cmd;
  if (occupied(state, cache.id)) state.events.sealed.push({ site: cache.id });
  else if (!isOpened(state, cache.id) && !state.cacheHold) state.cacheHold = { id: cache.id, progress: 1 };
  return { ...cmd, interact: false };
}

function advance(state: SimState, cmd: Command): void {
  const hold = state.cacheHold;
  if (!hold) return;
  if (holdBroken(state, cmd) || cacheInReach(state)?.id !== hold.id || occupied(state, hold.id)) {
    state.cacheHold = null;
    return;
  }
  hold.progress += 1;
  if (hold.progress < LANDMARKS.cacheOpenTicks) return;
  state.cacheHold = null;
  open(state, hold.id);
}

/**
 * Opens a cache: rolls its table and scatters the drops on the ground below it. Each bursts out of the chest in turn
 * (045): it waits out its turn, its flight and a hold before the magnet pull may take it.
 */
function open(state: SimState, id: string): void {
  const cache = state.caches.find((c) => c.id === id);
  const at = landmarkDef(id).cache;
  if (!cache || !at || cache.openedAt !== null) return;
  cache.openedAt = state.tick;
  const below = tileCentre({ tx: at.tx, ty: at.ty + 1 });
  const first = state.groundItems.length;
  scatterItems(state, rollDrops(CACHE_DROPS, state.rng), state.roomId, below.x, below.y);
  const c = tileCentre(at);
  const B = CACHE_BURST;
  state.groundItems.slice(first).forEach((g, i) => {
    g.burst = { x: c.x, y: c.y, delay: i * B.staggerTicks };
    g.wait = i * B.staggerTicks + B.flightTicks + B.holdTicks;
  });
  state.events.cacheOpens.push({ id, x: c.x, y: c.y });
}

/**
 * Once per tick: an opened cache whose play time since opening has reached `cacheRearmTicks` re-arms on a tick its
 * area is out of view, with its dead guards back at home.
 */
export function stepCacheRearm(state: SimState): void {
  for (const cache of state.caches) {
    if (cache.openedAt === null || state.tick - cache.openedAt < LANDMARKS.cacheRearmTicks) continue;
    const def = landmarkDef(cache.id);
    if (areaInView(state, def.area)) continue;
    cache.openedAt = null;
    const back = def.guards.flatMap((g) => {
      const home = tileCentre(g);
      const alive = state.enemies.some((e) => e.group === def.id && e.homeX === home.x && e.homeY === home.y);
      // Never inside a claimed pylon's safe zone, as at a world reset.
      return alive || inSafeZone(state, OVERWORLD_ROOM, home.x, home.y) ? [] : [createEnemy(state.nextEnemyId++, g.enemyId, home, OVERWORLD_ROOM, def.id)];
    });
    // The guards coming back are a pack spawning: they may hold a champion.
    rollChampions(state.rng, back, def.ring);
    state.enemies.push(...back);
  }
}
