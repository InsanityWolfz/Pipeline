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
  /** Load was pressed this tick (an edge, not held). */
  load: boolean;
}

/** No input. Its aim is the world origin, so callers that care about aim must set one. */
export const NO_COMMAND: Readonly<Command> = {
  moveX: 0,
  moveY: 0,
  dodge: false,
  aimX: 0,
  aimY: 0,
  fire: false,
  load: false,
};
