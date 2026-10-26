import { describe, expect, it } from 'vitest';
import { MAX_TICKS_PER_FRAME, TICK_RATE } from '../../src/data/config';
import { advanceClock, createClock } from '../../src/sim/clock';

// The fixed-timestep clock (moved out of sim.test.ts to keep it under 300 lines).

function ticksFor(deltas: number[]): number {
  const clock = createClock();
  return deltas.reduce((total, delta) => total + advanceClock(clock, delta), 0);
}

describe('fixed-timestep clock', () => {
  it('runs the same number of ticks however one second is split into frames', () => {
    const second = 1000;
    expect(ticksFor(Array(60).fill(second / 60))).toBe(TICK_RATE);
    expect(ticksFor(Array(20).fill(second / 20))).toBe(TICK_RATE);
    expect(ticksFor(Array(7).fill(second / 7))).toBe(TICK_RATE);
  });

  it('carries leftover time into the next frame', () => {
    const clock = createClock();
    const half = 1000 / TICK_RATE / 2;
    expect(advanceClock(clock, half)).toBe(0);
    expect(advanceClock(clock, half)).toBe(1);
  });

  it('caps the ticks run in one frame', () => {
    expect(advanceClock(createClock(), 60_000)).toBe(MAX_TICKS_PER_FRAME);
  });
});
