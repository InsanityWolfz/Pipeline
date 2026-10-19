import { roundKeywords } from '../data/roundKeywords';
import { defOf } from './champions';
import type { ArrowState } from './arrows';
import type { BombState } from './bombs';
import type { EnemyMode, EnemyState } from './enemies';
import type { NodeState } from './nodes';
import type { MachineStatus, PieceState } from './pieces';
import type { Facing } from './player';
import { kindSummary, round, type KindSummary } from './summaryKinds';
import type { SimState } from './state';

// Summary entries for the sim's lists, used by summary.ts.

export { round };

export interface ArrowSummary {
  id: number;
  /** The round's ammo id, tags included (`arrow+frost`, 029), or `shard`. */
  ammoId: string;
  room: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  travelled: number;
  /** Enemies already hit (a piercing arrow hits each once; a Shard starts with the one its round struck). */
  hitIds: number[];
  /** A homing round's target (029), or null. */
  targetId: number | null;
  /** Its keywords (039): a round's, or a Shard's from its round. */
  keywords: string[];
  /** It carries a Pool it passed through (037: Blastfletch) to its next hit. */
  pooled: boolean;
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
    keywords: [...a.keywords],
    pooled: a.pooled,
  };
}

/** 035: plus its kind's own state (a shield's angle, a Charger's lane, …), on the kinds that have it. */
export interface EnemySummary extends KindSummary {
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
  /** Ticks left Stunned (039: by Rollbreaker or a Charger's wall). */
  stunned: number;
  /** Its weight against Knockback (039: a boss 0). */
  weight: number;
  /** A champion's name (032), or null. */
  champion: { name: string } | null;
  /** Its danger ring (041): its home tile's; its health and damage are scaled by it. */
  ring: number;
}

export function enemySummary(state: SimState, e: EnemyState): EnemySummary {
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
    maxHealth: defOf(e).maxHealth,
    champion: e.champion ? { ...e.champion } : null,
    ring: e.ring,
    swipeDir: { x: round(e.swipeDirX), y: round(e.swipeDirY) },
    flash: e.flash,
    chill: e.chill,
    frozen: e.frozen,
    stunned: e.stunned,
    weight: defOf(e).weight,
    ...kindSummary(state, e),
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
  /** The round's keywords (039). */
  keywords: string[];
}

export function bombSummary(b: BombState): BombSummary {
  return {
    id: b.id,
    room: b.roomId,
    x: round(b.x),
    y: round(b.y),
    target: { x: round(b.toX), y: round(b.toY) },
    height: round(b.height),
    keywords: roundKeywords(b.ammoId),
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
  /** 033: `next` is the output a splitter tries first; `turn` the input a merger takes from next (0 back, 1 left, 2 right). */
  | { kind: 'splitter'; item: string | null; progress: number; mirrored: boolean; next: 'front' | 'side' }
  | { kind: 'merger'; item: string | null; progress: number; turn: number }
);

export function pieceSummary(p: PieceState): PieceSummary {
  const common = { id: p.id, pieceId: p.pieceId, tx: p.tx, ty: p.ty, facing: p.facing };
  if (p.kind === 'conduit') return { ...common, kind: p.kind, inFrom: p.inFrom, item: p.item, progress: p.progress };
  if (p.kind === 'hopper') return { ...common, kind: p.kind, item: p.item, count: p.count };
  if (p.kind === 'crate') return { ...common, kind: p.kind, contents: { ...p.contents } };
  if (p.kind === 'sorter') return { ...common, kind: p.kind, item: p.item, progress: p.progress, filter: p.filter, mirrored: p.mirrored };
  if (p.kind === 'splitter') return { ...common, kind: p.kind, item: p.item, progress: p.progress, mirrored: p.mirrored, next: p.next };
  if (p.kind === 'merger') return { ...common, kind: p.kind, item: p.item, progress: p.progress, turn: p.turn };
  const { buffer, output, made, crafting, progress, status, missing } = p;
  return { ...common, kind: p.kind, buffer: { ...buffer }, output, made, crafting, progress, status, missing: [...missing] };
}
