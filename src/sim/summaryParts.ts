import { enemyDef } from '../data/enemies';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { EnemyMode, EnemyState } from './enemies';
import type { NodeState } from './nodes';
import type { Facing } from './player';

// Summary entries for the sim's lists, used by summary.ts.

export const round = (n: number): number => Math.round(n * 100) / 100;

export interface ArrowSummary {
  id: number;
  /** `arrow` or `ley-bolt`. */
  ammoId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  travelled: number;
  /** Enemies already hit (a piercing bolt hits each once). */
  hitIds: number[];
}

export function arrowSummary(a: ArrowState): ArrowSummary {
  return {
    id: a.id,
    ammoId: a.ammoId,
    x: round(a.x),
    y: round(a.y),
    dx: round(a.dx),
    dy: round(a.dy),
    travelled: round(a.travelled),
    hitIds: [...a.hitIds],
  };
}

export interface EnemySummary {
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
  /** Ticks of burn left. */
  burnTicks: number;
}

export function enemySummary(e: EnemyState): EnemySummary {
  return {
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
    burnTicks: e.burnTicks,
  };
}

export interface NodeSummary {
  id: number;
  nodeId: string;
  x: number;
  y: number;
  uses: number;
  /** Ticks until it's back to full; 0 when not regrowing. */
  regrow: number;
}

export function nodeSummary(n: NodeState): NodeSummary {
  return { id: n.id, nodeId: n.nodeId, x: round(n.x), y: round(n.y), uses: n.uses, regrow: n.regrow };
}

export interface BombSummary {
  id: number;
  /** Ground point, px. */
  x: number;
  y: number;
  target: { x: number; y: number };
  /** Height above the ground point, px. */
  height: number;
}

export function bombSummary(b: BombState): BombSummary {
  return { id: b.id, x: round(b.x), y: round(b.y), target: { x: round(b.toX), y: round(b.toY) }, height: round(b.height) };
}
