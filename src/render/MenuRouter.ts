import { SOUNDS } from '../data/sounds';
import { stillUsable, usableInReach } from '../sim/foundryUse';
import { diagramInReach } from '../sim/research';
import type { SimState } from '../sim/state';
import type { BuildView } from './BuildView';
import type { ClickMods } from './clickInput';
import type { Controls } from './controls';
import type { CraftMenuView } from './CraftMenuView';
import type { InventoryPanel } from './InventoryPanel';
import type { Legibility } from './Legibility';
import type { ResearchList } from './ResearchList';
import type { TalentPanel } from './TalentPanel';
import { clickAmount } from './menuRequests';
import type { PauseAction, PauseMenuView } from './PauseMenuView';
import type { SiteMenus } from './SiteMenus';
import type { SoundView } from './SoundView';
import type { WakeView } from './WakeView';
import type { GameHost } from './flow/host';
import type { SandboxPanel } from './SandboxPanel';

/** The menus the router works, built by the scene. */
export interface Menus {
  craft: CraftMenuView;
  pause: PauseMenuView;
  site: SiteMenus;
  /** 047: the carried bar's slot under a point (a dragged stack lands there). */
  carriedSlotAt: (x: number, y: number) => number | null;
  build: BuildView;
  sound: SoundView;
  inventory: InventoryPanel;
  research: ResearchList;
  talents: TalentPanel;
  wake: WakeView;
  /** 040: the tips and the glossary. */
  legibility: Legibility;
  /** 042: the flow, which owns whether the pause menu is up. */
  host: GameHost;
  /** 044: the Sandbox panel (in the sandbox only). */
  sandbox: SandboxPanel;
}

// Keys and clicks for the menus (split from GameScene in 020): C toggles the craft
// menu, which no longer pauses, and I or Tab the grid inventory (031, 047); Esc closes
// what's open (the inventory or a hopper's or crate's screen, a site menu, the craft
// menu, build mode), else opens or closes the pause menu, which stops the world; T the
// talent tree (037), which takes turns with the inventory and the research list; the
// wheel steps the build bar, or scrolls the open grid; E opens a hopper's or crate's
// screen (047) or a site menu. These work under the test hook too; only ticking is left to it.
export class MenuRouter {
  private readonly sim: SimState;
  private readonly m: Menus;

  constructor(sim: SimState, menus: Menus) {
    this.sim = sim;
    this.m = menus;
  }

  handle(controls: Controls): void {
    const { craft, site, build, inventory, research, talents, wake, legibility, sandbox } = this.m;
    const toggle = controls.takeMenuKey('menu');
    // Esc closes an open glossary entry first (040), before any panel.
    const close = controls.takeMenuKey('close') && !legibility.close();
    // I or Tab (031): taken even while paused, so a press then never opens the panel later.
    const bag = controls.takeMenuKey('inventory');
    // J (033): the research list, likewise taken even while paused.
    const list = controls.takeMenuKey('research');
    // T (037): the talent tree, likewise.
    const tree = controls.takeMenuKey('talents');
    // 044: the Sandbox panel's key, only in the sandbox; likewise.
    const panel = controls.takeMenuKey('sandbox') && this.sim.sandbox !== undefined;
    if (this.m.host.paused) {
      if (close) this.m.host.resume();
      return;
    }
    if (close && sandbox.isOpen) sandbox.setOpen(false);
    else if (close && talents.isOpen) talents.setOpen(false);
    else if (close && inventory.isOpen) inventory.setOpen(false);
    else if (close && research.isOpen) research.setOpen(false);
    else if (close && site.isOpen) site.close();
    else if (close && craft.isOpen) craft.setOpen(false);
    else if (close && this.sim.building) controls.requestBuildToggle();
    else if (close) this.m.host.pause();
    else if (toggle) craft.setOpen(!craft.isOpen);
    // The panel and the other menus take turns: opening it closes them (not while the wake panel shows), and theirs closes it.
    if (bag && !wake.isShown && !this.m.host.paused) this.openInventory(!inventory.isOpen);
    // The list opens anywhere and never pauses; it and the inventory take turns (both are big centred panels).
    if (list && !wake.isShown && !this.m.host.paused) {
      research.setOpen(!research.isOpen);
      if (research.isOpen) inventory.setOpen(false);
    }
    // The tree opens anywhere and never pauses (opening it mid-fight is a risk); it closes the other big panels and menus.
    if (tree && !wake.isShown && !this.m.host.paused) {
      talents.setOpen(!talents.isOpen);
      if (talents.isOpen) {
        craft.setOpen(false);
        site.close();
        inventory.setOpen(false);
        research.setOpen(false);
      }
    }
    if (bag && inventory.isOpen) research.setOpen(false);
    if ((bag && inventory.isOpen) || (list && research.isOpen)) talents.setOpen(false);
    if (toggle && craft.isOpen) {
      inventory.setOpen(false);
      research.setOpen(false);
      talents.setOpen(false);
    }
    // The Sandbox panel never pauses; it and the big panels take turns.
    if (panel && !wake.isShown) {
      sandbox.setOpen(!sandbox.isOpen);
      if (sandbox.isOpen) for (const p of [inventory, research, talents, craft]) p.setOpen(false);
    }
    if ((bag && inventory.isOpen) || (list && research.isOpen) || (tree && talents.isOpen) || (toggle && craft.isOpen)) sandbox.setOpen(false);
    const steps = controls.takeWheel();
    if (steps !== 0 && this.sim.building) build.step(steps);
    else if (steps !== 0 && !site.scrollGear(steps)) inventory.scroll(steps);
    // E on a hopper or crate opens its screen (047); the sim does nothing with it. With the restore panel open, E again restores (033).
    const press = controls.takeInteractPress();
    // 050 (Shaun: "you hit E to get out or escape. It should be both buttons"): E closes the inventory, a hopper's or
    // crate's screen, or the stash, as Esc does, before it opens anything.
    // That E is used up: it doesn't also reach the sim as an interact (it harvested or claimed whatever was in reach).
    if (press && (inventory.isOpen || site.stashOpen)) controls.dropInteract();
    if (press && inventory.isOpen) inventory.setOpen(false);
    else if (press && site.stashOpen) site.close();
    else if (press && !site.pressAgain(controls)) {
      const target = usableInReach(this.sim);
      // A diagram in reach wins over a crate (033's priority, as E's prompt shows), as before 047.
      if (target?.kind === 'hopper' || (target?.kind === 'crate' && !diagramInReach(this.sim))) {
        craft.setOpen(false);
        site.close();
        inventory.openContainer(target.kind, target.id);
      } else site.interact(this.sim);
      if (inventory.container !== null || site.isOpen) {
        research.setOpen(false);
        talents.setOpen(false);
      }
      if (site.isOpen) inventory.setOpen(false);
    }
    // Walking out of reach closes a hopper's or crate's screen.
    const open = inventory.container;
    if (open !== null && !stillUsable(this.sim, open)) inventory.close();
  }

