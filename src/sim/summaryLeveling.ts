import type { SimState } from './state';
import { xpToNext } from './leveling';

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
}

export function levelingSummary(state: SimState): LevelingSummary {
  return { level: state.level, xp: state.xp, xpToNext: xpToNext(state), talentPoints: state.talentPoints, talents: [...state.talents] };
}
