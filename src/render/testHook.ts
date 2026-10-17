import { NO_COMMAND, type Command } from '../sim/input';
import type { SimState } from '../sim/state';
import { stepSim } from '../sim/step';
import { summarize, type SimSummary } from '../sim/summary';
import type { GameScene } from './GameScene';
import type { ViewMode } from './view';

export interface GameState extends SimSummary {
  view: ViewMode;
}

export interface GameTestHook {
  getState(): GameState;
  /** Steps `frames` ticks holding `command`. Its dodge press applies on the first tick only. */
  step(frames: number, command?: Partial<Command>): GameState;
  setView(view: ViewMode): GameState;
}

declare global {
  interface Window {
    __GAME__?: GameTestHook;
  }
}

// Dev builds only: lets tests and agents read state and step the sim frame by frame.
// The first step() takes the sim off the real-time loop so tests own the clock.
export function installTestHook(sim: SimState, scene: GameScene): void {
  const state = (): GameState => ({ ...summarize(sim), view: scene.view });
  window.__GAME__ = {
    getState: state,
    step: (frames, command = {}) => {
      if (!Number.isInteger(frames) || frames < 0) throw new Error(`step() needs a whole number of frames, got ${frames}`);
      scene.manualStepping = true;
      const held: Command = { ...NO_COMMAND, ...command };
      for (let i = 0; i < frames; i++) stepSim(sim, i === 0 ? held : { ...held, dodge: false });
      return state();
    },
    setView: (view) => {
      scene.setView(view);
      return state();
    },
  };
}
