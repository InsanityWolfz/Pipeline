import { SOUNDS, VOLUME_STEP } from '../data/sounds';
import { usableInReach } from '../sim/foundryUse';
import type { SimState } from '../sim/state';
import type { BuildView } from './BuildView';
import type { ClickMods } from './clickInput';
import type { Controls } from './controls';
import type { CraftMenuView } from './CraftMenuView';
import type { HopperPicker } from './HopperPicker';
import type { InventoryPanel } from './InventoryPanel';
import type { ResearchList } from './ResearchList';
import type { TalentPanel } from './TalentPanel';
import { clickAmount } from './menuRequests';
import type { PauseAction, PauseMenuView } from './PauseMenuView';
import type { SiteMenus } from './SiteMenus';
import type { SoundView } from './SoundView';
import type { WakeView } from './WakeView';

/** The menus the router works, built by the scene. */
export interface Menus {
  craft: CraftMenuView;
  pause: PauseMenuView;
  site: SiteMenus;
  picker: HopperPicker;
  build: BuildView;
  sound: SoundView;
  inventory: InventoryPanel;
  research: ResearchList;
  talents: TalentPanel;
  wake: WakeView;
}

// Keys and clicks for the menus (split from GameScene in 020): C toggles the craft
// menu, which no longer pauses, and I or Tab the inventory panel (031); Esc closes
// what's open (the inventory, a site menu, the hopper picker, the craft menu, build
// mode), else opens or closes the pause menu, which stops the world; T the talent tree
// (037), which takes turns with the inventory and the research list; the wheel steps
// the build bar; E opens a hopper's picker or a site menu. These work under the test
// hook too; only ticking is left to it.
export class MenuRouter {
  private readonly sim: SimState;
  private readonly m: Menus;

  constructor(sim: SimState, menus: Menus) {
    this.sim = sim;
    this.m = menus;
  }

  handle(controls: Controls): void {
    const { craft, pause, site, picker, build, inventory, research, talents, wake } = this.m;
    const toggle = controls.takeMenuKey('menu');
    const close = controls.takeMenuKey('close');
    // I or Tab (031): taken even while paused, so a press then never opens the panel later.
    const bag = controls.takeMenuKey('inventory');
    // J (033): the research list, likewise taken even while paused.
    const list = controls.takeMenuKey('research');
    // T (037): the talent tree, likewise.
    const tree = controls.takeMenuKey('talents');
    if (pause.isOpen) {
      if (close) pause.setOpen(false);
      return;
    }
    if (close && talents.isOpen) talents.setOpen(false);
    else if (close && inventory.isOpen) inventory.setOpen(false);
    else if (close && research.isOpen) research.setOpen(false);
    else if (close && site.isOpen) site.close();
    else if (close && picker.isOpen) picker.close();
    else if (close && craft.isOpen) craft.setOpen(false);
    else if (close && this.sim.building) controls.requestBuildToggle();
    else if (close) pause.setOpen(true);
    else if (toggle) craft.setOpen(!craft.isOpen);
    // The panel and the other menus take turns: opening it closes them (not while the wake panel shows), and theirs closes it.
    if (bag && !wake.isShown && !pause.isOpen) this.openInventory(!inventory.isOpen);
    // The list opens anywhere and never pauses; it and the inventory take turns (both are big centred panels).
    if (list && !wake.isShown && !pause.isOpen) {
      research.setOpen(!research.isOpen);
      if (research.isOpen) inventory.setOpen(false);
    }
    // The tree opens anywhere and never pauses (opening it mid-fight is a risk); it closes the other big panels and menus.
    if (tree && !wake.isShown && !pause.isOpen) {
      talents.setOpen(!talents.isOpen);
      if (talents.isOpen) {
        craft.setOpen(false);
        picker.close();
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
    const steps = controls.takeWheel();
    if (steps !== 0 && this.sim.building) build.step(steps);
    // E on a hopper opens its menu; the sim does nothing with it. With the restore panel open, E again restores (033).
    if (controls.takeInteractPress() && !site.pressAgain(controls)) {
      const target = usableInReach(this.sim);
      if (target?.kind === 'hopper') picker.open(target.id);
      else site.interact(this.sim);
      if (picker.isOpen || site.isOpen) {
        inventory.setOpen(false);
        research.setOpen(false);
        talents.setOpen(false);
      }
    }
    const open = picker.hopperId;
    if (open !== null && usableInReach(this.sim)?.id !== open) picker.close();
  }

  /**
   * A click: the pause menu's rows while paused; else the build bar, a site menu, or the hopper picker's rows.
   * A picker row moves one, Shift half, Ctrl all (022), and the picker stays open for the next click.
   */
  click(controls: Controls, x: number, y: number, mods: ClickMods): void {
    const { pause, site, picker, build, sound, talents } = this.m;
    if (pause.isOpen) {
      this.pauseClick(pause.click(x, y));
      return;
    }
    // The tree (037): a lit node is taken, the reset respecs (their sounds play from the sim's events).
    const tree = talents.click(x, y);
    if (tree) {
      if ('take' in tree) controls.menus.takeTalent(tree.take);
      else if ('respec' in tree) controls.menus.respec();
      return;
    }
    if (build.click(x, y) || site.click(controls, x, y)) {
      sound.play(SOUNDS.menuClick);
      return;
    }
    const entry = picker.entryAt(x, y);
    const hopper = picker.hopperId;
    if (!entry || hopper === null) return;
    sound.play(SOUNDS.menuClick);
    picker.flashAt(x, y);
    const amount = clickAmount(mods);
    if (entry.action === 'take') controls.menus.withdraw(hopper, amount);
    else controls.menus.deposit(hopper, entry.itemId, amount);
  }

  /** Opens or closes the inventory panel; opening it closes the crafting menu, the hopper picker, any site menu (031) and the tree (037). */
  private openInventory(open: boolean): void {
    const { craft, picker, site, inventory, talents } = this.m;
    if (open) {
      craft.setOpen(false);
      picker.close();
      site.close();
      talents.setOpen(false);
    }
    inventory.setOpen(open);
  }

  /** The pause menu's sound settings and resume. */
  private pauseClick(action: PauseAction | null): void {
    const { sound, pause } = this.m;
    if (!action) return;
    sound.play(SOUNDS.menuClick);
    if (action === 'mute') sound.toggleMute();
    else if (action === 'volumeDown') sound.nudgeVolume(-VOLUME_STEP);
    else if (action === 'volumeUp') sound.nudgeVolume(VOLUME_STEP);
    else pause.setOpen(false);
  }
}
