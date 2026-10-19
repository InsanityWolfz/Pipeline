import type { SimState } from './state';
import { xpToNext } from './leveling';
import { overpressureBonus } from './keystones';
import { round } from './summaryParts';

// Leveling's part of `getState()` (037): the level, XP toward the next, unspent points
// and the taken talents.

export interface LevelingSummary {
  /** The level (from 1), XP toward the next, and the XP the next needs (0 at the cap: the bar shows full). */
  level: number;
  xp: number;
  xpToNext: number;
  /** Unspent talent points. */
  talentPoints: number;
  /** The taken talents' ids, the centre start first. */
  talents: string[];
  /** Overpressure's ramp: ticks of held fire counted (0 without the keystone) and the fire-rate bonus now. */
  overpressure: { ticks: number; bonus: number };
  /** Blastfletch's charged ground: each area's id, centre, radius (px) and ticks left. */
  blastCharges: { id: number; x: number; y: number; radius: number; ticks: number }[];
}

export function levelingSummary(state: SimState): LevelingSummary {
  return {
    level: state.level,
    xp: state.xp,
    xpToNext: xpToNext(state),
    talentPoints: state.talentPoints,
    talents: [...state.talents],
    overpressure: { ticks: state.tube.overpressure, bonus: round(overpressureBonus(state)) },
    blastCharges: state.blastCharges.filter((c) => c.roomId === state.roomId).map(({ id, x, y, radius, ticks }) => ({ id, x: round(x), y: round(y), radius, ticks })),
  };
}
