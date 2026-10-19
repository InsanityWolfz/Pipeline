import type { Scene } from 'phaser';
import { UNIDENTIFIED_ARMOR } from '../data/armor';
import { SPRITES } from '../data/assets';
import { SITE_ICONS } from '../data/foundryAssets';
import { itemDef, ITEMS } from '../data/items';
import { claimedPylonInReach, claimedPylons, fixtureInReach } from '../sim/claims';
import { usableInReach } from '../sim/foundryUse';
import type { SimState } from '../sim/state';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';
import { pieceIcon } from './foundryLayout';
import { StagePanel, type StagePanelState } from './StagePanel';
import { stagePanelLayout } from './stagePanelLayout';
import { stagesKnown } from '../sim/stages';

type PylonChoice = 'deposit' | 'travel';
/** A stash row: one item's stack, or null for everything. */
type StashChoice = { itemId: string | null };
/** A bench row: identify everything carried, or wear (or take off) a piece. */
type BenchChoice = { identify: true } | { equip: number };
/** A sorter row: the item it sends out its side, or null to pass everything (015). */
type SorterChoice = { itemId: string | null };
/** A waystone row (032): the claimed site to travel to. */
type WaystoneChoice = { site: string };

// The claimed pylon's menu (send the haul home, travel to the foundry), the waystone's
// (travel to any claimed pylon, by landmark name, 032) and the
// stash's (take all, or one stack), opened by E beside them (009), and the
// identification bench's (identify all, wear or take off a piece) (010), and a
// sorter's (pick the item it sends out its side) (015).
export class SiteMenus {
  private readonly pylon: ChoiceMenu<PylonChoice>;
  private readonly stash: ChoiceMenu<StashChoice>;
  private readonly bench: ChoiceMenu<BenchChoice>;
  private readonly sorter: ChoiceMenu<SorterChoice>;
  private readonly waystone: ChoiceMenu<WaystoneChoice>;
  /** The bench's Stages panel (029), beside its rows once the shrine is claimed. */
  private readonly stages: StagePanel;
  /** The sorter whose menu is open. */
  private sorterId: number | null = null;

  constructor(scene: Scene) {
    this.pylon = new ChoiceMenu(scene);
    this.stash = new ChoiceMenu(scene);
    this.bench = new ChoiceMenu(scene);
    this.sorter = new ChoiceMenu(scene);
    this.waystone = new ChoiceMenu(scene);
    this.stages = new StagePanel(scene);
  }

  /** The bench's Stages panel as drawn (029). */
  get stagePanel(): StagePanelState {
    return this.stages.state;
  }

  private get menus(): readonly ChoiceMenu<unknown>[] {
    return [this.pylon, this.stash, this.bench, this.sorter, this.waystone];
  }

  get isOpen(): boolean {
    return this.menus.some((m) => m.isOpen);
  }

  overUi(x: number, y: number): boolean {
    return this.menus.some((m) => m.overUi(x, y)) || this.stages.overUi(x, y);
  }

  close(): void {
    for (const m of this.menus) m.close();
  }

  /** The cursor is at a screen point: the open menu lights the row under it (020). */
  pointAt(x: number, y: number): void {
    for (const m of this.menus) m.pointAt(x, y);
    this.stages.pointAt(x, y);
  }

  /** E was pressed: opens the menu of a sorter, a claimed pylon, the stash or the bench in reach. */
  interact(sim: SimState): void {
    const piece = usableInReach(sim);
    if (piece?.kind === 'sorter') {
      this.sorterId = piece.id;
      this.sorter.open();
    } else if (claimedPylonInReach(sim)) this.pylon.open();
    // With two or more claimed pylons, the waystone offers them by landmark name (032); with one, the sim travels.
    else if (fixtureInReach(sim, 'waystone') && claimedPylons(sim).length >= 2) this.waystone.open();
    else if (fixtureInReach(sim, 'stash')) this.stash.open();
    else if (fixtureInReach(sim, 'bench')) this.bench.open();
  }

  /** A click on a row sends its choice for the next tick. Returns whether it hit a row. */
  click(controls: Controls, x: number, y: number): boolean {
    const p = this.pylon.valueAt(x, y);
    const s = this.stash.valueAt(x, y);
    const b = this.bench.valueAt(x, y);
    const f = this.sorter.valueAt(x, y);
    const w = this.waystone.valueAt(x, y);
    const stage = this.stages.stageAt(x, y);
    if (stage) {
      controls.menus.applyStage(stage);
      // The bench stays open, so a stage can be applied again (029: any number of times).
      this.stages.flashAt(x, y);
      return true;
    }
    if (f && this.sorterId !== null) controls.menus.setFilter(this.sorterId, f.itemId);
    else if (w) controls.menus.travel(w.site);
    else if (p) controls.menus.pylon(p);
    else if (s) controls.menus.takeStash(s.itemId);
    else if (b && 'identify' in b) controls.menus.identify();
    else if (b) controls.menus.equip(b.equip);
    else return false;
    for (const m of this.menus) m.flashAt(x, y);
    this.close();
    return true;
  }

  /** Refreshes the rows; walking out of reach closes a menu. */
  update(sim: SimState): void {
    if (this.pylon.isOpen && !claimedPylonInReach(sim)) this.pylon.close();
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
    // Once the shrine is claimed, the Stages panel (029) sits beside the bench's rows, which move left to make room.
    const staged = this.bench.isOpen && stagesKnown(sim);
    this.bench.show(benchRows, staged && benchRows.length > 0 ? stagePanelLayout(benchRows.length).benchShift : 0);
    this.stages.show(staged ? benchRows.length : null, sim.inventory);
    if (this.sorter.isOpen && usableInReach(sim)?.id !== this.sorterId) this.sorter.close();
    const sorterRows: Choice<SorterChoice>[] = [
      { icons: [pieceIcon('sorter')], text: 'Clear', value: { itemId: null } },
      ...Object.keys(ITEMS).map((id) => ({ icons: [itemDef(id).icon], text: itemDef(id).name, value: { itemId: id } })),
    ];
    this.sorter.show(sorterRows);
    if (this.waystone.isOpen && !fixtureInReach(sim, 'waystone')) this.waystone.close();
    this.waystone.show(claimedPylons(sim).map(({ pylon }) => ({ icons: [SITE_ICONS.travel], text: `Travel to ${pylon.name}`, value: { site: pylon.site } })));
  }

  /** The waystone menu's rows as drawn (032), for the test hook: each row's text and box, or null while it's shut. */
  get waystoneRows(): { text: string; x: number; y: number; w: number; h: number }[] | null {
    return this.waystone.isOpen ? this.waystone.rowsShown : null;
  }
}
