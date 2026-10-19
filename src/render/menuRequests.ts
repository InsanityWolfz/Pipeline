import type { Command, HopperAmount } from '../sim/input';

/** How many a hopper menu click moves (022): Ctrl+click all (Ctrl wins over Shift), Shift+click half, a plain click one. */
export function clickAmount(mods: { shift: boolean; ctrl: boolean }): HopperAmount {
  if (mods.ctrl) return 'all';
  return mods.shift ? 'half' : 'one';
}

/** The commands that menus send: the hopper, sorter, pylon, stash and bench menus' choices. */
export type MenuCommand = Pick<Command, 'deposit' | 'withdraw' | 'setFilter' | 'pylon' | 'travel' | 'takeStash' | 'identify' | 'equip' | 'applyStage' | 'restore' | 'summon'>;

const NONE: MenuCommand = { deposit: null, withdraw: null, setFilter: null, pylon: null, travel: null, takeStash: null, identify: false, equip: null, applyStage: null, restore: null, summon: null };

// Choices clicked in the world's menus, held until the next tick takes them.
export class MenuRequests {
  private pending: MenuCommand = { ...NONE };

  /** Puts one, half or all of a held item into a hopper (the hopper menu's choice, 022). */
  deposit(id: number, itemId: string, amount: HopperAmount): void {
    this.pending.deposit = { id, itemId, amount };
  }

  /** Takes one, half or all of a hopper's items into the inventory (the hopper menu's choice, 022). */
  withdraw(id: number, amount: HopperAmount): void {
    this.pending.withdraw = { id, amount };
  }

  /** Sets the item a sorter sends out its side, or null to pass everything (the sorter menu's choice). */
  setFilter(id: number, itemId: string | null): void {
    this.pending.setFilter = { id, itemId };
  }

  /** The claimed pylon's choice. */
  pylon(action: NonNullable<Command['pylon']>): void {
    this.pending.pylon = action;
  }

  /** The waystone menu's choice (032): the claimed site to travel to. */
  travel(site: string): void {
    this.pending.travel = site;
  }

  /** Takes a stack (or everything, for null) out of the stash. */
  takeStash(itemId: string | null): void {
    this.pending.takeStash = { itemId };
  }

  /** Identifies every carried piece at the bench. */
  identify(): void {
    this.pending.identify = true;
  }

  /** Wears a piece (or takes armor off) at the bench. */
  equip(id: number | null): void {
    this.pending.equip = { id };
  }

  /** Hand-applies a stage at the bench (029: the bench's Stages rows). */
  applyStage(stageId: string): void {
    this.pending.applyStage = stageId;
  }

  /** Restores a research node at its diagram (033: the restore panel's Restore row, or E again). */
  restore(nodeId: string): void {
    this.pending.restore = nodeId;
  }

  /** Pays an altar's offering, summoning its boss again (034: the offering row, or E again). */
  summon(altarId: string): void {
    this.pending.summon = altarId;
  }

  /** The held choices, consumed. */
  take(): MenuCommand {
    const out = this.pending;
    this.pending = { ...NONE };
    return out;
  }

  clear(): void {
    this.pending = { ...NONE };
  }
}

/** Build and menu actions for one tick, merged into the command. */
export type UiCommand = Pick<
  Command,
  'toggleBuild' | 'place' | 'pickUp' | 'deposit' | 'withdraw' | 'setFilter' | 'pylon' | 'travel' | 'takeStash' | 'identify' | 'equip' | 'applyStage' | 'restore' | 'summon'
>;

/** No UI actions this tick. */
export const NO_UI_COMMAND: UiCommand = { toggleBuild: false, place: null, pickUp: null, ...NONE };
