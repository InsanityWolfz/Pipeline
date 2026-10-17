import { describe, expect, it } from 'vitest';
import { advanceClock, createClock } from '../../src/sim/clock';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { MAX_TICKS_PER_FRAME, TICK_RATE } from '../../src/data/config';

function stepped(seed: number, ticks: number) {
  const sim = createSim(seed);
  for (let i = 0; i < ticks; i++) stepSim(sim);
  return sim;
}

function ticksFor(deltas: number[]): number {
  const clock = createClock();
  return deltas.reduce((total, delta) => total + advanceClock(clock, delta), 0);
}

describe('sim state', () => {
  it('starts at tick 0 with the given seed', () => {
    const sim = createSim(5);
    expect(sim.tick).toBe(0);
    expect(sim.seed).toBe(5);
  });

  it('advances one tick per step', () => {
    expect(stepped(5, 37).tick).toBe(37);
  });

  it('is identical for the same seed and steps', () => {
    expect(stepped(11, 200)).toEqual(stepped(11, 200));
  });

  it('round-trips through JSON unchanged', () => {
    const sim = stepped(3, 10);
    expect(JSON.parse(JSON.stringify(sim))).toEqual(sim);
  });

  it('summarizes as tick and seed', () => {
    expect(summarize(stepped(8, 4))).toEqual({ tick: 4, seed: 8 });
  });
});

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
