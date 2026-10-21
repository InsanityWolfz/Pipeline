import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { DEPTHS, SPRITES } from '../data/assets';
import { INVENTORY_GRID } from '../data/hudPanels';
import { pieceDef } from '../data/pieces';
import { usableItem } from '../sim/hotbar';
import type { HopperAmount } from '../sim/input';
import type { CrateState, HopperState } from '../sim/pieces';
import type { SimState } from '../sim/state';
import type { ScreenBox } from './bottomHud';
import { drawCell, drawScrollBar, makeCell, type CellView } from './gridCells';
import { cellAt, inventoryLayout, type GridLayout } from './inventoryLayout';
import { containerSlots, gearLine, inventorySlots, type GridAction, type Held, type InventoryShown, type ShownSlot, type SlotShown } from './inventoryRows';

export type { InventoryShown } from './inventoryRows';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import { addVector } from './vector/textures';

/** Where a press began: a grid slot, a container slot or a stash slot (by index into its slots), with the modifiers held. */
interface Press {
  from: 'grid' | 'container' | 'stash';
  index: number;
  amount: HopperAmount;
}

const NO_BOX: ScreenBox = { x: 0, y: 0, w: 0, h: 0 };
const G = INVENTORY_GRID;

/** A mode's layout. */
const layoutOf = (mode: InventoryShown['mode']): GridLayout => inventoryLayout(mode === 'hopper' || mode === 'crate' ? 'container' : mode === 'stash' ? 'stash' : 'bag');

// The grid inventory (047, note 12): I or Tab opens it alone; E at a hopper or crate opens its screen, the container's
// own slots on top and the grid underneath; E at the stash (052) opens its screen, the stash's own scrolling grid on
// top. Each slot is one stack (047.1), marked while any of it is at risk (031); the grid scrolls by rows past 8×5
// (047.2), and Sort orders it. With a container or the stash open, a click moves one, Shift+click half and Ctrl+click
// the whole stack, either way; a stack dragged onto the carried bar goes on that slot. The world keeps running. Clicks
// arrive from the router; the moves go to the sim as commands.
export class InventoryPanel {
  private mode: InventoryShown['mode'] = null;
  private containerId: number | null = null;
  private scrollRow = 0;
  private stashRow = 0;
  private slots: ShownSlot[] = [];
  private boxSlots: ShownSlot[] = [];
  private stashSlots: ShownSlot[] = [];
  private footer: string[] = [];
  private layout: GridLayout = layoutOf(null);
  private press: Press | null = null;
  private readonly back: GameObjects.Graphics;
  private readonly title: GameObjects.Image;
  private readonly titleText: TextLine;
  private readonly sortText: TextLine;
  private readonly name: TextLine;
  private readonly invName: TextLine;
  private readonly footLines: TextLine[];
  private readonly cells: CellView[];
  private readonly boxCells: CellView[];
  private readonly stashCells: CellView[];

