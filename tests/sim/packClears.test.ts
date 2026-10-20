import { describe, expect, it } from 'vitest';
import { PACK_LIMIT, packClear } from './packBot';

// 041.8's ring-matched pack fights as correctness checks: each ring's fight runs to its end
// on one seed and plays out the same twice. The clear-time targets over seeds 1–5 (rings 1
// and 2 within 15 s, ring 3 in 8–18 s, never KO'd) are measurements, printed by
// `npm run measure` (tests/measure/packs.measure.ts), not tests here.

describe('ring-matched packs (041.8)', () => {
  it.each([1, 2, 3] as const)('ring %i: the fight on seed 1 runs to its end and plays out the same twice', (ring) => {
    const first = packClear(ring, 1);
    expect(first.ticks).toBeLessThanOrEqual(PACK_LIMIT);
    expect(packClear(ring, 1)).toEqual(first);
  });
});
