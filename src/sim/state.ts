import { createRng, type RngState } from './rng';

/** The whole sim: plain serializable data. */
export interface SimState {
  tick: number;
  seed: number;
  rng: RngState;
}

export function createSim(seed: number): SimState {
  return { tick: 0, seed, rng: createRng(seed) };
}