  constructor(scene: Scene) {
    const text = (style: 'body' | 'display' | 'title' = 'body') => new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, style);
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu);
    this.title = addVector(scene, 0, 0, SPRITES.inventoryTitle).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu);
    this.titleText = text('title');
    this.sortText = text().set(G.sort.text);
    this.name = text('display');
    this.invName = text('display').set(G.stash.invName);
    this.footLines = Array.from({ length: G.footer.text.length + 1 }, () => text().setFill(G.colors.dim).setAlpha(G.dimAlpha));
    this.cells = Array.from({ length: G.cols * G.rows }, () => makeCell(scene));
    this.boxCells = Array.from({ length: G.container.cols }, () => makeCell(scene));
    this.stashCells = Array.from({ length: G.cols * G.stash.rows }, () => makeCell(scene));
    this.draw();
  }

  get isOpen(): boolean {
    return this.mode !== null;
  }

  /** The open hopper's or crate's piece id, or null (the plain inventory, the stash's screen, or closed). */
  get container(): number | null {
    return this.containerId;
  }

  /** The stash's screen is open (052). */
  get stashOpen(): boolean {
    return this.mode === 'stash';
  }

  private openAs(mode: InventoryShown['mode'], id: number | null = null): void {
    this.mode = mode;
    this.containerId = id;
    this.press = null;
    this.layout = layoutOf(mode);
    this.draw();
  }

  /** Opens the plain inventory (I or Tab), or closes the panel whatever it shows. */
  setOpen(open: boolean): void {
    this.openAs(open ? 'bag' : null);
  }

  /** Opens a hopper's or crate's screen (047: E at it). */
  openContainer(kind: 'hopper' | 'crate', id: number): void {
    this.openAs(kind, id);
  }

  /** Opens the stash's screen (052: E at it). */
  openStash(): void {
    this.openAs('stash');
  }

  close(): void {
    this.setOpen(false);
  }

  get shown(): InventoryShown {
    const open = this.isOpen;
    const first = this.scrollRow * G.cols;
    const stashFirst = this.stashRow * G.cols;
    const L = this.layout;
    return {
      open,
      mode: this.mode,
      containerId: this.containerId,
      scroll: this.scrollRow,
      rows: this.rowCount(),
      slots: open ? L.cells.flatMap((box, i) => this.shownSlot(this.slots[first + i], box, first + i, this.cells[i])) : [],
      container: open && L.container ? L.container.cells.flatMap((box, i) => this.shownSlot(this.boxSlots[i], box, i, this.boxCells[i])) : [],
      stash: open && L.stash ? L.stash.cells.flatMap((box, i) => this.shownSlot(this.stashSlots[stashFirst + i], box, stashFirst + i, this.stashCells[i])) : [],
      stashScroll: this.stashRow,
      stashRows: this.stashRowCount(),
      sort: open ? L.sort : NO_BOX,
      footer: open ? this.footer.filter((l, i) => l !== '' && i < L.footer.length) : [],
      panel: open ? L.panel : NO_BOX,
    };
  }

  private shownSlot(s: ShownSlot | undefined, box: ScreenBox, index: number, view: CellView | undefined): (SlotShown & { index: number })[] {
    if (!s) return [];
    const C = G.cell;
    const countBox = { x: box.x + C.count.x, y: box.y + C.count.y, w: view?.count.width ?? 0, h: view?.count.lineHeight ?? 0 };
    const warnBox = s.atRisk > 0 ? { x: box.x + C.warn.x, y: box.y + C.warn.y, w: C.warn.w, h: C.warn.h } : null;
    return [{ ...box, index, itemId: s.itemId, name: s.name, count: s.count, atRisk: s.atRisk, countBox, warnBox }];
  }

  /** The inventory grid's rows shown at once: 5, or 4 on the stash's screen (052). */
  private shownRows(): number {
    return this.mode === 'stash' ? G.stash.invRows : G.rows;
  }

  private rowCount(): number {
    return Math.max(1, Math.ceil(this.slots.length / G.cols));
  }

  private stashRowCount(): number {
    return Math.max(1, Math.ceil(this.stashSlots.length / G.cols));
  }

  /** While open, a press on the panel or its title card is the panel's, never a shot (015). */
  overUi(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    const { panel, title } = this.layout;
    return x >= panel.x && x < panel.x + panel.w && y >= title.y && y < panel.y + panel.h;
  }

  /** Wheel notches over the open panel scroll the grid by rows (047.2); on the stash's screen, over its grid, the stash's (052). */
  scroll(steps: number, at?: { x: number; y: number }): void {
    if (!this.isOpen || steps === 0) return;
    const dir = Math.sign(steps);
    if (this.layout.stash && at && at.y < this.layout.sort.y) this.stashRow = Math.min(Math.max(0, this.stashRowCount() - G.stash.rows), Math.max(0, this.stashRow + dir));
    else this.scrollRow = Math.min(Math.max(0, this.rowCount() - this.shownRows()), Math.max(0, this.scrollRow + dir));
    this.draw();
  }

  /** A press on the panel: on Sort, returns 'sort'; on a slot, remembers it for the release. */
  pressAt(x: number, y: number, amount: HopperAmount): 'sort' | null {
    this.press = null;
    if (!this.isOpen) return null;
    const L = this.layout;
    const S = L.sort;
    if (x >= S.x && x < S.x + S.w && y >= S.y && y < S.y + S.h) return 'sort';
    const g = cellAt(L.cells, x, y);
    const first = this.scrollRow * G.cols;
    if (g >= 0 && this.slots[first + g]?.movable) this.press = { from: 'grid', index: first + g, amount };
    const c = L.container ? cellAt(L.container.cells, x, y) : -1;
    if (c >= 0 && this.boxSlots[c]) this.press = { from: 'container', index: c, amount };
    const k = L.stash ? cellAt(L.stash.cells, x, y) : -1;
    if (k >= 0 && this.stashSlots[this.stashRow * G.cols + k]) this.press = { from: 'stash', index: this.stashRow * G.cols + k, amount };
    return null;
  }

  /**
   * The button came up: on the slot it went down on, with a hopper, crate or the stash open, the stack moves (one, half
   * or the stack, by the press's modifiers); over a carried bar slot (`carriedSlot`), a usable kind goes on it.
   */
  releaseAt(x: number, y: number, carriedSlot: number | null): GridAction | null {
    const press = this.press;
    this.press = null;
    if (!press || !this.isOpen) return null;
    const L = this.layout;
    if (press.from === 'grid') {
      const s = this.slots[press.index];
      if (!s) return null;
      if (carriedSlot !== null) return usableItem(s.itemId) ? { kind: 'assign', slot: carriedSlot, itemId: s.itemId } : null;
      const g = cellAt(L.cells, x, y);
      if (g < 0 || this.scrollRow * G.cols + g !== press.index) return null;
      if (this.mode === 'stash') return { kind: 'stashPut', itemId: s.itemId, amount: press.amount, stack: s.count };
      if (this.containerId === null) return null;
      return { kind: 'deposit', id: this.containerId, itemId: s.itemId, amount: press.amount, stack: s.count };
    }
    if (press.from === 'stash') {
      const s = this.stashSlots[press.index];
      const k = L.stash ? cellAt(L.stash.cells, x, y) : -1;
      if (!s || this.stashRow * G.cols + k !== press.index || k < 0) return null;
      return { kind: 'stashTake', itemId: s.itemId, amount: press.amount, stack: s.count };
    }
    const s = this.boxSlots[press.index];
    const c = L.container ? cellAt(L.container.cells, x, y) : -1;
    if (!s || c !== press.index || this.containerId === null) return null;
    return { kind: 'withdraw', id: this.containerId, itemId: s.itemId, amount: press.amount, stack: s.count };
  }

  /** A round's slot under a view point (040: its summary beside the panel). */
  tipAt(x: number, y: number): TipHit | null {
    if (!this.isOpen) return null;
    const g = cellAt(this.layout.cells, x, y);
    const s = g >= 0 ? this.slots[this.scrollRow * G.cols + g] : undefined;
    const box = this.layout.cells[g];
    if (!s || !box || !AMMO[s.itemId]) return null;
    return { source: { kind: 'round', id: s.itemId }, at: box, anchor: { box: this.layout.panel, prefer: ['right', 'left'] } };
  }

  /** Reads the haul (and the stash) every frame, so the hook can report it; draws it while open. `container` is the open hopper or crate. */
  update(sim: Held & Pick<SimState, 'stash'>, container?: HopperState | CrateState): void {
    this.slots = inventorySlots(sim);
    this.stashSlots = containerSlots(sim.stash);
    this.footer = [...G.footer.text, gearLine(sim)];
    this.boxSlots = !container ? [] : container.kind === 'crate' ? containerSlots(container.contents) : container.item ? containerSlots({ [container.item]: container.count }) : [];
    // Fold any stacks past one row into the last cell (a hopper filled far past its line's cap), so nothing hides.
    const cols = G.container.cols;
    if (this.boxSlots.length > cols) {
      const last = this.boxSlots.slice(cols - 1);
      const head = last[0];
      if (head) this.boxSlots = [...this.boxSlots.slice(0, cols - 1), { ...head, count: last.filter((s) => s.itemId === head.itemId).reduce((n, s) => n + s.count, 0) }];
    }
    this.scrollRow = Math.min(this.scrollRow, Math.max(0, this.rowCount() - this.shownRows()));
    this.stashRow = Math.min(this.stashRow, Math.max(0, this.stashRowCount() - G.stash.rows));
    this.draw();
  }

  private draw(): void {
    const L = this.layout;
    const open = this.isOpen;
    this.back.clear();
    for (const o of [this.back, this.title]) o.setVisible(open);
    for (const t of [this.titleText, this.sortText, this.name, this.invName, ...this.footLines]) t.setVisible(open);
    if (!open) {
      for (const c of [...this.cells, ...this.boxCells, ...this.stashCells]) drawCell(c, undefined, NO_BOX, false);
      return;
    }
    drawTablet(this.back, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    drawTablet(this.back, L.sort.x, L.sort.y, L.sort.w, L.sort.h);
    this.title.setPosition(L.title.x, L.title.y);
    this.titleText.set(this.mode === 'stash' ? G.stash.title : G.title.text);
    this.titleText.moveTo(Math.round(L.title.x + (G.title.w - this.titleText.width) / 2), L.title.y + G.title.titleY);
    this.sortText.moveTo(Math.round(L.sort.x + (L.sort.w - this.sortText.width) / 2), L.sort.y + G.sort.textY);
    drawScrollBar(this.back, L.scroll, this.rowCount(), this.shownRows(), this.scrollRow);
    const first = this.scrollRow * G.cols;
    this.cells.forEach((c, i) => drawCell(c, this.slots[first + i], L.cells[i] ?? NO_BOX, i < L.cells.length));
    this.boxCells.forEach((c, i) => drawCell(c, this.boxSlots[i], L.container?.cells[i] ?? NO_BOX, L.container !== null));
    const stashFirst = this.stashRow * G.cols;
    this.stashCells.forEach((c, i) => drawCell(c, this.stashSlots[stashFirst + i], L.stash?.cells[i] ?? NO_BOX, L.stash !== null));
    if (L.stash) drawScrollBar(this.back, L.stash.scroll, this.stashRowCount(), G.stash.rows, this.stashRow);
    const header = L.container;
    this.name.setVisible(header !== null);
    if (header) this.name.set(pieceDef(this.mode === 'crate' ? 'crate' : 'hopper').name).moveTo(header.name.x, header.name.y);
    this.invName.setVisible(L.invName !== null);
    if (L.invName) this.invName.moveTo(L.invName.x, L.invName.y);
    this.footLines.forEach((t, i) => {
      const line = this.footer[i] ?? '';
      const pos = L.footer[i];
      t.set(line).setVisible(line !== '' && pos !== undefined);
      if (pos) t.moveTo(pos.x, pos.y);
    });
    // The gear line reads as safe (a death never takes identified gear).
    this.footLines[this.footLines.length - 1]?.setFill(G.colors.safe).setAlpha(1);
  }
}
