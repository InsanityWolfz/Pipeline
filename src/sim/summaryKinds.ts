import { charged } from './chargerAi';
import { snipeLine, snipePhase, type SnipePhase } from './sniperAi';
import type { SimState } from './state';
import { defOf } from './champions';
import type { EnemyState } from './enemies';

// Each enemy's kind-specific state for `getState()` (035): a shielded enemy's facing, the
// Charger's lane, whether a Burrower is underground and its locked spot, and the Sniper's
// phase and line. Fields only appear on the kinds that have them.

/** A number to two decimals, for the summary (shared with summaryParts.ts). */
export const round = (n: number): number => Math.round(n * 100) / 100;

/** The degrees of a radian angle, in [0, 360) (0 east, 90 south). */
export const degrees = (a: number): number => round((((a * 180) / Math.PI) % 360 + 360) % 360);

export interface KindSummary {
  /** A shielded enemy's facing (034's rule; the Shardback, 035), degrees. */
  angle?: number;
  /** A Charger's lane while it winds up or charges, else null: its start (its feet then), unit direction, length, width, and how far it has run, px. */
  lane?: { x: number; y: number; dx: number; dy: number; length: number; width: number; run: number } | null;
  /** A Burrower under the ground, and the spot it locked while its ring grows and it erupts (else null), px. */
  underground?: boolean;
  locked?: { x: number; y: number; radius: number } | null;
  /** A Sniper's phase, and its laser's ground line while it winds up (to the player's feet tracking; to the first solid or its range locked), else null. */
  snipe?: { phase: SnipePhase; line: { x0: number; y0: number; x1: number; y1: number } | null };
}

export function kindSummary(state: SimState, e: EnemyState): KindSummary {
  const def = defOf(e);
  const out: KindSummary = {};
  if (def.shield) out.angle = degrees(e.angle);
  if (def.kind === 'charger') {
    const showing = e.mode === 'windup' || e.mode === 'swipe';
    out.lane = showing
      ? { x: round(e.spotX), y: round(e.spotY), dx: round(e.swipeDirX), dy: round(e.swipeDirY), length: def.charge.distance, width: def.charge.width, run: round(charged(e, def)) }
      : null;
  }
  if (def.kind === 'burrower') {
    out.underground = e.underground;
    out.locked = e.mode === 'windup' || e.mode === 'swipe' ? { x: round(e.spotX), y: round(e.spotY), radius: def.burrow.radius } : null;
  }
  if (def.kind === 'sniper') {
    const line = snipeLine(state, e, def);
    out.snipe = { phase: snipePhase(state, e, def), line: line ? { x0: round(line.x0), y0: round(line.y0), x1: round(line.x1), y1: round(line.y1) } : null };
  }
  return out;
}
