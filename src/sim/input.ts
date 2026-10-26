import type { Facing } from './player';
import type { EquipRequest } from './gear';
import type { SandboxCommand } from './sandbox';
import type { AreaBox } from './area';

// What the player asks for on one tick. Render builds these from the keyboard
// and mouse; the sim never reads input devices.

export type Axis = -1 | 0 | 1;

/** What the area tool's release menu asks for (063). */
export type AreaAction = 'pickUp' | 'save' | 'saveAndPickUp';

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
  /** Fire (left click) is held: the intake's volley, or the punch with the intake dry (047). */
  fire: boolean;
  /** Use (right click, 047) is held: the carried bar's selected item, thrown or fired. */
  use: boolean;
  /** Interact (harvest) was pressed this tick (an edge, not held). */
  interact: boolean;
  /** A carried bar slot picked this tick (keys 1–5, an edge, 047), or null. */
  selectSlot: number | null;
  /** A stack dragged onto a carried bar slot this tick (an edge, 047): its kind goes on the slot; or null. */
  assignSlot: { slot: number; itemId: string } | null;
  /** Build mode was toggled this tick (an edge). Only works in the foundry. */
  toggleBuild: boolean;
  /** A piece to place this tick (an edge), or null. */
  /**
   * `inFrom` shapes a conduit (013): left out, a single conduit joins a lone side
   * feeder as a corner. `mirrored` makes a splitter's side its left (033).
   */
  place: { pieceId: string; tx: number; ty: number; facing: Facing; inFrom?: Facing; mirrored?: boolean } | null;
  /** A tile whose piece to pick up this tick (an edge), or null. */
  pickUp: { tx: number; ty: number } | null;
  /**
   * The area tool's choice for a box this tick (an edge, 063), or null: pick up every piece wholly inside it, save them
   * as a blueprint (into `slot`, overwriting it; left out, the next free slot), or both.
   */
  area: { box: AreaBox; action: AreaAction; slot?: number } | null;
  /**
   * Put some of a held item into a hopper (by piece id) that's empty or holds it, or into a crate (047), this tick (an
   * edge), or null. How many by `amount` (022) of the clicked stack's `stack` items (047; left out, all held).
   */
  deposit: { id: number; itemId: string; amount: HopperAmount; stack?: number } | null;
  /**
   * Take some of what's in a hopper or crate (by piece id) out, this tick (an edge), or null: a crate's `itemId` kind
   * (047). How many by `amount` (022) of the clicked stack's `stack` items (047; left out, all it holds of the kind).
   */
  withdraw: { id: number; amount: HopperAmount; itemId?: string; stack?: number } | null;
  /** The grid inventory's Sort button this tick (an edge, 047). */
  sortInventory: boolean;
  /** The claimed pylon's menu choice this tick (an edge), or null. */
  pylon: 'deposit' | 'travel' | null;
  /** The waystone menu's choice (032): the claimed site to travel to, standing at the waystone, this tick (an edge), or null. */
  travel: string | null;
  /**
   * Take some of a kind out of the stash, standing at it, this tick (an edge), or null: by `amount` (052: the stash
   * screen's click, one, half or the stack) of the clicked stack's `stack` items; with no amount, all of the kind; a null
   * item takes everything.
   */
  takeStash: { itemId: string | null; amount?: HopperAmount; stack?: number } | null;
  /** Put some of a held kind into the stash, standing at it, this tick (an edge, 052: the stash screen's click), or null; amounts as `takeStash`'s. */
  stashPut: { itemId: string; amount: HopperAmount; stack?: number } | null;
  /** Identify every carried piece at the bench this tick (an edge). */
  identify: boolean;
  /** At the bench this tick (an edge, 036): wear a piece by id (the worn one comes off), or take a slot off with `{ slot, id: null }`; null for no change. */
  equip: EquipRequest | null;
  /** Restore a research node (by id) at its diagram in reach this tick (an edge, 033), or null. */
  restore: string | null;
  /** Pay the offering at an altar (by id) in reach, summoning its boss again (an edge, 034), or null. */
  summon: string | null;
  /** Take a talent (by id) this tick (an edge, 037): anywhere, with a point to spend; or null. */
  takeTalent: string | null;
  /** Respec every talent this tick (an edge, 037): only in the foundry (or the sandbox, 044), free. */
  respec: boolean;
  /** The sandbox panel's request this tick (an edge, 044), or null; nothing outside the sandbox. */
  sandbox: SandboxCommand | null;
}

/** No input. Its aim is the world origin, so callers that care about aim must set one. */
export const NO_COMMAND: Readonly<Command> = {
  moveX: 0,
  moveY: 0,
  dodge: false,
  aimX: 0,
  aimY: 0,
  fire: false,
  use: false,
  interact: false,
  selectSlot: null,
  assignSlot: null,
  toggleBuild: false,
  place: null,
  pickUp: null,
  area: null,
  deposit: null,
  withdraw: null,
  sortInventory: false,
  pylon: null,
  travel: null,
  takeStash: null,
  stashPut: null,
  identify: false,
  equip: null,
  restore: null,
  summon: null,
  takeTalent: null,
  respec: false,
  sandbox: null,
};

/** A command's held part (stick, aim, fire and use) with every one-tick edge cleared: what a held command is after its first tick. */
export const heldPart = (cmd: Command): Command => ({ ...NO_COMMAND, moveX: cmd.moveX, moveY: cmd.moveY, aimX: cmd.aimX, aimY: cmd.aimY, fire: cmd.fire, use: cmd.use });
