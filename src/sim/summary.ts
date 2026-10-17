import { SLOT_AMMO, TUBE_CAPACITY } from '../data/tube';
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
    /** The last aim point, world px. */
    aim: { x: number; y: number };
  };
  /** Item id to count. */
  inventory: Record<string, number>;
  tube: {
    ammo: string;
    loaded: number;
    capacity: number;
    loading: boolean;
    /** Ticks into loading the next round. */
    loadProgress: number;
    fireCooldown: number;
    dryFire: boolean;
    firing: boolean;
  };
  /** Arrows in flight; x, y is the ground point. */
  arrows: { id: number; x: number; y: number; dx: number; dy: number; travelled: number }[];
}

const round = (n: number): number => Math.round(n * 100) / 100;

export function summarize(state: SimState): SimSummary {
  const { player: p, tube } = state;
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
      aim: { x: round(p.aimX), y: round(p.aimY) },
    },
    inventory: { ...state.inventory },
    tube: {
      ammo: SLOT_AMMO,
      loaded: tube.loaded,
      capacity: TUBE_CAPACITY,
      loading: tube.loading,
      loadProgress: tube.loadProgress,
      fireCooldown: tube.fireCooldown,
      dryFire: tube.dryFire > 0,
      firing: tube.firing,
    },
    arrows: state.arrows.map((a) => ({
      id: a.id,
      x: round(a.x),
      y: round(a.y),
      dx: round(a.dx),
      dy: round(a.dy),
      travelled: round(a.travelled),
    })),
  };
}
