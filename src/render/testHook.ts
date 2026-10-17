import { NO_COMMAND, type Command } from '../sim/input';
import type { SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { summarize, type SimSummary } from '../sim/summary';
import type { GameScene } from './GameScene';

export interface GameTestHook {
  getState(): SimSummary;
  /** Steps `frames` ticks holding `command`. Its dodge press applies on the first tick only. */
  step(frames: number, command?: Partial<Command>): SimSummary;
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
    step: (frames, command = {}) => {
      if (!Number.isInteger(frames) || frames < 0) throw new Error(`step() needs a whole number of frames, got ${frames}`);
      scene.manualStepping = true;
      const held: Command = { ...NO_COMMAND, ...command };
      for (let i = 0; i < frames; i++) stepSim(sim, i === 0 ? held : { ...held, dodge: false });
      return summarize(sim);
    },
  };
}
