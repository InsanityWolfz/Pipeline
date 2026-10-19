import { enemyDef } from '../data/enemies';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { EnemyMode, EnemyState } from './enemies';
import type { NodeState } from './nodes';
import type { MachineStatus, PieceState } from './pieces';
import type { Facing } from './player';

// Summary entries for the sim's lists, used by summary.ts.

export const round = (n: number): number => Math.round(n * 100) / 100;

export interface ArrowSummary {
  id: number;
  /** The round's ammo id, tags included (`arrow+frost`, 029), or `star-shard`. */
  ammoId: string;
  room: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  travelled: number;
  /** Enemies already hit (a piercing arrow hits each once; a star shard starts with the one its round struck). */
  hitIds: number[];
  /** A homing round's target (029), or null. */
  targetId: number | null;
}

export function arrowSummary(a: ArrowState): ArrowSummary {
  return {
    id: a.id,
    ammoId: a.ammoId,
    room: a.roomId,
    x: round(a.x),
    y: round(a.y),
    dx: round(a.dx),
    dy: round(a.dy),
    travelled: round(a.travelled),
    hitIds: [...a.hitIds],
    targetId: a.targetId,
  };
}

export interface EnemySummary {
  id: number;
  enemyId: string;
  room: string;
  /** Its group (017): `field`, a site id, `pop-…`, or ''. */
  group: string;
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
  /** Chill stacks from cold hits (029), and ticks left frozen. */
  chill: number;
  frozen: number;
}

export function enemySummary(e: EnemyState): EnemySummary {
  return {
    id: e.id,
    enemyId: e.enemyId,
    room: e.roomId,
    group: e.group,
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
    chill: e.chill,
    frozen: e.frozen,
  };
}

export interface NodeSummary {
  id: number;
  nodeId: string;
  room: string;
  x: number;
  y: number;
  uses: number;
  /** Ticks until it's back to full; 0 when not regrowing. */
  regrow: number;
}

export function nodeSummary(n: NodeState): NodeSummary {
  return { id: n.id, nodeId: n.nodeId, room: n.roomId, x: round(n.x), y: round(n.y), uses: n.uses, regrow: n.regrow };
}

export interface BombSummary {
  id: number;
  room: string;
  /** Ground point, px. */
  x: number;
  y: number;
  target: { x: number; y: number };
  /** Height above the ground point, px. */
  height: number;
}

export function bombSummary(b: BombState): BombSummary {
  return {
    id: b.id,
    room: b.roomId,
    x: round(b.x),
    y: round(b.y),
    target: { x: round(b.toX), y: round(b.toY) },
    height: round(b.height),
  };
}

/** A foundry piece: where it is and what it holds, by kind. */
export type PieceSummary = { id: number; pieceId: string; tx: number; ty: number; facing: Facing } & (
  | { kind: 'conduit'; inFrom: Facing; item: string | null; progress: number }
  | {
      kind: 'machine';
      buffer: Record<string, number>;
      output: number;
      /** What its output holds (029: a stage's tagged round). */
      made: string;
      crafting: boolean;
      progress: number;
      status: MachineStatus;
      missing: string[];
    }
  | { kind: 'hopper'; item: string | null; count: number }
  | { kind: 'crate'; contents: Record<string, number> }
  | { kind: 'sorter'; item: string | null; progress: number; filter: string | null; mirrored: boolean }
);

export function pieceSummary(p: PieceState): PieceSummary {
  const common = { id: p.id, pieceId: p.pieceId, tx: p.tx, ty: p.ty, facing: p.facing };
  if (p.kind === 'conduit') return { ...common, kind: p.kind, inFrom: p.inFrom, item: p.item, progress: p.progress };
  if (p.kind === 'hopper') return { ...common, kind: p.kind, item: p.item, count: p.count };
  if (p.kind === 'crate') return { ...common, kind: p.kind, contents: { ...p.contents } };
  if (p.kind === 'sorter') return { ...common, kind: p.kind, item: p.item, progress: p.progress, filter: p.filter, mirrored: p.mirrored };
  const { buffer, output, made, crafting, progress, status, missing } = p;
  return { ...common, kind: p.kind, buffer: { ...buffer }, output, made, crafting, progress, status, missing: [...missing] };
}
