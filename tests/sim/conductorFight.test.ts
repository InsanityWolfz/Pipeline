import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { carefulBot, fight } from './conductorBot';

// 064's Conductor fight as a correctness check: the careful bot's fight runs on one seed and plays out the same twice,
// blinking and taking hits. The target (a decent four-entrance homing-bolt build kills it in about 90–150 s, at most 2
// KOs over 20 seeds) is a measurement, printed by `npm run measure` (tests/measure/conductor.measure.ts), not a test.

/** Ticks the fight runs here: 20 s, past its first blinks and each of its attacks. */
const BOUNDED = 20 * TICK_RATE;

describe('the Conductor fight harness (064)', () => {
  it('runs the careful bot for 20 s on seed 1 without an error, the same twice', () => {
    const a = fight(1, BOUNDED, carefulBot(), 'ley-bolt+homing');
    expect(a).toEqual(fight(1, BOUNDED, carefulBot(), 'ley-bolt+homing'));
    expect(a.blinks).toBeGreaterThan(0);
  });
});
