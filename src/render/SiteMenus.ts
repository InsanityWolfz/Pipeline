import type { Scene } from 'phaser';
import { SITE_ICONS } from '../data/foundryAssets';
import { claimedPylonInReach, fixtureInReach, travelDestinations } from '../sim/claims';
import { usableStoneInReach } from '../sim/returnStones';
import { FOUNDRY_ROOM } from '../data/rooms';
import { PYLON_MENU_TEXT } from '../data/claims';
import type { SimState } from '../sim/state';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';
import { RestorePanel } from './RestorePanel';
import { diagramInReach } from '../sim/research';
import { GearPanel } from './GearPanel';
import { altarInReach, altarState } from '../sim/altar';
import { offeringModel } from './altarPanel';
import type { UiState } from './testHook';
import type { TipHit } from './tipTypes';

/** The claimed pylon's rows: send the inventory home, travel to the foundry, or (072) travel to a woken return stone. */
type PylonChoice = 'deposit' | 'travel' | { stone: string };

/** The site menus' part of `ui()`. */
export type SiteUiState = Pick<UiState, 'siteOpen' | 'waystone' | 'pylonMenu' | 'returnMenu' | 'restorePanel' | 'altarPanel' | 'gearPanel'>;

/** The site menus' part of `ui()` before the scene has built them. */
export const NO_SITE_UI: SiteUiState = { siteOpen: false, waystone: null, pylonMenu: null, returnMenu: null, restorePanel: null, altarPanel: null, gearPanel: null };
/** A waystone row (032): the destination to travel to, a claimed site or (072) a woken return stone, by id. */
type WaystoneChoice = { site: string };

// The claimed pylon's menu (send the inventory to the stash, travel to the foundry) and the waystone's
// (travel to any claimed pylon, by landmark name, 032), opened by E beside them (009; 052:
// the stash's screen is the grid panel's, which the router opens), and the
// identification bench's gear panel (036: identify all, wear or take off a piece per
// slot).
/** A travel row's words (032): "Travel to Shrine", (072) "Travel to Sunken Forum door". */
const travelText = (name: string): string => `Travel to ${name}`;

export class SiteMenus {
  private readonly pylon: ChoiceMenu<PylonChoice>;
  private readonly bench: GearPanel;
  private readonly waystone: ChoiceMenu<WaystoneChoice>;
  /** 072: a woken return stone's menu, its one row "Travel to foundry". */
  private readonly stone: ChoiceMenu<'home'>;
  /** The restore panel (033), opened by E at a diagram in the foundry. */
  private readonly restore: RestorePanel;
  /** The altar's offering (034), in the restore panel's style, opened by E at an awake altar. */
  private readonly offering: RestorePanel;

  constructor(scene: Scene) {
    this.pylon = new ChoiceMenu(scene);
    this.bench = new GearPanel(scene);
    this.waystone = new ChoiceMenu(scene);
    this.stone = new ChoiceMenu(scene);
    this.restore = new RestorePanel(scene);
    this.offering = new RestorePanel(scene, offeringModel);
  }

  private get menus(): readonly ChoiceMenu<unknown>[] {
    return [this.pylon, this.waystone, this.stone];
  }

  /** 050 (A.13): the wheel scrolls the bench's gear list while it's open; returns whether it took the steps. */
  scrollGear(steps: number): boolean {
    if (!this.bench.isOpen) return false;
    this.bench.scroll(steps);
    return true;
  }

  get isOpen(): boolean {
    return this.menus.some((m) => m.isOpen) || this.bench.isOpen || this.restore.isOpen || this.offering.isOpen;
  }

  overUi(x: number, y: number): boolean {
    return this.menus.some((m) => m.overUi(x, y)) || this.bench.overUi(x, y) || this.restore.overUi(x, y) || this.offering.overUi(x, y);
  }

  close(): void {
    for (const m of this.menus) m.close();
    this.bench.close();
    this.restore.close();
    this.offering.close();
  }

  /** A gear piece under a view point (040). */
  tipAt(x: number, y: number): TipHit | null {
    return this.bench.tipAt(x, y);
  }

  /** The cursor is at a screen point: the open menu lights the row under it (020). */
  pointAt(x: number, y: number): void {
    for (const m of this.menus) m.pointAt(x, y);
    this.bench.pointAt(x, y);
    this.restore.pointAt(x, y);
    this.offering.pointAt(x, y);
  }

  /**
   * E was pressed with the restore panel open (033): E again restores, as clicking Restore does, and the panel
   * closes; without the cost it stays open and nothing is sent. Returns whether the panel took the press.
   */
  pressAgain(controls: Controls): boolean {
    // The altar's offering (034) works the same: E again summons.
    if (this.offering.isOpen) {
      const altar = this.offering.confirm;
      if (!altar) return true;
      controls.menus.summon(altar);
      this.offering.flash();
      this.offering.close();
      return true;
    }
    if (!this.restore.isOpen) return false;
    const node = this.restore.confirm;
    if (!node) return true;
    controls.menus.restore(node);
    this.restore.flash();
    this.restore.close();
    return true;
  }

