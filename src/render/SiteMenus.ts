import type { Scene } from 'phaser';
import { UNIDENTIFIED_ARMOR } from '../data/armor';
import { SPRITES } from '../data/assets';
import { SITE_ICONS } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { fixtureInReach, isClaimed, pylonInReach } from '../sim/claims';
import type { SimState } from '../sim/state';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';

type PylonChoice = 'deposit' | 'travel';
/** A stash row: one item's stack, or null for everything. */
type StashChoice = { itemId: string | null };
/** A bench row: identify everything carried, or wear (or take off) a piece. */
type BenchChoice = { identify: true } | { equip: number };

// The claimed pylon's menu (send the haul home, travel to the foundry) and the
// stash's (take all, or one stack), opened by E beside them (009), and the
// identification bench's (identify all, wear or take off a piece) (010).
export class SiteMenus {
  private readonly pylon: ChoiceMenu<PylonChoice>;
  private readonly stash: ChoiceMenu<StashChoice>;
  private readonly bench: ChoiceMenu<BenchChoice>;

  constructor(scene: Scene) {
    this.pylon = new ChoiceMenu(scene);
    this.stash = new ChoiceMenu(scene);
    this.bench = new ChoiceMenu(scene);
  }

  get isOpen(): boolean {
    return this.pylon.isOpen || this.stash.isOpen || this.bench.isOpen;
  }

  overUi(x: number, y: number): boolean {
    return this.pylon.overUi(x, y) || this.stash.overUi(x, y) || this.bench.overUi(x, y);
  }

  close(): void {
    this.pylon.close();
    this.stash.close();
    this.bench.close();
  }

  /** E was pressed: opens the menu of a claimed pylon or the stash in reach. */
  interact(sim: SimState): void {
    if (pylonInReach(sim) && isClaimed(sim, sim.roomId)) this.pylon.open();
    else if (fixtureInReach(sim, 'stash')) this.stash.open();
    else if (fixtureInReach(sim, 'bench')) this.bench.open();
  }

  /** A click on a row sends its choice for the next tick. Returns whether it hit a row. */
  click(controls: Controls, x: number, y: number): boolean {
    const p = this.pylon.valueAt(x, y);
    const s = this.stash.valueAt(x, y);
    const b = this.bench.valueAt(x, y);
    if (p) controls.menus.pylon(p);
    else if (s) controls.menus.takeStash(s.itemId);
    else if (b && 'identify' in b) controls.menus.identify();
    else if (b) controls.menus.equip(b.equip);
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
      { icons: [SITE_ICONS.stash], text: `Send haul home (${held})`, value: 'deposit' },
      { icons: [SITE_ICONS.travel], text: 'Travel to foundry', value: 'travel' },
    ];
    this.pylon.show(pylonRows);
    const stacks = Object.keys(ITEMS).filter((id) => (sim.stash[id] ?? 0) > 0);
    const total = stacks.reduce((n, id) => n + (sim.stash[id] ?? 0), 0);
    const stashRows: Choice<StashChoice>[] =
      total > 0
        ? [
            { icons: [SITE_ICONS.stash], text: `Take all (${total})`, value: { itemId: null } },
            ...stacks.map((id) => ({ icons: [itemDef(id).icon], text: `${itemDef(id).name} ${sim.stash[id] ?? 0}`, value: { itemId: id } })),
          ]
        : [];
    this.stash.show(stashRows);
    if (this.bench.isOpen && !fixtureInReach(sim, 'bench')) this.bench.close();
    const unidentified = sim.inventory[UNIDENTIFIED_ARMOR] ?? 0;
    const benchRows: Choice<BenchChoice>[] = [
      ...(unidentified > 0
        ? [{ icons: [SPRITES.emblemIdentify], text: `Identify all (${unidentified})`, value: { identify: true as const } }]
        : []),
      // Each piece: its name, weight and armor; the worn one says so, and clicking it takes it off.
      ...sim.armor.map((a) => ({
        icons: [a.weight === 'heavy' ? SPRITES.iconArmorHeavy : SPRITES.iconArmorLight],
        text: `${a.name} ${a.weight} ${a.armor}${a.id === sim.equipped ? ' worn' : ''}`,
        value: { equip: a.id },
      })),
    ];
    this.bench.show(benchRows);
  }
}
