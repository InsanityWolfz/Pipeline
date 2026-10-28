import { ENEMY_MOTION as M } from '../data/art/enemyMotion';
import type { EnemyMode } from '../sim/enemies';

// 076: hit reactions, as pose animation only. A flinch plays while the sim's hit flash runs (its age is how far the
// flash has counted down); a stagger is render's own 300 ms clock, started by a frame's heavy hits or a punch on a
// non-boss. The wind-up always wins: none shows during a wind-up or an attack. Pure.

export type Reaction = 'flinch' | 'stagger';

/** Modes that wind up or attack: no reaction shows over them, and starting one cuts a stagger off. */
const ATTACK_MODES: readonly EnemyMode[] = ['windup', 'swipe', 'lob', 'throw', 'stomp-windup', 'stomp', 'spray-windup', 'spray', 'flood-windup', 'flood'];

export const attacking = (mode: EnemyMode): boolean => ATTACK_MODES.includes(mode);

/** Whether one frame's hits on an enemy stagger it: 40% of its (scaled) max health together, or a punch; never a boss. Burns' beats don't count. */
export function staggers(hits: readonly { damage: number; melee?: boolean; burn?: boolean }[], maxHealth: number, boss: boolean): boolean {
  if (boss) return false;
  const blows = hits.filter((h) => !h.burn);
  return blows.some((h) => h.melee === true) || blows.reduce((n, h) => n + h.damage, 0) >= M.stagger.threshold * maxHealth;
}

/** A hit as the sim reports it (enough of `HitEvent` to weigh it). */
interface TickHit {
  target: string;
  id?: number;
  damage: number;
  melee?: boolean;
  burn?: boolean;
}

/**
 * The enemies one sim tick's hits stagger (review 7: weighed per tick, as the sim deals them, so a slow machine that
 * draws several ticks in a frame staggers no more than a fast one), in the order first hit. `of` gives an enemy's
 * (scaled) max health and whether it's a boss; unknown ids are skipped.
 */
export function staggeredInTick(hits: readonly TickHit[], of: (id: number) => { maxHealth: number; boss: boolean } | undefined): number[] {
  const byId = new Map<number, TickHit[]>();
  for (const h of hits) {
    if (h.target !== 'enemy' || h.id === undefined) continue;
    const list = byId.get(h.id) ?? [];
    list.push(h);
    byId.set(h.id, list);
  }
  const out: number[] = [];
  for (const [id, list] of byId) {
    const e = of(id);
    if (e && staggers(list, e.maxHealth, e.boss)) out.push(id);
  }
  return out;
}

export interface ReactionIn {
  /** It is winding up or attacking. */
  attacking: boolean;
  /** Its pose takes a reaction over it (idle, walking, recovering); a sim stagger state keeps its own. */
  reactable: boolean;
  boss: boolean;
  /** The sim's hit flash ticks left. */
  flash: number;
  /** Ms since its stagger started, or null. */
  staggerMs: number | null;
}

/** The reaction it shows now, or null. */
export function reactionOf(r: ReactionIn): Reaction | null {
  if (r.attacking || !r.reactable) return null;
  if (!r.boss && r.staggerMs !== null && r.staggerMs < M.stagger.ms) return 'stagger';
  return r.flash > 0 ? 'flinch' : null;
}

/** The stagger's frame: reel, then recover. */
export const staggerIndex = (ms: number): 0 | 1 => (ms < M.stagger.reelMs ? 0 : 1);

/** The stagger's squash, easing out over its 300 ms. */
export function staggerSquash(ms: number): number {
  const k = Math.max(0, 1 - ms / M.stagger.ms);
  return M.stagger.squash * k * k;
}

/** The flinch's squash `age` ticks into the flash: the snap, ringing down through a small overshoot. */
export function flinchSquash(age: number): number {
  const t = age / M.flinch.ringTicks;
  return M.flinch.squash * Math.cos(t * (Math.PI / 2)) * Math.exp(-t * 0.9);
}
