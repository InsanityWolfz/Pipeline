import { MAX_HEALTH } from '../data/player';
import { RESERVOIR_CAP } from '../data/tube';
import { ROOMS } from '../data/rooms';
import type { SimEvents } from './events';
import { unlockedPieces } from './placement';
import { isInvulnerable, isRolling } from './movement';
import type { Facing } from './player';
import type { SimState } from './state';
import {
  arrowSummary,
  bombSummary,
  enemySummary,
  nodeSummary,
  pieceSummary,
  round,
  type ArrowSummary,
  type BombSummary,
  type EnemySummary,
  type NodeSummary,
  type PieceSummary,
} from './summaryParts';

/** The compact JSON summary that window.__GAME__.getState() returns. */
export interface SimSummary {
  tick: number;
  seed: number;
  /** The room the player is in. */
  room: string;
  /** Every room id. */
  rooms: string[];
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
    fireCooldown: number;
    dryFire: boolean;
    firing: boolean;
    /** This tick's shot came from the reservoir. */
    fromReservoir: boolean;
  };
  /** The tube's link to the foundry. */
  link: {
    attuned: boolean;
    /** Ticks left on the attuning pulse. */
    attunePulse: number;
    reservoir: { ammo: string | null; count: number; cap: number };
  };
  /** Arrows and ley bolts in flight; x, y is the ground point. */
  arrows: ArrowSummary[];
  enemies: EnemySummary[];
  groundItems: { id: number; itemId: string; room: string; x: number; y: number }[];
  nodes: NodeSummary[];
  /** The harvest in progress: the node's id and ticks into it. */
  harvest: { nodeId: number; progress: number } | null;
  bombs: BombSummary[];
  /** Item ids hand-crafted at least once. */
  crafted: string[];
  /** Pieces the player can place, in build bar order. */
  unlocked: string[];
  building: boolean;
  foundry: { pieces: PieceSummary[] };
  /** What happened on the last tick. */
  events: SimEvents;
}

export function summarize(state: SimState): SimSummary {
  const { player: p, tube } = state;
  return {
    tick: state.tick,
    seed: state.seed,
    room: state.roomId,
    rooms: Object.keys(ROOMS),
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
      ammo: tube.ammoId,
      fireCooldown: tube.fireCooldown,
      dryFire: tube.dryFire > 0,
      firing: tube.firing,
      fromReservoir: tube.fromReservoir,
    },
    link: {
      attuned: state.link.attuned,
      attunePulse: state.link.attunePulse,
      reservoir: { ammo: state.link.reservoir.ammoId, count: state.link.reservoir.count, cap: RESERVOIR_CAP },
    },
    arrows: state.arrows.map(arrowSummary),
    enemies: state.enemies.map(enemySummary),
    groundItems: state.groundItems.map((g) => ({ id: g.id, itemId: g.itemId, room: g.roomId, x: round(g.x), y: round(g.y) })),
    nodes: state.nodes.map(nodeSummary),
    harvest: state.harvest ? { ...state.harvest } : null,
    bombs: state.bombs.map(bombSummary),
    crafted: [...state.crafted],
    unlocked: unlockedPieces(state),
    building: state.building,
    foundry: { pieces: state.foundry.pieces.map(pieceSummary) },
    events: structuredClone(state.events),
  };
}
