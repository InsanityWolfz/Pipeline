import type { Facing } from './player';
import type { EquipRequest } from './gear';
import type { SandboxCommand } from './sandbox';

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
  /** Set the item a sorter in reach sends out its side (null: pass everything), this tick (an edge), or null (015). */
  setFilter: { id: number; itemId: string | null } | null;
  /** The claimed pylon's menu choice this tick (an edge), or null. */
  pylon: 'deposit' | 'travel' | null;
  /** The waystone menu's choice (032): the claimed site to travel to, standing at the waystone, this tick (an edge), or null. */
  travel: string | null;
  /** Take a stack (or everything, for a null item) out of the stash this tick (an edge), or null. */
  takeStash: { itemId: string | null } | null;
  /** Identify every carried piece at the bench this tick (an edge). */
  identify: boolean;
  /** At the bench this tick (an edge, 036): wear a piece by id (the worn one comes off), or take a slot off with `{ slot, id: null }`; null for no change. */
  equip: EquipRequest | null;
  /** Hand-apply a stage (by stage id) at the bench this tick (an edge, 029), or null. */
  applyStage: string | null;
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
  interact: false,
  selectAmmo: null,
  toggleBuild: false,
  place: null,
  pickUp: null,
  deposit: null,
  withdraw: null,
  setFilter: null,
  pylon: null,
  travel: null,
  takeStash: null,
  identify: false,
  equip: null,
  applyStage: null,
  restore: null,
  summon: null,
  takeTalent: null,
  respec: false,
  sandbox: null,
};

/** A command's held part (stick, aim and fire) with every one-tick edge cleared: what a held command is after its first tick. */
export const heldPart = (cmd: Command): Command => ({ ...NO_COMMAND, moveX: cmd.moveX, moveY: cmd.moveY, aimX: cmd.aimX, aimY: cmd.aimY, fire: cmd.fire });
