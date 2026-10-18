import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { count, type Inventory } from '../sim/inventory';
import type { HopperState } from '../sim/pieces';
import { colorOf } from './color';
import { inRect, pickerEntries, pickerRows, pieceIcon, type PickerEntry } from './foundryLayout';
import { GlyphLine } from './glyphLine';

// The hopper menu: opened by E next to a hopper. A filled hopper offers to take
// everything out, and to put in more of the same; an empty one lists every held
// item to put in. Clicking a row does it. The world keeps running.
export class HopperPicker {
  private readonly scene: Scene;
  private rows: { entry: PickerEntry; images: GameObjects.Image[]; count: GlyphLine }[] = [];
  private entries: PickerEntry[] = [];
  private readonly panel: GameObjects.Graphics;
  /** The hopper's piece id while open. */
  hopperId: number | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
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
      r.count.set('');
    }
    this.entries = entries;
    const L = PICKER_LAYOUT;
    const rects = pickerRows(entries);
    this.drawPanel(rects);
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
      o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    const add = (x: number, y: number, frame: string, depth: number): GameObjects.Image =>
      fixed(this.scene.add.image(x, y, ATLAS_KEY, frame), depth);
    this.rows = rects.map((r) => {
      const shift = r.action === 'take' ? L.takeShift : 0;
      const images = [add(r.x, r.y, SPRITES.craftRow, DEPTHS.menu)];
      if (r.action === 'take') images.push(add(r.x + L.icon.x, r.y + L.icon.y, pieceIcon('hopper'), DEPTHS.menu + 1));
      images.push(add(r.x + L.icon.x + shift, r.y + L.icon.y, itemDef(r.itemId).icon, DEPTHS.menu + 1));
      const text = new GlyphLine(this.scene, r.x + L.count.x + shift, r.y + L.count.y, DEPTHS.menu + 1);
      return { entry: { action: r.action, itemId: r.itemId }, images, count: text };
    });
  }

  private drawPanel(rects: readonly { x: number; y: number; w: number; h: number }[]): void {
    const L = PICKER_LAYOUT;
    const first = rects[0];
    const last = rects[rects.length - 1];
    this.panel.clear();
    if (!first || !last) return;
    const x = first.x - L.pad;
    const y = first.y - L.pad;
    const w = first.w + 2 * L.pad;
    const h = last.y + last.h - first.y + 2 * L.pad;
    this.panel.fillStyle(colorOf(L.border)).fillRect(x - 1, y - 1, w + 2, h + 2);
    this.panel.fillStyle(colorOf(L.back)).fillRect(x, y, w, h);
  }
}
