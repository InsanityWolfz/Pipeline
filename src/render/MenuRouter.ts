import { SOUNDS, VOLUME_STEP } from '../data/sounds';
import { usableInReach } from '../sim/foundryUse';
import { intakeOpenable } from '../sim/intake';
import type { SimState } from '../sim/state';
import type { BuildView } from './BuildView';
import type { ClickMods } from './clickInput';
import type { Controls } from './controls';
import type { CraftMenuView } from './CraftMenuView';
import type { HopperPicker } from './HopperPicker';
import { clickAmount } from './menuRequests';
import type { PauseAction, PauseMenuView } from './PauseMenuView';
import type { SiteMenus } from './SiteMenus';
import type { SoundView } from './SoundView';

/** The menus the router works, built by the scene. */
export interface Menus {
  craft: CraftMenuView;
  pause: PauseMenuView;
  site: SiteMenus;
  picker: HopperPicker;
  build: BuildView;
  sound: SoundView;
}

// Keys and clicks for the menus (split from GameScene in 020): C toggles the craft
// menu, which no longer pauses; Esc closes what's open (a site menu, the hopper
// picker, the craft menu, build mode), else opens or closes the pause menu, which
// stops the world; the wheel steps the build bar; E opens a hopper's picker or a
// site menu. These work under the test hook too; only ticking is left to it.
export class MenuRouter {
  private readonly sim: SimState;
  private readonly m: Menus;

  constructor(sim: SimState, menus: Menus) {
    this.sim = sim;
    this.m = menus;
  }

  handle(controls: Controls): void {
    const { craft, pause, site, picker, build } = this.m;
    const toggle = controls.takeMenuToggle();
    const close = controls.takeMenuClose();
    if (pause.isOpen) {
      if (close) pause.setOpen(false);
      return;
    }
    if (close && site.isOpen) site.close();
    else if (close && picker.isOpen) picker.close();
    else if (close && craft.isOpen) craft.setOpen(false);
    else if (close && this.sim.building) controls.requestBuildToggle();
    else if (close) pause.setOpen(true);
    else if (toggle) craft.setOpen(!craft.isOpen);
    const steps = controls.takeWheel();
    if (steps !== 0 && this.sim.building) build.step(steps);
    // E on a hopper opens its menu; the sim does nothing with it. At the intake with a warden core, E opens it (024) and no menu.
    if (controls.takeInteractPress() && !intakeOpenable(this.sim)) {
      const target = usableInReach(this.sim);
      if (target?.kind === 'hopper') picker.open(target.id);
      else site.interact(this.sim);
    }
    const open = picker.hopperId;
    if (open !== null && usableInReach(this.sim)?.id !== open) picker.close();
  }

  /**
   * A click: the pause menu's rows while paused; else the build bar, a site menu, or the hopper picker's rows.
   * A picker row moves one, Shift half, Ctrl all (022), and the picker stays open for the next click.
   */
  click(controls: Controls, x: number, y: number, mods: ClickMods): void {
    const { pause, site, picker, build, sound } = this.m;
    if (pause.isOpen) {
      this.pauseClick(pause.click(x, y));
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
