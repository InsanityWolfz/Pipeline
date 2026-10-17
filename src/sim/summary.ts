import type { SimState } from './state';

/** The compact JSON summary that window.__GAME__.getState() returns. */
export interface SimSummary {
  tick: number;
  seed: number;
}

export function summarize(state: SimState): SimSummary {
  return { tick: state.tick, seed: state.seed };
}
