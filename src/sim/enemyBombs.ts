import { windupsOf } from './bulwarkPhases';
import { defOf } from './champions';
import { damagePlayer } from './health';
import type { EnemyState } from './enemies';
import { nextFloat } from './rng';
import type { SimState } from './state';

// The Bulwark's bombs (034). Each landing spot shows at once: a red ring of its radius,
// with a filled circle growing from its centre over the fuse. When the circle meets the
// ring the bomb bursts, hurting a player whose feet are inside unless a roll's i-frames
// (or a hit's) are running; an enraged Bulwark's (041.12) a roll doesn't save from. They
// never hurt enemies.

export interface EnemyBombState {
  id: number;
  /** The kind that threw it, for its tuning. */
  enemyId: string;
  roomId: string;
  /** Where it lands, px; and where it was thrown from (render arcs it in). */
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  radius: number;
  /** Ticks since it was thrown; it bursts at `fuseTicks`. */
  fuse: number;
  fuseTicks: number;
  /** Its burst's damage, from the thrower's def as the sim reads it (defOf), and whether a roll's i-frames don't save from it (041.12: an enraged Bulwark's). */
  damage: number;
  rollProof: boolean;
}

/** Throws a lob's bombs from an enemy: one at the player's feet now, the rest within `scatter` of it (seeded). */
export function throwBombs(state: SimState, e: EnemyState): void {
  const def = defOf(e);
  if (def.kind !== 'bulwark') return;
  const { lob } = def;
  const p = state.player;
  for (let i = 0; i < lob.count; i++) {
    // A point evenly spread over the scatter disc (the square root keeps it from bunching in the middle).
    const angle = i === 0 ? 0 : nextFloat(state.rng) * 2 * Math.PI;
    const r = i === 0 ? 0 : Math.sqrt(nextFloat(state.rng)) * lob.scatter;
    state.enemyBombs.push({
      id: state.nextEnemyBombId++,
      enemyId: e.enemyId,
      roomId: e.roomId,
      x: p.x + Math.cos(angle) * r,
      y: p.y + Math.sin(angle) * r,
      fromX: e.x,
      fromY: e.y,
      radius: lob.radius,
      fuse: 0,
      fuseTicks: windupsOf(e, def).fuse,
      damage: lob.damage,
      rollProof: e.enraged && def.enrage.rollProofLobs,
    });
  }
  state.events.lobs.push({ id: e.id, count: lob.count });
}

/** Burns every fuse a tick; a bomb whose circle meets its ring bursts and is gone. Runs before enemies act, so a new bomb starts at 0. */
export function stepEnemyBombs(state: SimState): void {
  state.enemyBombs = state.enemyBombs.filter((b) => {
    b.fuse += 1;
    if (b.fuse < b.fuseTicks) return true;
    state.events.enemyBursts.push({ x: b.x, y: b.y, radius: b.radius });
    const def = defOf({ enemyId: b.enemyId, champion: null, ring: 0 });
    const p = state.player;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (def.kind === 'bulwark' && b.roomId === state.roomId && dist <= b.radius) {
      const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [0, 1];
      damagePlayer(state, b.damage, kx, ky, def.lob.knockback, def.lob.knockTicks, b.rollProof);
    }
    return false;
  });
}

/** How far a bomb's inner circle has grown toward its ring, 0..1. */
export const fuseProgress = (b: Pick<EnemyBombState, 'fuse' | 'fuseTicks'>): number => Math.min(1, b.fuse / b.fuseTicks);
