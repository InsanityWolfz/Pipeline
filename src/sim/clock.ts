import { MAX_TICKS_PER_FRAME, TICK_RATE } from '../data/config';

// Fixed-timestep accumulator. The render loop passes in its frame delta;
// the sim itself never reads real time.

export interface ClockState {
  /** Unspent time, in ticks. */
  pending: number;
}

// Absorbs float error so frames that add up to whole ticks run exactly those ticks.
const EPSILON = 1e-6;

export function createClock(): ClockState {
  return { pending: 0 };
}

/** Adds a frame's elapsed milliseconds and returns how many ticks to run now. */
export function advanceClock(clock: ClockState, deltaMs: number): number {
  clock.pending += (deltaMs * TICK_RATE) / 1000;
  const ticks = Math.floor(clock.pending + EPSILON);
  if (ticks >= MAX_TICKS_PER_FRAME) {
    clock.pending = 0;
    return MAX_TICKS_PER_FRAME;
  }
  clock.pending = Math.max(0, clock.pending - ticks);
  return ticks;
}
