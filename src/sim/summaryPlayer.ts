import type { HealSource } from '../data/player';
import { OVERWORLD } from '../data/overworld';
import { TILE_SIZE } from '../data/config';
import { springAt } from './healing';
import { isInvulnerable, isRolling } from './movement';
import type { Facing } from './player';
import type { SimState } from './state';
import { playerStats } from './stats';
import { round } from './summaryParts';

// The player's part of `getState()` (split out of summary.ts): where they are and how they move, their health and
// hit state, and the Ley Springs (030) with whether their feet are in one.

export interface PlayerSummary {
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
    /** The last aim point, world px. */
    aim: { x: number; y: number };
    health: number;
    maxHealth: number;
    /** Hit invulnerability after taking a hit (roll i-frames are `invulnerable`). */
    hitInvulnerable: boolean;
    /** KO'd this tick; the room has already reset. */
    ko: boolean;
    /** Ticks left on the death animation; 0 when alive. */
    dying: number;
    /** What raised health this tick (030), or null: 031's HP bar glows cyan while it's set. */
    healing: HealSource | null;
    /** 065: slowed (a gale ram's gust): the share of walk and roll speed taken and ticks left, else null. */
    slow: { share: number; ticks: number } | null;
  };
  /** The Ley Springs (030): each one's centre tile, pool radius px, and whether the player's feet are in it. */
  springs: { id: string; tx: number; ty: number; radius: number; inside: boolean }[];
}

export function playerSummary(state: SimState): PlayerSummary {
  const { player: p } = state;
  return {
    player: {
      x: round(p.x),
      y: round(p.y),
      vx: round(p.vx),
      vy: round(p.vy),
      facing: p.facing,
      rolling: isRolling(p),
      invulnerable: isInvulnerable(p),
      rollCooldown: p.cooldown,
      aim: { x: round(p.aimX), y: round(p.aimY) },
      health: p.health,
      maxHealth: playerStats(state).maxHealth,
      hitInvulnerable: p.hurtTicks > 0,
      ko: state.events.ko,
      dying: p.dying,
      healing: p.healing,
      slow: p.slowTicks > 0 ? { share: p.slow, ticks: p.slowTicks } : null,
    },
    springs: OVERWORLD.springs.map((sp) => ({ id: sp.id, tx: sp.tx, ty: sp.ty, radius: sp.radius * TILE_SIZE, inside: springAt(state.roomId, p.x, p.y)?.id === sp.id })),
  };
}
