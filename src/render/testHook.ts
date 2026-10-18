import { NO_COMMAND, type Command } from '../sim/input';
import type { SimState } from '../sim/state';
import { summarize, type SimSummary } from '../sim/summary';
import type { GameScene } from './GameScene';

export interface GameTestHook {
  getState(): SimSummary;
  /**
   * Steps `frames` ticks holding `command`. Its dodge, load, interact, ammo
   * select, build toggle, place, pick-up, deposit and withdraw apply on the first tick only. Without an aim it keeps the player's last aim, as a still mouse would.
   */
  step(frames: number, command?: Partial<Command>): SimSummary;
  /** Crafts a recipe once between ticks, as clicking its menu row does. */
  craft(recipeId: string): SimSummary;
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
      const held: Command = { ...NO_COMMAND, aimX: sim.player.aimX, aimY: sim.player.aimY, ...command };
      const after: Command = {
        ...held,
        dodge: false,
        load: false,
        interact: false,
        selectAmmo: null,
        toggleBuild: false,
        place: null,
        pickUp: null,
        deposit: null,
        withdraw: null,
      };
      for (let i = 0; i < frames; i++) {
        // Building with the mouse and keys works under the hook: the scene's queued actions join each tick.
        const base = i === 0 ? held : after;
        const ui = scene.takeUiCommand();
        scene.stepOnce({
          ...base,
          toggleBuild: base.toggleBuild || ui.toggleBuild,
          place: base.place ?? ui.place,
          pickUp: base.pickUp ?? ui.pickUp,
          deposit: base.deposit ?? ui.deposit,
          withdraw: base.withdraw ?? ui.withdraw,
        });
      }
      return summarize(sim);
    },
    craft: (recipeId) => {
      scene.craft(recipeId);
      return summarize(sim);
    },
  };
}
