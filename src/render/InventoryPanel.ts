import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { DEPTHS, SPRITES } from '../data/assets';
import { FOOTER_LINES, INVENTORY_GRID } from '../data/hudPanels';
import { pieceDef } from '../data/pieces';
import { usableItem } from '../sim/hotbar';
import type { HopperAmount } from '../sim/input';
import type { CrateState, HopperState } from '../sim/pieces';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { cellAt, inventoryLayout, type GridLayout } from './inventoryLayout';
import { containerSlots, gearLine, inventorySlots, type GridAction, type Held, type InventoryShown, type ShownSlot, type SlotShown } from './inventoryRows';

export type { InventoryShown } from './inventoryRows';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import { addVector, showFrame } from './vector/textures';

/** One drawn cell: its frame, icon, count and warning mark. */
interface CellView {
  frame: GameObjects.Image;
  icon: GameObjects.Image;
  count: TextLine;
  warn: GameObjects.Image;
}

/** Where a press began: a grid slot or a container slot (by index into its slots), with the modifiers held. */
interface Press {
  from: 'grid' | 'container';
  index: number;
  amount: HopperAmount;
}

const NO_BOX: ScreenBox = { x: 0, y: 0, w: 0, h: 0 };

// The grid inventory (047, note 12): I or Tab opens it alone; E at a hopper or crate opens its screen, the container's
// own slots on top and the grid underneath. Each slot is one stack (047.1), marked while any of it is at risk (031);
// the grid scrolls by rows past 8×5 (047.2), and Sort orders it. With a container open, a click moves one, Shift+click
// half and Ctrl+click the whole stack, either way; a stack dragged onto the carried bar goes on that slot. The world
// keeps running. Clicks arrive from the router; the moves go to the sim as commands.
export class InventoryPanel {
  private mode: InventoryShown['mode'] = null;
  private containerId: number | null = null;
  private scrollRow = 0;
  private slots: ShownSlot[] = [];
  private boxSlots: ShownSlot[] = [];
  private footer: string[] = [];
  private layout: GridLayout = inventoryLayout(false);
  private press: Press | null = null;
  private readonly back: GameObjects.Graphics;
  private readonly title: GameObjects.Image;
  private readonly titleText: TextLine;
  private readonly sortText: TextLine;
  private readonly name: TextLine;
  private readonly footLines: TextLine[];
  private readonly cells: CellView[];
  private readonly boxCells: CellView[];

