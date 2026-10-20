import { describe, expect, it } from 'vitest';
import { decentBot, fight, naiveBot, TARGET } from './bulwarkBot';

// 041's Bulwark fights as correctness checks: the decent bot's fight runs and plays out the
// same twice, and the naive bot is KO'd. 041.7's balance targets for the decent build
// (60–90 s, at least 40% damage taken, no KO, over seeds 1–20) are measurements, printed by
// `npm run measure` (tests/measure/bulwark.measure.ts), not tests here.

const SEEDS = [1, 2, 3, 4, 5] as const;
/** Ticks the decent bot's fight runs here: 30 s, past the first adds, back waves and stomps. */
const BOUNDED = 30 * 60;

describe('the Bulwark with a decent build (041.7)', () => {
  it('fights for 30 s on seed 1 without an error, and plays out the same on the same seed', () => {
    const first = fight(1, BOUNDED, decentBot());
    expect(first.ticks).toBeGreaterThan(0);
    expect(fight(1, BOUNDED, decentBot())).toEqual(first);
  });
});

describe('a naive bot (041.7)', () => {
  // Five fights KO'd at about 900 ticks each: well under a second, and the same on every seed.
  it('walking at its front, holding fire and never rolling, is KO’d before it falls on every seed', () => {
    const runs = SEEDS.map((seed) => fight(seed, TARGET.max * 2, naiveBot));
    for (const [i, r] of runs.entries()) expect(r, `seed ${SEEDS[i]}`).toMatchObject({ won: false, ko: true });
  }, 20_000);
});
