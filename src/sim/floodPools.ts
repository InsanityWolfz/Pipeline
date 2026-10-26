import { enemyDef } from '../data/enemies';
import { damagePlayer } from './health';
import type { SimState } from './state';

// Ground hazards that hurt only the player (060, generalised in 061): the Forge Flood's fire pools, a cinder mote's
// pool and a bellows hound's burning trail. Each lies on the ground for its `ticks`, dealing its own `damage` every
// `everyTicks` (once a second), from the tick it appears, to a player whose feet stand in it (a roll's i-frames let a
// beat pass). It never hurts an enemy. As the last flood pool of a Forgewright dries, that Forgewright's heat goes back to 0.

/**
 * A pool's shape: a `rect` (x0, y0)–(x1, y1) (the flood's half of its hall); a `circle` of radius `r` round (x0, y0)
 * (a mote's; x1, y1 are the same point); a `capsule`, every point within `r` of the segment (x0, y0)–(x1, y1) (a
 * hound's trail, `r` half its width).
 */
export type PoolShape = 'rect' | 'circle' | 'capsule';

export interface FloodPool {
  /** The enemy that left it, by id and kind. */
  ownerId: number;
  enemyId: string;
  roomId: string;
  shape: PoolShape;
  /** Its rect's corners or its segment's ends, px; and its radius (0 for a rect). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r: number;
  /** Each beat's damage, and the ticks between beats. */
  damage: number;
  everyTicks: number;
  /** Ticks since it appeared, and ticks left. */
  age: number;
  ticks: number;
}

/** The distance from a point to the segment a–b, px. */
export function toSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

/** True if a point is in a pool. */
export function inPool(p: Pick<FloodPool, 'shape' | 'x0' | 'y0' | 'x1' | 'y1' | 'r'>, x: number, y: number): boolean {
  if (p.shape === 'rect') return x >= p.x0 && x < p.x1 && y >= p.y0 && y < p.y1;
  return toSegment(x, y, p.x0, p.y0, p.x1, p.y1) <= p.r;
}

/** True while any pool its Forgewright flooded is out. */
export const floodOut = (state: Pick<SimState, 'floodPools'>, ownerId: number): boolean => state.floodPools.some((p) => p.ownerId === ownerId && p.shape === 'rect');

/** A round pool (a circle, or a capsule along a segment) left by an enemy, from its tick on. */
export function layPool(state: SimState, owner: { id: number; enemyId: string; roomId: string }, shape: 'circle' | 'capsule', at: { x0: number; y0: number; x1: number; y1: number; r: number }, def: { ticks: number; damage: number; everyTicks: number }): FloodPool {
  const pool: FloodPool = { ownerId: owner.id, enemyId: owner.enemyId, roomId: owner.roomId, shape, ...at, damage: def.damage, everyTicks: def.everyTicks, age: 0, ticks: def.ticks };
  state.floodPools.push(pool);
  return pool;
}

/** Every pool, a tick: a beat on the player standing in it, then it ages, drying at its end. */
export function stepFloodPools(state: SimState): void {
  if (state.floodPools.length === 0) return;
  const dried: number[] = [];
  const p = state.player;
  state.floodPools = state.floodPools.filter((pool) => {
    if (pool.age % pool.everyTicks === 0 && pool.roomId === state.roomId && inPool(pool, p.x, p.y)) damagePlayer(state, pool.damage, 0, 0, 0, 0);
    pool.age += 1;
    pool.ticks -= 1;
    if (pool.ticks > 0) return true;
    if (pool.shape === 'rect') dried.push(pool.ownerId);
    return false;
  });
  for (const id of dried) {
    if (floodOut(state, id)) continue;
    const owner = state.enemies.find((e) => e.id === id);
    if (owner && enemyDef(owner.enemyId).kind === 'forgewright') owner.heat = 0;
  }
}
