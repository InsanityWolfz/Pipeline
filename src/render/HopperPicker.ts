import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { count, type Inventory } from '../sim/inventory';
import type { HopperState } from '../sim/pieces';
import { drawTablet } from './tablet';
import { inRect, pickerEntries, pickerRows, pieceIcon, type PickerEntry } from './foundryLayout';
import { flashRow, RowHover } from './menuFeedback';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

// The hopper menu: opened by E next to a hopper. A filled hopper offers to take
// some out, and to put in more of the same; an empty one lists every held item to
// put in. Clicking a row moves one, Shift+click half, Ctrl+click all (022), with a
// hint line under the rows saying so. It stays open for the next click, and the
// world keeps running.
export class HopperPicker {
  private readonly scene: Scene;
  private rows: { entry: PickerEntry; images: GameObjects.Image[]; count: TextLine }[] = [];
  private entries: PickerEntry[] = [];
  private readonly panel: GameObjects.Graphics;
  private readonly hover: RowHover;
  private readonly hint: TextLine;
  /** The hopper's piece id while open. */
  hopperId: number | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
    this.hover = new RowHover(scene);
    this.hint = new TextLine(scene, 0, 0, DEPTHS.menu + 1).set(PICKER_LAYOUT.hint.text).setVisible(false);
  }

  /** The hint line's text while it shows, else null (for the test hook). */
  get hintShown(): string | null {
    return this.isOpen && this.entries.length > 0 ? PICKER_LAYOUT.hint.text : null;
  }

  get isOpen(): boolean {
    return this.hopperId !== null;
  }

  open(hopperId: number): void {
    this.hopperId = hopperId;
  }

  close(): void {
    this.hopperId = null;
    this.rebuild([]);
  }

  /** True if a screen point is over a row. */
  overUi(x: number, y: number): boolean {
    return this.isOpen && pickerRows(this.entries).some((r) => inRect(r, x, y));
  }

  /** The cursor is at a screen point (020): its row lights, with the hover sound on a new row. */
  pointAt(x: number, y: number): void {
    const i = this.isOpen ? pickerRows(this.entries).findIndex((r) => inRect(r, x, y)) : -1;
    if (!this.hover.set(i)) return;
    for (const [k, r] of this.rows.entries()) r.images[0]?.setFrame(this.hover.frame(k));
  }

  /** Flashes the row under a screen point, as it's pressed. */
  flashAt(x: number, y: number): void {
    const r = this.isOpen ? pickerRows(this.entries).find((rect) => inRect(rect, x, y)) : undefined;
    if (r) flashRow(this.scene, r.x, r.y);
  }

  /** The row under a screen point, if the menu is open. */
  entryAt(x: number, y: number): PickerEntry | undefined {
    const row = this.isOpen ? pickerRows(this.entries).find((r) => inRect(r, x, y)) : undefined;
    return row ? { action: row.action, itemId: row.itemId } : undefined;
  }

  /** Refreshes the rows from the hopper and the inventory while open. */
  update(inventory: Inventory, hopper: HopperState | undefined): void {
    if (!this.isOpen || !hopper) return;
    const entries = pickerEntries(hopper, inventory);
    const key = (es: PickerEntry[]): string => es.map((e) => `${e.action}:${e.itemId}`).join();
    if (key(entries) !== key(this.entries)) this.rebuild(entries);
    for (const r of this.rows) r.count.set(String(r.entry.action === 'take' ? hopper.count : count(inventory, r.entry.itemId)));
  }

  private rebuild(entries: PickerEntry[]): void {
    for (const r of this.rows) {
      for (const o of r.images) o.destroy();
      r.count.destroy();
    }
    this.entries = entries;
    const L = PICKER_LAYOUT;
    const rects = pickerRows(entries);
    this.drawPanel(rects);
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
      o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    const add = (x: number, y: number, frame: string, depth: number): GameObjects.Image =>
      fixed(addVector(this.scene, x, y, frame), depth);
    this.rows = rects.map((r) => {
      const shift = r.action === 'take' ? L.takeShift : 0;
      const images = [add(r.x, r.y, SPRITES.craftRow, DEPTHS.menu)];
      if (r.action === 'take') images.push(add(r.x + L.icon.x, r.y + L.icon.y, pieceIcon('hopper'), DEPTHS.menu + 1));
      images.push(add(r.x + L.icon.x + shift, r.y + L.icon.y, itemDef(r.itemId).icon, DEPTHS.menu + 1));
      const text = new TextLine(this.scene, r.x + L.count.x + shift, r.y + L.count.y, DEPTHS.menu + 1, false, 'count');
      return { entry: { action: r.action, itemId: r.itemId }, images, count: text };
    });
  }

  private drawPanel(rects: readonly { x: number; y: number; w: number; h: number }[]): void {
    const L = PICKER_LAYOUT;
    const first = rects[0];
    const last = rects[rects.length - 1];
    this.panel.clear();
    this.hint.setVisible(false);
    if (!first || !last) return;
    const hintTop = last.y + last.h + L.hint.gap;
    this.hint.moveTo(Math.round(first.x + (first.w - this.hint.width) / 2), hintTop).setVisible(true);
    const x = first.x - L.pad;
    const y = first.y - L.pad;
    const w = first.w + 2 * L.pad;
    const h = hintTop + this.hint.lineHeight - first.y + 2 * L.pad;
    drawTablet(this.panel, x, y, w, h);
  }
}
