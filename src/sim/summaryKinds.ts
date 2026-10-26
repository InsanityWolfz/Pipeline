import { snipeLine, snipePhase, type SnipePhase } from './sniperAi';
import { swellShown } from './moteAi';
import { laneRunDone, type LaneDef } from './laneRun';
import { slamShown } from './golemAi';
import { beamShown } from './tenderAi';
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
  /** 061: a cinder mote's swell while it grows (its burst's radius, px, and ticks swelling so far), else null. */
  swell?: { radius: number; ticks: number } | null;
  /** 061: a slag golem's slam circle while it winds up (its locked centre and radius, px), else null. */
  slam?: { x: number; y: number; radius: number } | null;
  /** 061: a kiln-tender's beam while it winds up or channels (its target's id), else null. */
  beam?: { target: number; phase: 'windup' | 'channel' } | null;
}

export function kindSummary(state: SimState, e: EnemyState): KindSummary {
  const def = defOf(e);
  const out: KindSummary = {};
  if (def.shield) out.angle = degrees(e.angle);
  if (def.kind === 'charger') out.lane = laneShown(e, def.charge);
  if (def.kind === 'burrower') {
    out.underground = e.underground;
    out.locked = e.mode === 'windup' || e.mode === 'swipe' ? { x: round(e.spotX), y: round(e.spotY), radius: def.burrow.radius } : null;
  }
  if (def.kind === 'sniper') {
    const line = snipeLine(state, e, def);
    out.snipe = { phase: snipePhase(state, e, def), line: line ? { x0: round(line.x0), y0: round(line.y0), x1: round(line.x1), y1: round(line.y1) } : null };
  }
  if (def.kind === 'mote') out.swell = swellShown(e, def);
  if (def.kind === 'golem') out.slam = slamShown(e, def);
  if (def.kind === 'tender') out.beam = beamShown(e);
  // 061: a hound's lane, as the Charger's.
  if (def.kind === 'hound') out.lane = laneShown(e, def.dash);
  return out;
}

/** A lane runner's lane while it winds up or runs (the Charger's, the hound's), else null. */
function laneShown(e: EnemyState, lane: Pick<LaneDef, 'distance' | 'width' | 'speed'>): NonNullable<KindSummary['lane']> | null {
  if (e.mode !== 'windup' && e.mode !== 'swipe') return null;
  return { x: round(e.spotX), y: round(e.spotY), dx: round(e.swipeDirX), dy: round(e.swipeDirY), length: lane.distance, width: lane.width, run: round(laneRunDone(e, lane)) };
}
