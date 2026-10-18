import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { itemDef, ITEMS } from '../data/items';
import { count, type Inventory } from '../sim/inventory';
import { inRect, pickerRows } from './foundryLayout';
import { GlyphLine } from './glyphLine';

/** The items the player holds, in ITEMS order: what the picker lists. */
export function heldItems(inventory: Inventory): string[] {
  return Object.keys(ITEMS).filter((id) => count(inventory, id) > 0);
}

// The hopper picker: opened by E on an empty hopper, it lists every item the
// player holds; clicking one puts all of it in the hopper. The world keeps running.
export class HopperPicker {
  private readonly scene: Scene;
  private rows: { itemId: string; images: GameObjects.Image[]; count: GlyphLine }[] = [];
  private items: string[] = [];
  /** The hopper's piece id while open. */
  hopperId: number | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
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
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
      o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.rows = pickerRows(items).map((r) => ({
      itemId: r.itemId,
      images: [
        fixed(this.scene.add.image(r.x, r.y, ATLAS_KEY, SPRITES.craftRow), DEPTHS.menu),
        fixed(this.scene.add.image(r.x + L.icon.x, r.y + L.icon.y, ATLAS_KEY, itemDef(r.itemId).icon), DEPTHS.menu + 1),
      ],
      count: new GlyphLine(this.scene, r.x + L.count.x, r.y + L.count.y, DEPTHS.menu + 1),
    }));
  }
}
