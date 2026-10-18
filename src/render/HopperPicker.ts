import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { count, type Inventory } from '../sim/inventory';
import { heldItems, inRect, pickerRows } from './foundryLayout';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

// The hopper picker: opened by E on an empty hopper, it lists every item the
// player holds; clicking one puts all of it in the hopper. The world keeps running.
export class HopperPicker {
  private readonly scene: Scene;
  private rows: { itemId: string; images: GameObjects.Image[]; count: GlyphLine }[] = [];
  private readonly panel: GameObjects.Graphics;
  private items: string[] = [];
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
    return this.isOpen && pickerRows(this.items).some((r) => inRect(r, x, y));
  }

  /** The item under a screen point, if the picker is open. */
  itemAt(x: number, y: number): string | undefined {
    return this.isOpen ? pickerRows(this.items).find((r) => inRect(r, x, y))?.itemId : undefined;
  }

  update(inventory: Inventory): void {
    if (!this.isOpen) return;
    const items = heldItems(inventory);
    if (items.join() !== this.items.join()) this.rebuild(items);
    for (const r of this.rows) r.count.set(String(count(inventory, r.itemId)));
  }

  private rebuild(items: string[]): void {
    for (const r of this.rows) {
      for (const o of r.images) o.destroy();
      r.count.set('');
    }
    this.items = items;
    const L = PICKER_LAYOUT;
    const rects = pickerRows(items);
    const first = rects[0];
    const last = rects[rects.length - 1];
    this.panel.clear();
    if (first && last) {
      const x = first.x - L.pad;
      const y = first.y - L.pad;
      const w = first.w + 2 * L.pad;
      const h = last.y + last.h - first.y + 2 * L.pad;
      this.panel.fillStyle(colorOf(L.border)).fillRect(x - 1, y - 1, w + 2, h + 2);
      this.panel.fillStyle(colorOf(L.back)).fillRect(x, y, w, h);
    }
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
      o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.rows = rects.map((r) => ({
      itemId: r.itemId,
      images: [
        fixed(this.scene.add.image(r.x, r.y, ATLAS_KEY, SPRITES.craftRow), DEPTHS.menu),
        fixed(this.scene.add.image(r.x + L.icon.x, r.y + L.icon.y, ATLAS_KEY, itemDef(r.itemId).icon), DEPTHS.menu + 1),
      ],
      count: new GlyphLine(this.scene, r.x + L.count.x, r.y + L.count.y, DEPTHS.menu + 1),
    }));
  }
}
