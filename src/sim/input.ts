// What the player asks for on one tick. Render builds these from the keyboard;
// the sim never reads input devices.

export type Axis = -1 | 0 | 1;

export interface Command {
  moveX: Axis;
  moveY: Axis;
  /** Dodge was pressed this tick (an edge, not held). */
  dodge: boolean;
}

export const NO_COMMAND: Readonly<Command> = { moveX: 0, moveY: 0, dodge: false };
