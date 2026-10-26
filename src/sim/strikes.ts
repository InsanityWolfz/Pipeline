import { damagePlayer } from './health';
import type { SimState } from './state';

// Strikes from above (064, the Conductor's storm call; 065's storm sentinel can share it): a circle on the ground that
// lightning strikes once, `delay` ticks after it is called down. Until then it is its own red telegraph. Struck, it
// deals its `damage` to a player whose feet stand in it (a roll's i-frames let it pass) and is gone; it never hurts an
// enemy.

export interface Strike {
  /** The enemy that called it, by id and kind. */
  ownerId: number;
  enemyId: string;
  roomId: string;
  /** Its centre and radius, px. */
  x: number;
  y: number;
  r: number;
  damage: number;
  /** Ticks left until it strikes, and its whole wait (render grows its telegraph by them). */
  delay: number;
  delayTicks: number;
}

/** Calls a strike down at (x, y): it lands after `delay` ticks. */
export function callStrike(state: SimState, owner: { id: number; enemyId: string; roomId: string }, x: number, y: number, r: number, damage: number, delay: number): void {
  state.strikes.push({ ownerId: owner.id, enemyId: owner.enemyId, roomId: owner.roomId, x, y, r, damage, delay, delayTicks: delay });
}

/** Every tick: each strike counts down; landing, it hits a player standing in it, records the strike, and is gone. */
export function stepStrikes(state: SimState): void {
  if (state.strikes.length === 0) return;
  const p = state.player;
  state.strikes = state.strikes.filter((s) => {
    s.delay -= 1;
    if (s.delay > 0) return true;
    state.events.strikes.push({ id: s.ownerId, x: s.x, y: s.y, r: s.r });
    if (s.roomId === state.roomId && Math.hypot(p.x - s.x, p.y - s.y) <= s.r) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      damagePlayer(state, s.damage, d > 0 ? (p.x - s.x) / d : 0, d > 0 ? (p.y - s.y) / d : 0, 0, 0);
    }
    return false;
  });
}

/** A boss's strikes all gone (its fight reset). */
export const clearStrikes = (state: SimState, ownerId: number): void => {
  state.strikes = state.strikes.filter((s) => s.ownerId !== ownerId);
};
