import type { SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { summarize, type SimSummary } from '../sim/summary';
import type { GameScene } from './GameScene';

export interface GameTestHook {
  getState(): SimSummary;
  step(frames: number): SimSummary;
}

declare global {
  interface Window {
    __GAME__?: GameTestHook;
  }
}

// Dev builds only: lets tests and agents read state and step the sim frame by frame.
// The first step() takes the sim off the real-time loop so tests own the clock.
export function installTestHook(sim: SimState, scene: GameScene): void {
  window.__GAME__ = {
    getState: () => summarize(sim),
    step: (frames) => {
      scene.manualStepping = true;
      for (let i = 0; i < frames; i++) stepSim(sim);
      return summarize(sim);
    },
  };
}
