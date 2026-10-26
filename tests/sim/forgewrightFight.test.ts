import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { decentBot, fight } from './forgewrightBot';

// 060's Forgewright fight as a correctness check: the decent bot's fight runs on one seed and plays out the same
// twice. The target (068: a decent three-entrance build kills it in about 90–120 s, at most 2 KOs over 20 seeds) is a
// measurement, printed by `npm run measure` (tests/measure/forgewright.measure.ts), not a test here.

/** Ticks the fight runs here: 30 s, past its first sprays, slams and vents. */
const BOUNDED = 30 * TICK_RATE;

describe('the Forgewright fight harness (060)', () => {
  it('runs the decent bot for 30 s on seed 1 without an error, the same twice', () => {
    const a = fight(1, BOUNDED, decentBot());
    expect(a).toEqual(fight(1, BOUNDED, decentBot()));
    expect(a.ticks).toBeGreaterThan(0);
  });
});
