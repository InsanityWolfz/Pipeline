import { CACHE_BURST } from '../data/landmarks';
import type { GroundItem } from '../sim/drops';

// A cache's item bursting out (045), pure so tests can drive it: from the sim's tick-counted wait, where the item is in
// its burst. Render draws it from this.

/** Where a cache item is in its burst (045): hidden in the chest, flying (t 0..1), or landed and waiting; null once the pull may take it. */
export function burstPhase(g: Pick<GroundItem, 'burst' | 'wait'>): { phase: 'chest' } | { phase: 'flight'; t: number } | { phase: 'landed' } | null {
  const B = CACHE_BURST;
  if (!g.burst || !g.wait) return null;
  const elapsed = g.burst.delay + B.flightTicks + B.holdTicks - g.wait;
  if (elapsed < g.burst.delay) return { phase: 'chest' };
  const t = (elapsed - g.burst.delay) / B.flightTicks;
  return t < 1 ? { phase: 'flight', t } : { phase: 'landed' };
}
