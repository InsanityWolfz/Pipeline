import type { Command, HopperAmount } from '../sim/input';

/** How many a hopper menu click moves (022): Ctrl+click all (Ctrl wins over Shift), Shift+click half, a plain click one. */
export function clickAmount(mods: { shift: boolean; ctrl: boolean }): HopperAmount {
  if (mods.ctrl) return 'all';
  return mods.shift ? 'half' : 'one';
}

/** The commands that menus send: the hopper, sorter, pylon, stash and bench menus' choices. */
export type MenuCommand = Pick<Command, 'deposit' | 'withdraw' | 'setFilter' | 'pylon' | 'takeStash' | 'identify' | 'equip'>;

const NONE: MenuCommand = { deposit: null, withdraw: null, setFilter: null, pylon: null, takeStash: null, identify: false, equip: null };

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
  'toggleBuild' | 'place' | 'pickUp' | 'deposit' | 'withdraw' | 'setFilter' | 'pylon' | 'takeStash' | 'identify' | 'equip'
>;

/** No UI actions this tick. */
export const NO_UI_COMMAND: UiCommand = { toggleBuild: false, place: null, pickUp: null, ...NONE };
