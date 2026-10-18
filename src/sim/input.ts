import type { Facing } from './player';

// What the player asks for on one tick. Render builds these from the keyboard
// and mouse; the sim never reads input devices.

export type Axis = -1 | 0 | 1;

export interface Command {
  moveX: Axis;
  moveY: Axis;
  /** Dodge was pressed this tick (an edge, not held). */
  dodge: boolean;
  /** Where the cursor points, world px. */
  aimX: number;
  aimY: number;
  /** Fire is held. */
  fire: boolean;
  /** Interact (harvest) was pressed this tick (an edge, not held). */
  interact: boolean;
  /** An ammo picked for the slot this tick (an edge), or null. */
  selectAmmo: string | null;
  /** Build mode was toggled this tick (an edge). Only works in the foundry. */
  toggleBuild: boolean;
  /** A piece to place this tick (an edge), or null. */
  place: { pieceId: string; tx: number; ty: number; facing: Facing } | null;
  /** A tile whose piece to pick up this tick (an edge), or null. */
  pickUp: { tx: number; ty: number } | null;
  /** Put all of a held item into an empty hopper (by piece id) this tick (an edge), or null. */
  deposit: { id: number; itemId: string } | null;
  /** Take everything out of a hopper (by piece id) this tick (an edge), or null. */
  withdraw: { id: number } | null;
  /** Turn a gravity stager (by piece id) to its next angle this tick (an edge), or null. */
  setAngle: { id: number } | null;
}

/** No input. Its aim is the world origin, so callers that care about aim must set one. */
export const NO_COMMAND: Readonly<Command> = {
  moveX: 0,
  moveY: 0,
  dodge: false,
  aimX: 0,
  aimY: 0,
  fire: false,
  interact: false,
  selectAmmo: null,
  toggleBuild: false,
  place: null,
  pickUp: null,
  deposit: null,
  withdraw: null,
  setAngle: null,
};
