import { enemyDef } from '../data/enemies';
import { MAX_HEALTH } from '../data/player';
import { SLOT_AMMO, TUBE_CAPACITY } from '../data/tube';
import type { EnemyMode } from './enemies';
import type { SimEvents } from './events';
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
    health: number;
    maxHealth: number;
    /** Hit invulnerability after taking a hit (roll i-frames are `invulnerable`). */
    hitInvulnerable: boolean;
    /** KO'd this tick; the room has already reset. */
    ko: boolean;
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
  enemies: {
    id: number;
    enemyId: string;
    /** Feet centre, px. */
    x: number;
    y: number;
    home: { x: number; y: number };
    facing: Facing;
    mode: EnemyMode;
    modeTicks: number;
    health: number;
    maxHealth: number;
    /** Locked swipe direction. */
    swipeDir: { x: number; y: number };
    flash: number;
  }[];
  groundItems: { id: number; itemId: string; x: number; y: number }[];
  /** What happened on the last tick. */
  events: SimEvents;
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
      health: p.health,
      maxHealth: MAX_HEALTH,
      hitInvulnerable: p.hurtTicks > 0,
      ko: state.events.ko,
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
    enemies: state.enemies.map((e) => ({
      id: e.id,
      enemyId: e.enemyId,
      x: round(e.x),
      y: round(e.y),
      home: { x: round(e.homeX), y: round(e.homeY) },
      facing: e.facing,
      mode: e.mode,
      modeTicks: e.modeTicks,
      health: e.health,
      maxHealth: enemyDef(e.enemyId).maxHealth,
      swipeDir: { x: round(e.swipeDirX), y: round(e.swipeDirY) },
      flash: e.flash,
    })),
    groundItems: state.groundItems.map((g) => ({ id: g.id, itemId: g.itemId, x: round(g.x), y: round(g.y) })),
    events: structuredClone(state.events),
  };
}
