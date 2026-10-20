import type { SimState } from '../../sim/state';

// What a running game asks of the flow (042), so GameScene knows when to step and can report what the flow cares
// about. FlowScene implements it; a GameScene never decides which screen is up.

export interface GameHost {
  /** Only in play does the world step. */
  readonly stepping: boolean;
  /** The pause menu is up. */
  readonly paused: boolean;
  /** A flow screen (Settings, the note, a card) is over the game: it takes no input. */
  readonly covered: boolean;
  /** Esc in play: the pause menu. */
  pause(): void;
  /** Resume, or Esc on the pause menu. */
  resume(): void;
  /** The pause menu's Settings and Quit to title rows. */
  pauseAction(action: 'settings' | 'quit'): void;
  /** After every tick, with the tick's events still on the sim: a foundry arrival saves; the Bulwark's first kill queues the end card. */
  afterTick(sim: SimState): void;
}

/** A host for a game nothing hosts (the test hook's blank UI): it never steps. */
export const IDLE_HOST: GameHost = {
  stepping: false,
  paused: false,
  covered: true,
  pause: () => undefined,
  resume: () => undefined,
  pauseAction: () => undefined,
  afterTick: () => undefined,
};
