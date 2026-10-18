import type { Command } from '../sim/input';

/** The commands that menus send: the hopper, pylon, stash and bench menus' choices. */
export type MenuCommand = Pick<Command, 'deposit' | 'withdraw' | 'pylon' | 'takeStash' | 'identify' | 'equip'>;

const NONE: MenuCommand = { deposit: null, withdraw: null, pylon: null, takeStash: null, identify: false, equip: null };

// Choices clicked in the world's menus, held until the next tick takes them.
export class MenuRequests {
  private pending: MenuCommand = { ...NONE };

  /** Fills a hopper (the hopper menu's choice). */
  deposit(id: number, itemId: string): void {
    this.pending.deposit = { id, itemId };
  }

  /** Empties a hopper into the inventory (the hopper menu's choice). */
  withdraw(id: number): void {
    this.pending.withdraw = { id };
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