  /**
   * E was pressed: opens a diagram's restore panel (033), or the menu of a claimed pylon or the bench in reach. At the
   * stash it returns 'stash' for the router to open the stash's screen (052).
   */
  interact(sim: SimState): 'stash' | null {
    const diagram = diagramInReach(sim);
    const altar = altarInReach(sim);
    if (diagram) this.restore.open(diagram.node);
    // An altar's offering (034): only once its boss has fallen (a dim altar does nothing).
    else if (altar && altarState(sim, altar.id) !== 'dim') this.offering.open(altar.id);
    else if (claimedPylonInReach(sim)) this.pylon.open();
    // With two or more destinations, the waystone offers them by name (032; 072: woken return stones too); with one, the sim travels.
    else if (fixtureInReach(sim, 'waystone') && travelDestinations(sim).length >= 2) this.waystone.open();
    // 072: a woken return stone offers the way home.
    else if (usableStoneInReach(sim)) this.stone.open();
    else if (fixtureInReach(sim, 'stash')) return 'stash';
    else if (fixtureInReach(sim, 'bench') && !this.bench.isOpen) this.bench.open();
    return null;
  }

  /** A click on a row sends its choice for the next tick. Returns whether it hit a row. */
  click(controls: Controls, x: number, y: number): boolean {
    const p = this.pylon.valueAt(x, y);
    const gear = this.bench.click(x, y);
    const w = this.waystone.valueAt(x, y);
    const home = this.stone.valueAt(x, y);
    const restore = this.restore.restoreAt(x, y);
    const summon = this.offering.restoreAt(x, y);
    if (summon) {
      controls.menus.summon(summon);
      this.offering.flash();
      this.offering.close();
      return true;
    }
    if (restore) {
      controls.menus.restore(restore);
      this.restore.flash();
      this.restore.close();
      return true;
    }
    // The gear panel (036) stays open after a click, so pieces can be swapped and compared.
    if (gear) {
      if (gear.kind === 'identify') controls.menus.identify();
      else if (gear.kind === 'equip') controls.menus.equip({ id: gear.id });
      return true;
    }
    if (w) controls.menus.travel(w.site);
    else if (home) controls.menus.travel(FOUNDRY_ROOM);
    else if (typeof p === 'object') controls.menus.travel(p.stone);
    else if (p) controls.menus.pylon(p);
    else return false;
    for (const m of this.menus) m.flashAt(x, y);
    this.close();
    return true;
  }

  /** Refreshes the rows; walking out of reach closes a menu. */
  update(sim: SimState): void {
    // The restore panel closes once its diagram is out of reach or gone (restored).
    if (this.restore.isOpen && diagramInReach(sim)?.node !== this.restore.nodeId) this.restore.close();
    this.restore.update(sim);
    if (this.offering.isOpen && altarInReach(sim)?.id !== this.offering.nodeId) this.offering.close();
    this.offering.update(sim);
    if (this.pylon.isOpen && !claimedPylonInReach(sim)) this.pylon.close();
    const held = Object.values(sim.inventory).reduce((a, b) => a + b, 0);
    const pylonRows: Choice<PylonChoice>[] = [
      { icons: [SITE_ICONS.stash], text: PYLON_MENU_TEXT.deposit(held), value: 'deposit' },
      { icons: [SITE_ICONS.travel], text: PYLON_MENU_TEXT.travel, value: 'travel' },
      // 072: and every woken return stone, by its arena (looked up only while the menu is open).
      ...(this.pylon.isOpen ? travelDestinations(sim).filter((d) => d.kind === 'stone') : []).map((d) => ({ icons: [SITE_ICONS.travel], text: travelText(d.name), value: { stone: d.id } })),
    ];
    this.pylon.show(pylonRows);
    if (this.bench.isOpen && !fixtureInReach(sim, 'bench')) this.bench.close();
    // 047: the bench's Stages panel is gone; tagged rounds are crafted in the crafting menu (C).
    this.bench.update(sim);
    if (this.waystone.isOpen && !fixtureInReach(sim, 'waystone')) this.waystone.close();
    this.waystone.show((this.waystone.isOpen ? travelDestinations(sim) : []).map((d) => ({ icons: [SITE_ICONS.travel], text: travelText(d.name), value: { site: d.id } })));
    if (this.stone.isOpen && !usableStoneInReach(sim)) this.stone.close();
    this.stone.show([{ icons: [SITE_ICONS.travel], text: PYLON_MENU_TEXT.travel, value: 'home' }]);
  }

  /** For the test hook: a site menu is open, and the waystone menu's rows as drawn (032; 072: and the pylon's and a return stone's), each row's text and box, or null while it's shut. */
  get ui(): SiteUiState {
    return {
      siteOpen: this.isOpen,
      waystone: this.waystone.isOpen ? this.waystone.rowsShown : null,
      pylonMenu: this.pylon.isOpen ? this.pylon.rowsShown : null,
      returnMenu: this.stone.isOpen ? this.stone.rowsShown : null,
      restorePanel: this.restore.state, altarPanel: this.offering.state, gearPanel: this.bench.state };
  }
}
