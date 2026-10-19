import { charged } from './chargerAi';
import { defOf } from './champions';
import type { EnemyState } from './enemies';

// Each enemy's kind-specific state for `getState()` (035): a shielded enemy's facing, the
// Charger's lane, whether a Burrower is underground and its locked spot, and the Sniper's
// phase and line. Fields only appear on the kinds that have them.

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** The degrees of a radian angle, in [0, 360) (0 east, 90 south). */
export const degrees = (a: number): number => r2((((a * 180) / Math.PI) % 360 + 360) % 360);

export interface KindSummary {
  /** A shielded enemy's facing (034's rule; the Shardback, 035), degrees. */
  angle?: number;
  /** A Charger's lane while it winds up or charges, else null: its start (its feet then), unit direction, length, width, and how far it has run, px. */
  lane?: { x: number; y: number; dx: number; dy: number; length: number; width: number; run: number } | null;
  /** A Burrower under the ground, and the spot it locked while its ring grows and it erupts (else null), px. */
  underground?: boolean;
  locked?: { x: number; y: number; radius: number } | null;
}

export function kindSummary(e: EnemyState): KindSummary {
  const def = defOf(e);
  const out: KindSummary = {};
  if (def.shield) out.angle = degrees(e.angle);
  if (def.kind === 'charger') {
    const showing = e.mode === 'windup' || e.mode === 'swipe';
    out.lane = showing
      ? { x: r2(e.spotX), y: r2(e.spotY), dx: r2(e.swipeDirX), dy: r2(e.swipeDirY), length: def.charge.distance, width: def.charge.width, run: r2(charged(e, def)) }
      : null;
  }
  if (def.kind === 'burrower') {
    out.underground = e.underground;
    out.locked = e.mode === 'windup' || e.mode === 'swipe' ? { x: r2(e.spotX), y: r2(e.spotY), radius: def.burrow.radius } : null;
  }
  return out;
}
