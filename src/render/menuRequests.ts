import type { EquipRequest } from '../sim/gear';
import type { Command, HopperAmount } from '../sim/input';
import type { SandboxCommand } from '../sim/sandbox';

/** How many a click on a stack moves (022, 047): Ctrl+click the whole stack (Ctrl wins over Shift), Shift+click half, a plain click one. */
export function clickAmount(mods: { shift: boolean; ctrl: boolean }): HopperAmount {
  if (mods.ctrl) return 'all';
  return mods.shift ? 'half' : 'one';
}

/** The commands that menus send: the hopper, pylon, stash and bench menus' choices. */
export type MenuCommand = Pick<Command, 'deposit' | 'withdraw' | 'sortInventory' | 'assignSlot' | 'pylon' | 'travel' | 'takeStash' | 'stashPut' | 'identify' | 'equip' | 'restore' | 'summon' | 'takeTalent' | 'respec' | 'sandbox'>;

const NONE: MenuCommand = { deposit: null, withdraw: null, sortInventory: false, assignSlot: null, pylon: null, travel: null, takeStash: null, stashPut: null, identify: false, equip: null, restore: null, summon: null, takeTalent: null, respec: false, sandbox: null };

// Choices clicked in the world's menus, held until the next tick takes them.
export class MenuRequests {
  private pending: MenuCommand = { ...NONE };

  /** Puts one, half or the whole of a clicked stack into a hopper or crate (022; 047: the grid's click). */
  deposit(id: number, itemId: string, amount: HopperAmount, stack?: number): void {
    this.pending.deposit = { id, itemId, amount, ...(stack !== undefined ? { stack } : {}) };
  }

  /** Takes one, half or the whole of a hopper's or crate's clicked stack into the inventory (022; 047: the container's click). */
  withdraw(id: number, amount: HopperAmount, itemId?: string, stack?: number): void {
    this.pending.withdraw = { id, amount, ...(itemId !== undefined ? { itemId } : {}), ...(stack !== undefined ? { stack } : {}) };
  }

  /** The grid's Sort button (047). */
  sortInventory(): void {
    this.pending.sortInventory = true;
  }

  /** A stack dragged onto a carried bar slot (047). */
  assignSlot(slot: number, itemId: string): void {
    this.pending.assignSlot = { slot, itemId };
  }

  /** The claimed pylon's choice. */
  pylon(action: NonNullable<Command['pylon']>): void {
    this.pending.pylon = action;
  }

  /** The waystone menu's choice (032): the claimed site to travel to. */
  travel(site: string): void {
    this.pending.travel = site;
  }

  /** Takes one, half or the whole of a clicked stash stack into the inventory (052: the stash screen's click). */
  takeStash(itemId: string, amount: HopperAmount, stack?: number): void {
    this.pending.takeStash = { itemId, amount, ...(stack !== undefined ? { stack } : {}) };
  }

  /** Puts one, half or the whole of a clicked inventory stack into the stash (052: the stash screen's click). */
  stashPut(itemId: string, amount: HopperAmount, stack?: number): void {
    this.pending.stashPut = { itemId, amount, ...(stack !== undefined ? { stack } : {}) };
  }

  /** Identifies every carried piece at the bench. */
  identify(): void {
    this.pending.identify = true;
  }

  /** Wears a piece (the worn one comes off), or takes a slot off, at the bench (036). */
  equip(req: EquipRequest): void {
    this.pending.equip = req;
  }

  /** Restores a research node at its diagram (033: the restore panel's Restore row, or E again). */
  restore(nodeId: string): void {
    this.pending.restore = nodeId;
  }

  /** Pays an altar's offering, summoning its boss again (034: the offering row, or E again). */
  summon(altarId: string): void {
    this.pending.summon = altarId;
  }

  /** Takes a talent (037: a click on an available node in the tree panel). */
  takeTalent(id: string): void {
    this.pending.takeTalent = id;
  }

  /** Respecs every talent (037: the tree panel's reset, in the foundry). */
  respec(): void {
    this.pending.respec = true;
  }

  /** The Sandbox panel's request (044). */
  sandbox(c: SandboxCommand): void {
    this.pending.sandbox = c;
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
export type UiCommand = Pick<Command, 'toggleBuild' | 'place' | 'pickUp'> & MenuCommand;

/** No UI actions this tick. */
export const NO_UI_COMMAND: UiCommand = { toggleBuild: false, place: null, pickUp: null, ...NONE };

/** A command with the UI's actions merged in: each one the command doesn't set itself comes from the UI (the test hook's steps). */
export function withUi(cmd: Command, ui: UiCommand): Command {
  const out: Command = { ...cmd };
  for (const key of Object.keys(NO_UI_COMMAND) as (keyof UiCommand)[]) {
    const mine = cmd[key];
    if (mine === null || mine === false) Object.assign(out, { [key]: ui[key] });
  }
  return out;
}
