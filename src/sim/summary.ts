import { isInvulnerable, isRolling } from './movement';
import type { Facing } from './player';
import type { SimState } from './state';

/** The compact JSON summary that window.__GAME__.getState() returns. */
export interface SimSummary {
  tick: number;
  seed: number;
  player: {
    /** Feet centre, px. */
    x: number;
    y: number;
    /** Velocity, px per tick. */
    vx: number;
    vy: number;
    facing: Facing;
    rolling: boolean;
    invulnerable: boolean;
    rollCooldown: number;
  };
}

const round = (n: number): number => Math.round(n * 100) / 100;

export function summarize(state: SimState): SimSummary {
  const p = state.player;
  return {
    tick: state.tick,
    seed: state.seed,
    player: {
      x: round(p.x),
      y: round(p.y),
      vx: round(p.vx),
      vy: round(p.vy),
      facing: p.facing,
      rolling: isRolling(p),
      invulnerable: isInvulnerable(p),
      rollCooldown: p.cooldown,
    },
  };
}
