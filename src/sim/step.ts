import type { SimState } from './state';

/** Advances the sim by exactly one fixed tick. Game systems run from here. */
export function stepSim(state: SimState): void {
  state.tick += 1;
}
