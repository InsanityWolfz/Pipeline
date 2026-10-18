import type { Scene } from 'phaser';
import { SITE_ICONS } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { fixtureInReach, isClaimed, pylonInReach } from '../sim/claims';
import type { SimState } from '../sim/state';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';

type PylonChoice = 'deposit' | 'travel';
/** A stash row: one item's stack, or null for everything. */
type StashChoice = { itemId: string | null };

// The claimed pylon's menu (send the haul home, travel to the foundry) and the
// stash's (take all, or one stack), opened by E beside them (009).
export class SiteMenus {
  private readonly pylon: ChoiceMenu<PylonChoice>;
  private readonly stash: ChoiceMenu<StashChoice>;

  constructor(scene: Scene) {
    this.pylon = new ChoiceMenu(scene);
    this.stash = new ChoiceMenu(scene);
  }

  get isOpen(): boolean {
    return this.pylon.isOpen || this.stash.isOpen;
  }

  overUi(x: number, y: number): boolean {
    return this.pylon.overUi(x, y) || this.stash.overUi(x, y);
  }

  close(): void {
    this.pylon.close();
    this.stash.close();
  }

  /** E was pressed: opens the menu of a claimed pylon or the stash in reach. */
  interact(sim: SimState): void {
    if (pylonInReach(sim) && isClaimed(sim, sim.roomId)) this.pylon.open();
    else if (fixtureInReach(sim, 'stash')) this.stash.open();
  }

  /** A click on a row sends its choice for the next tick. Returns whether it hit a row. */
  click(controls: Controls, x: number, y: number): boolean {
    const p = this.pylon.valueAt(x, y);
    const s = this.stash.valueAt(x, y);
    if (p) controls.requestPylon(p);
    else if (s) controls.requestTakeStash(s.itemId);
    else return false;
    this.close();
    return true;
  }

  /** Refreshes the rows; walking out of reach closes a menu. */
  update(sim: SimState): void {
    if (this.pylon.isOpen && !(pylonInReach(sim) && isClaimed(sim, sim.roomId))) this.pylon.close();
    if (this.stash.isOpen && !fixtureInReach(sim, 'stash')) this.stash.close();
    const held = Object.values(sim.inventory).reduce((a, b) => a + b, 0);
    const pylonRows: Choice<PylonChoice>[] = [
      { icons: [SITE_ICONS.stash], text: String(held), value: 'deposit' },
      { icons: [SITE_ICONS.travel], text: '', value: 'travel' },
    ];
    this.pylon.show(pylonRows);
    const stacks = Object.keys(ITEMS).filter((id) => (sim.stash[id] ?? 0) > 0);
    const total = stacks.reduce((n, id) => n + (sim.stash[id] ?? 0), 0);
    const stashRows: Choice<StashChoice>[] =
      total > 0
        ? [
            { icons: [SITE_ICONS.stash], text: String(total), value: { itemId: null } },
            ...stacks.map((id) => ({ icons: [itemDef(id).icon], text: String(sim.stash[id] ?? 0), value: { itemId: id } })),
          ]
        : [];
    this.stash.show(stashRows);
  }
}
