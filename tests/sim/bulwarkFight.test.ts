import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { decentBot, fight, naiveBot } from './bulwarkBot';

// 041's Bulwark fights as correctness checks: each bot's fight runs on one seed and plays out
// the same twice. 041.7's balance targets (the decent build's 60–90 s, at least 40% damage
// taken and no KO over seeds 1–20; the naive bot KO'd first) are measurements, printed by
// `npm run measure` (tests/measure/bulwark.measure.ts), not tests here.

/** Ticks each fight runs here: 30 s, past the first adds, back waves and stomps. */
const BOUNDED = 30 * TICK_RATE;

describe('the Bulwark fight harness (041.7)', () => {
  it('runs the decent bot for 30 s on seed 1 without an error, the same twice', () => {
    expect(fight(1, BOUNDED, decentBot())).toEqual(fight(1, BOUNDED, decentBot()));
  });

  it('runs the naive bot on seed 1 without an error, the same twice', () => {
    expect(fight(1, BOUNDED, naiveBot)).toEqual(fight(1, BOUNDED, naiveBot));
  });
});
