import { NO_COMMAND, type Command } from '../sim/input';
import type { SimState } from '../sim/state';
import { summarize, type SimSummary } from '../sim/summary';
import { TILE_SIZE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { isSolid, overlapsRect } from '../sim/collision';
import { roomBodies } from '../sim/bodies';
import type { GameScene } from './GameScene';

export interface GameTestHook {
  getState(): SimSummary;
  /**
   * Steps `frames` ticks holding `command`. Its dodge, interact, ammo
   * select, build toggle, place, pick-up, deposit, withdraw, setFilter, setAngle, pylon, takeStash, identify and equip apply on the first tick only. Without an aim it keeps the player's last aim, as a still mouse would.
   */
  step(frames: number, command?: Partial<Command>): SimSummary;
  /** Crafts a recipe once between ticks, as clicking its menu row does. */
  craft(recipeId: string): SimSummary;
  ui(): UiState;
  /** The sound settings (020: set from the pause menu). */
  sound(): { muted: boolean; volume: number };
  /** The player's room as rows of tiles a player can stand on ('.') or not ('#'), solid things included: for test helpers that find paths. */
  passable(): string[];
}

/**
 * What the render shows, for tests: the world name under the cursor and its description (018), the build bar
 * tip's piece; the minimap (017) with its markers in view px; each node's frame by node id; and the claimed
 * pylon's supply motes (018), how many have started and those on their way.
 */
export interface UiState {
  /** The scene has built its views and the fonts are loaded (020): before this, nothing is drawn. */
  ready: boolean;
  /** The craft menu is open (it doesn't pause, 020), and the pause menu is (Esc: the world stops). */
  craftOpen: boolean;
  paused: boolean;
  /** The hopper picker is open. */
  pickerOpen: boolean;
  hoverName: string | null;
  hoverDescription: string | null;
  buildTip: string | null;
  minimap: { shown: boolean; markers: { kind: string; x: number; y: number }[] };
  nodes: Record<number, string>;
  supply: { started: number; inFlight: { itemId: string; progress: number }[] };
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
        interact: false,
        selectAmmo: null,
        toggleBuild: false,
        place: null,
        pickUp: null,
        deposit: null,
        withdraw: null,
        setFilter: null,
        setAngle: null,
        pylon: null,
        takeStash: null,
        identify: false,
        equip: null,
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
          setFilter: base.setFilter ?? ui.setFilter,
          setAngle: base.setAngle ?? ui.setAngle,
          pylon: base.pylon ?? ui.pylon,
          takeStash: base.takeStash ?? ui.takeStash,
          identify: base.identify || ui.identify,
          equip: base.equip ?? ui.equip,
        });
      }
      return summarize(sim);
    },
    craft: (recipeId) => {
      scene.craft(recipeId);
      return summarize(sim);
    },
    ui: () => scene.hoverText(),
    sound: () => scene.soundSettings(),
    passable: () => {
      const { room, obstacles } = roomBodies(sim, sim.roomId);
      return room.rows.map((row, ty) =>
        [...row]
          .map((_, tx) => {
            const cx = (tx + 0.5) * TILE_SIZE;
            const cy = (ty + 0.5) * TILE_SIZE;
            return isSolid(room, tx, ty) || obstacles.some((r) => overlapsRect(cx, cy, FEET_BOX, r)) ? '#' : '.';
          })
          .join(''),
      );
    },
  };
}
