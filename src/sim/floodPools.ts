import { enemyDef } from '../data/enemies';
import { damagePlayer } from './health';
import type { SimState } from './state';

// The Forge Flood's fire pools (060): a hazard on the ground that hurts only the player. Each pool covers a rect of
// its Forgewright's hall (the half the player stood in as the wind-up began) for its `floodTicks`, dealing its
// `damage` every `everyTicks` (once a second), from the tick it spreads, to a player whose feet stand in it (a roll's
// i-frames let a beat pass). As its last pool dries, its Forgewright's heat goes back to 0.

export interface FloodPool {
  /** The Forgewright that flooded it, by id and kind (its numbers). */
  ownerId: number;
  enemyId: string;
  roomId: string;
  /** The rect it covers, px. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Ticks since it spread, and ticks left. */
  age: number;
  ticks: number;
}

/** True if a point is in a pool's rect. */
export const inPool = (p: Pick<FloodPool, 'x0' | 'y0' | 'x1' | 'y1'>, x: number, y: number): boolean => x >= p.x0 && x < p.x1 && y >= p.y0 && y < p.y1;

/** True while any pool its Forgewright flooded is out. */
export const floodOut = (state: Pick<SimState, 'floodPools'>, ownerId: number): boolean => state.floodPools.some((p) => p.ownerId === ownerId);

/** Every pool, a tick: a beat on the player standing in it, then it ages, drying at its end. */
export function stepFloodPools(state: SimState): void {
  if (state.floodPools.length === 0) return;
  const dried: number[] = [];
  state.floodPools = state.floodPools.filter((pool) => {
    const def = enemyDef(pool.enemyId);
    if (def.kind !== 'forgewright') return false;
    const { flood } = def;
    const p = state.player;
    if (pool.age % flood.everyTicks === 0 && pool.roomId === state.roomId && inPool(pool, p.x, p.y)) damagePlayer(state, flood.damage, 0, 0, 0, 0);
    pool.age += 1;
    pool.ticks -= 1;
    if (pool.ticks > 0) return true;
    dried.push(pool.ownerId);
    return false;
  });
  for (const id of dried) {
    if (floodOut(state, id)) continue;
    const owner = state.enemies.find((e) => e.id === id);
    if (owner) owner.heat = 0;
  }
}
