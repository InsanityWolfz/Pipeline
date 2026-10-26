import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { CAREFUL } from './bots';
import { carefulBot, fight, rodBreakerBot } from './conductorBot';
import { CONDUCTOR, spire } from './spire';

// 064's Conductor fight as a correctness check: the careful bot's fight runs on one seed and plays out the same twice,
// blinking and taking hits. The target (068: a decent four-entrance homing-bolt build kills it in about 120–180 s, at
// most 2 KOs over 20 seeds) is a measurement, printed by `npm run measure` (tests/measure/conductor.measure.ts), not a test.

/** Ticks the fight runs here: 20 s, past its first blinks and each of its attacks. */
const BOUNDED = 20 * TICK_RATE;

describe('the Conductor fight harness (064)', () => {
  it('runs the careful bot for 20 s on seed 1 without an error, the same twice', () => {
    const a = fight(1, BOUNDED, carefulBot(), 'ley-bolt+homing');
    expect(a).toEqual(fight(1, BOUNDED, carefulBot(), 'ley-bolt+homing'));
    expect(a.blinks).toBeGreaterThan(0);
  });

  it('068: the rod breaker drops his storm shield within 20 s on seed 1, the same twice', () => {
    const a = fight(1, BOUNDED, rodBreakerBot(), 'ley-bolt+homing');
    expect(a).toEqual(fight(1, BOUNDED, rodBreakerBot(), 'ley-bolt+homing'));
    expect(a.shieldDown).toBeGreaterThan(0);
  });

  it('reads a blink as a player does: it aims at the old spot until its reaction delay has passed (041)', () => {
    const { s, c } = spire();
    const bot = carefulBot();
    const aim = () => {
      const cmd = bot(s, c);
      return typeof cmd === 'object' ? { x: cmd.aimX, y: cmd.aimY } : null;
    };
    const old = { x: c.x, y: c.y + CONDUCTOR.hurtbox.offsetY };
    expect(aim()).toEqual(old);
    // It appears at another rod's stand point.
    c.x += 120;
    for (let t = 1; t < CAREFUL.react; t++) expect(aim(), `tick ${t}`).toEqual(old);
    expect(aim()).toEqual({ x: c.x, y: c.y + CONDUCTOR.hurtbox.offsetY });
  });
});
