import type { Facing } from './player';

// What the player asks for on one tick. Render builds these from the keyboard
// and mouse; the sim never reads input devices.

export type Axis = -1 | 0 | 1;

/**
 * How many a hopper deposit or withdraw moves (022), like an inventory stack: one,
 * half the stack (rounded up), or all of it.
 */
export type HopperAmount = 'one' | 'half' | 'all';

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
  /**
   * `inFrom` shapes a conduit (013): left out, a single conduit joins a lone side
   * feeder as a corner. `mirrored` makes a sorter send its item left (015).
   */
  place: { pieceId: string; tx: number; ty: number; facing: Facing; inFrom?: Facing; mirrored?: boolean } | null;
  /** A tile whose piece to pick up this tick (an edge), or null. */
  pickUp: { tx: number; ty: number } | null;
  /** Put some of a held item into a hopper (by piece id) that's empty or holds it, this tick (an edge), or null (022: how many by `amount`). */
  deposit: { id: number; itemId: string; amount: HopperAmount } | null;
  /** Take some of what's in a hopper (by piece id) out, this tick (an edge), or null (022: how many by `amount`). */
  withdraw: { id: number; amount: HopperAmount } | null;
  /** Turn a gravity stager (by piece id) to its next angle this tick (an edge), or null. */
  setAngle: { id: number } | null;
  /** Set the item a sorter in reach sends out its side (null: pass everything), this tick (an edge), or null (015). */
  setFilter: { id: number; itemId: string | null } | null;
  /** The claimed pylon's menu choice this tick (an edge), or null. */
  pylon: 'deposit' | 'travel' | null;
  /** Take a stack (or everything, for a null item) out of the stash this tick (an edge), or null. */
  takeStash: { itemId: string | null } | null;
  /** Identify every carried piece at the bench this tick (an edge). */
  identify: boolean;
  /** Wear an identified piece (by id), or take armor off (null), at the bench this tick (an edge), or null for no change. */
  equip: { id: number | null } | null;
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
  setFilter: null,
  pylon: null,
  takeStash: null,
  identify: false,
  equip: null,
};