  /**
   * A press: the pause menu's rows while paused; else the build bar, a site menu, or the grid inventory (047: Sort at
   * once; a slot waits for the release, `release`).
   */
  click(controls: Controls, x: number, y: number, mods: ClickMods): void {
    const { pause, site, build, sound, talents, legibility, sandbox, craft, inventory } = this.m;
    if (pause.isOpen) {
      this.pauseClick(pause.click(x, y));
      return;
    }
    // 044: the Sandbox panel's rows; its spawn choices change the panel, the rest go to the sim.
    const panel = sandbox.click(this.sim, x, y);
    if (panel) {
      if (panel.hit) sound.play(SOUNDS.menuClick);
      if (panel.command) controls.menus.sandbox(panel.command);
      return;
    }
    // A chip opens its glossary entry; with one open, a click outside it closes it (040).
    if (legibility.click(x, y)) {
      sound.play(SOUNDS.menuClick);
      return;
    }
    // The tree (037): a lit node is taken, the reset respecs (their sounds play from the sim's events).
    const tree = talents.click(x, y);
    if (tree) {
      if ('take' in tree) controls.menus.takeTalent(tree.take);
      else if ('respec' in tree) controls.menus.respec();
      return;
    }
    // 047: the crafting menu's tabs (its rows craft from their own press handlers).
    if (craft.click(x, y) || build.click(x, y) || site.click(controls, x, y)) {
      sound.play(SOUNDS.menuClick);
      return;
    }
    if (inventory.pressAt(x, y, clickAmount(mods)) === 'sort') {
      sound.play(SOUNDS.menuClick);
      controls.menus.sortInventory();
    }
  }

  /**
   * A release after a press on the UI (047): on the grid slot it went down on, with a hopper or crate open, the stack
   * moves one, Shift half, Ctrl the whole stack, either way; over a carried bar slot, a usable kind goes on it.
   */
  release(controls: Controls, x: number, y: number): void {
    const action = this.m.inventory.releaseAt(x, y, this.m.carriedSlotAt(x, y));
    if (!action) return;
    this.m.sound.play(SOUNDS.menuClick);
    if (action.kind === 'assign') controls.menus.assignSlot(action.slot, action.itemId);
    else if (action.kind === 'deposit') controls.menus.deposit(action.id, action.itemId, action.amount, action.stack);
    else controls.menus.withdraw(action.id, action.amount, action.itemId, action.stack);
  }

  /** Opens or closes the inventory panel; opening it closes the crafting menu, any site menu (031) and the tree (037). */
  private openInventory(open: boolean): void {
    const { craft, site, inventory, talents } = this.m;
    if (open) {
      craft.setOpen(false);
      site.close();
      talents.setOpen(false);
    }
    inventory.setOpen(open);
  }

  /** The pause menu's rows (042): Resume, Settings, Quit to title. */
  private pauseClick(action: PauseAction | null): void {
    if (!action) return;
    this.m.sound.play(SOUNDS.menuClick);
    if (action === 'resume') this.m.host.resume();
    else this.m.host.pauseAction(action);
  }
}
