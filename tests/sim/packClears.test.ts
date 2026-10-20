import { describe, expect, it } from 'vitest';
import { packClear } from './packBot';

// 041.8's ring-matched pack fights as correctness checks: each ring's fight on one seed
// plays out the same twice. The clear-time targets over seeds 1–5 (rings 1 and 2 within
// 15 s, ring 3 in 8–18 s, never KO'd) are measurements, printed by `npm run measure`
// (tests/measure/packs.measure.ts), not tests here.

describe('ring-matched packs (041.8)', () => {
  it.each([1, 2, 3] as const)('ring %i: the fight on seed 1 is deterministic (the same twice)', (ring) => {
    expect(packClear(ring, 1)).toEqual(packClear(ring, 1));
  });
});