  constructor(scene: Scene) {
    const G = INVENTORY_GRID;
    const text = (style: 'body' | 'display' | 'title' | 'count' = 'body') => new TextLine(scene, 0, 0, DEPTHS.menu + 2, false, style);
    this.back = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu);
    this.title = addVector(scene, 0, 0, SPRITES.inventoryTitle).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu);
    this.titleText = text('title').set(G.title.text);
    this.sortText = text().set(G.sort.text);
    this.name = text('display');
    this.footLines = Array.from({ length: FOOTER_LINES }, () => text().setFill(G.colors.dim).setAlpha(G.dimAlpha));
    const cell = (): CellView => ({
      frame: addVector(scene, 0, 0, SPRITES.hudAmmoCell).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 1),
      icon: addVector(scene, 0, 0, SPRITES.iconArrow).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 2),
      count: text('count'),
      warn: addVector(scene, 0, 0, SPRITES.hudWarn).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 3),
    });
    this.cells = Array.from({ length: G.cols * G.rows }, cell);
    this.boxCells = Array.from({ length: G.container.cols }, cell);
    this.draw();
  }

  get isOpen(): boolean {
    return this.mode !== null;
  }

  /** The open hopper's or crate's piece id, or null (the plain inventory, or closed). */
  get container(): number | null {
    return this.containerId;
  }

  /** Opens the plain inventory (I or Tab), or closes the panel whatever it shows. */
  setOpen(open: boolean): void {
    this.mode = open ? 'bag' : null;
    this.containerId = null;
    this.press = null;
    this.layout = inventoryLayout(false);
    this.draw();
  }

  /** Opens a hopper's or crate's screen (047: E at it). */
  openContainer(kind: 'hopper' | 'crate', id: number): void {
    this.mode = kind;
    this.containerId = id;
    this.press = null;
    this.layout = inventoryLayout(true);
    this.draw();
  }

  close(): void {
    this.setOpen(false);
  }

  get shown(): InventoryShown {
    const G = INVENTORY_GRID;
    const first = this.scrollRow * G.cols;
    const open = this.isOpen;
    return {
      open,
      mode: this.mode,
      containerId: this.containerId,
      scroll: this.scrollRow,
      rows: this.rowCount(),
      slots: open ? this.layout.cells.flatMap((box, i) => this.shownSlot(this.slots[first + i], box, first + i)) : [],
      container: open && this.layout.container ? this.layout.container.cells.flatMap((box, i) => this.shownSlot(this.boxSlots[i], box, i)) : [],
      sort: open ? this.layout.sort : NO_BOX,
      footer: open ? this.footer.filter((l) => l !== '') : [],
      panel: open ? this.layout.panel : NO_BOX,
    };
  }

  private shownSlot(s: ShownSlot | undefined, box: ScreenBox, index: number): (SlotShown & { index: number })[] {
    if (!s) return [];
    const C = INVENTORY_GRID.cell;
    const view = this.cellViewAt(box);
    const countBox = { x: box.x + C.count.x, y: box.y + C.count.y, w: view?.count.width ?? 0, h: view?.count.lineHeight ?? 0 };
    const warnBox = s.atRisk > 0 ? { x: box.x + C.warn.x, y: box.y + C.warn.y, w: C.warn.w, h: C.warn.h } : null;
    return [{ ...box, index, itemId: s.itemId, name: s.name, count: s.count, atRisk: s.atRisk, countBox, warnBox }];
  }

  private cellViewAt(box: ScreenBox): CellView | undefined {
    const i = this.layout.cells.findIndex((c) => c.x === box.x && c.y === box.y);
    if (i >= 0) return this.cells[i];
    const k = this.layout.container?.cells.findIndex((c) => c.x === box.x && c.y === box.y) ?? -1;
    return k >= 0 ? this.boxCells[k] : undefined;
  }

  private rowCount(): number {
    return Math.max(1, Math.ceil(this.slots.length / INVENTORY_GRID.cols));
  }

  /** While open, a press on the panel or its title card is the panel's, never a shot (015). */
  overUi(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    const { panel, title } = this.layout;
    return x >= panel.x && x < panel.x + panel.w && y >= title.y && y < panel.y + panel.h;
  }

  /** Wheel notches over the open panel scroll the grid by rows (047.2). */
  scroll(steps: number): void {
    if (!this.isOpen || steps === 0) return;
    const max = Math.max(0, this.rowCount() - INVENTORY_GRID.rows);
    this.scrollRow = Math.min(max, Math.max(0, this.scrollRow + Math.sign(steps)));
    this.draw();
  }

  /** A press on the panel: on Sort, returns 'sort'; on a slot, remembers it for the release. */
  pressAt(x: number, y: number, amount: HopperAmount): 'sort' | null {
    this.press = null;
    if (!this.isOpen) return null;
    const S = this.layout.sort;
    if (x >= S.x && x < S.x + S.w && y >= S.y && y < S.y + S.h) return 'sort';
    const g = cellAt(this.layout.cells, x, y);
    const first = this.scrollRow * INVENTORY_GRID.cols;
    if (g >= 0 && this.slots[first + g]?.movable) this.press = { from: 'grid', index: first + g, amount };
    const c = this.layout.container ? cellAt(this.layout.container.cells, x, y) : -1;
    if (c >= 0 && this.boxSlots[c]) this.press = { from: 'container', index: c, amount };
    return null;
  }

  /**
   * The button came up: on the slot it went down on, with a hopper or crate open, the stack moves (one, half or the
   * stack, by the press's modifiers); over a carried bar slot (`carriedSlot`), a usable kind goes on it.
   */
  releaseAt(x: number, y: number, carriedSlot: number | null): GridAction | null {
    const press = this.press;
    this.press = null;
    if (!press || !this.isOpen) return null;
    if (press.from === 'grid') {
      const s = this.slots[press.index];
      if (!s) return null;
      if (carriedSlot !== null) return usableItem(s.itemId) ? { kind: 'assign', slot: carriedSlot, itemId: s.itemId } : null;
      const g = cellAt(this.layout.cells, x, y);
      if (g < 0 || this.scrollRow * INVENTORY_GRID.cols + g !== press.index || this.containerId === null) return null;
      return { kind: 'deposit', id: this.containerId, itemId: s.itemId, amount: press.amount, stack: s.count };
    }
    const s = this.boxSlots[press.index];
    const c = this.layout.container ? cellAt(this.layout.container.cells, x, y) : -1;
    if (!s || c !== press.index || this.containerId === null) return null;
    return { kind: 'withdraw', id: this.containerId, itemId: s.itemId, amount: press.amount, stack: s.count };
  }

  /**
   * A slot under a view point: a round's summary beside the panel (040); any other item's name over its slot (050,
   * A.14), in the grid or a hopper's or crate's own row.
   */
  tipAt(x: number, y: number): TipHit | null {
    if (!this.isOpen) return null;
    const g = cellAt(this.layout.cells, x, y);
    const c = g < 0 && this.layout.container ? cellAt(this.layout.container.cells, x, y) : -1;
    const s = g >= 0 ? this.slots[this.scrollRow * INVENTORY_GRID.cols + g] : this.boxSlots[c];
    const box = g >= 0 ? this.layout.cells[g] : this.layout.container?.cells[c];
    if (!s || !box) return null;
    if (AMMO[s.itemId]) return { source: { kind: 'round', id: s.itemId }, at: box, anchor: { box: this.layout.panel, prefer: ['right', 'left'] } };
    return { source: { kind: 'item', id: s.name }, at: box, anchor: { box, prefer: ['above', 'below'] } };
  }

  /** Reads the haul every frame (so the hook can report it); draws it while open. `container` is the open hopper or crate. */
  update(sim: Held, container?: HopperState | CrateState): void {
    this.slots = inventorySlots(sim);
    this.footer = [...INVENTORY_GRID.footer.text, gearLine(sim)];
    this.boxSlots = !container ? [] : container.kind === 'crate' ? containerSlots(container.contents) : container.item ? containerSlots({ [container.item]: container.count }) : [];
    // Fold any stacks past one row into the last cell (a hopper filled far past its line's cap), so nothing hides.
    const cols = INVENTORY_GRID.container.cols;
    if (this.boxSlots.length > cols) {
      const last = this.boxSlots.slice(cols - 1);
      const head = last[0];
      if (head) this.boxSlots = [...this.boxSlots.slice(0, cols - 1), { ...head, count: last.filter((s) => s.itemId === head.itemId).reduce((n, s) => n + s.count, 0) }];
    }
    this.scrollRow = Math.min(this.scrollRow, Math.max(0, this.rowCount() - INVENTORY_GRID.rows));
    this.draw();
  }

  private draw(): void {
    const G = INVENTORY_GRID;
    const L = this.layout;
    const open = this.isOpen;
    this.back.clear();
    for (const o of [this.back, this.title]) o.setVisible(open);
    for (const t of [this.titleText, this.sortText, this.name, ...this.footLines]) t.setVisible(open);
    if (!open) {
      for (const c of [...this.cells, ...this.boxCells]) this.drawCell(c, undefined, NO_BOX, false);
      return;
    }
    drawTablet(this.back, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    drawTablet(this.back, L.sort.x, L.sort.y, L.sort.w, L.sort.h);
    this.title.setPosition(L.title.x, L.title.y);
    this.titleText.moveTo(Math.round(L.title.x + (G.title.w - this.titleText.width) / 2), L.title.y + G.title.titleY);
    this.sortText.moveTo(Math.round(L.sort.x + (L.sort.w - this.sortText.width) / 2), L.sort.y + G.sort.textY);
    // The scroll bar: its track, and a thumb the shown rows' share of the grid long.
    const rows = this.rowCount();
    const thumb = Math.max(G.scroll.minThumb, Math.round((L.scroll.h * Math.min(rows, G.rows)) / rows));
    const at = rows > G.rows ? Math.round(((L.scroll.h - thumb) * this.scrollRow) / (rows - G.rows)) : 0;
    this.back.fillStyle(colorOf(G.scroll.track), G.scroll.trackAlpha).fillRect(L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h);
    this.back.fillStyle(colorOf(G.scroll.thumb), 1).fillRect(L.scroll.x, L.scroll.y + at, L.scroll.w, thumb);
    const first = this.scrollRow * G.cols;
    L.cells.forEach((box, i) => this.drawCell(this.cells[i], this.slots[first + i], box, true));
    this.boxCells.forEach((c, i) => this.drawCell(c, this.boxSlots[i], L.container?.cells[i] ?? NO_BOX, L.container !== null));
    this.name.setVisible(L.container !== null);
    if (L.container && this.mode !== 'bag') {
      const piece = this.mode === 'crate' ? 'crate' : 'hopper';
      this.name.set(pieceDef(piece).name).moveTo(L.container.name.x, L.container.name.y);
    }
    this.footLines.forEach((t, i) => {
      const line = this.footer[i] ?? '';
      const pos = L.footer[i];
      t.set(line).setVisible(line !== '');
      if (pos) t.moveTo(pos.x, pos.y);
    });
    // The gear line reads as safe (a death never takes identified gear).
    this.footLines[FOOTER_LINES - 1]?.setFill(G.colors.safe).setAlpha(1);
  }

  private drawCell(c: CellView | undefined, s: ShownSlot | undefined, box: ScreenBox, shown: boolean): void {
    if (!c) return;
    const C = INVENTORY_GRID.cell;
    c.frame.setVisible(shown).setPosition(box.x, box.y);
    const full = shown && s !== undefined;
    c.icon.setVisible(full);
    c.count.setVisible(full);
    c.warn.setVisible(full && (s?.atRisk ?? 0) > 0);
    if (!full || !s) return;
    showFrame(c.icon, s.icon).setOrigin(0).setPosition(box.x + C.icon.x, box.y + C.icon.y);
    c.count.set(String(s.count)).moveTo(box.x + C.count.x, box.y + C.count.y);
    c.count.setFill(s.atRisk > 0 ? INVENTORY_GRID.colors.risk : undefined);
    c.warn.setPosition(box.x + C.warn.x, box.y + C.warn.y);
  }
}
