import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { AMMO_STRIP_LAYOUT } from '../data/hudLayout';
import { ammoDef } from '../data/ammo';
import { itemDef } from '../data/items';
import { SLOT_AMMOS } from '../data/tube';
import { count, type Inventory } from '../sim/inventory';
import type { TubeState } from '../sim/tube';
import { GlyphLine } from './glyphLine';

interface Cell {
  ammoId: string;
  count: GlyphLine;
}

// The three ammo the slot can switch to, beside the hotbar: each with its key
// number, icon and carried count, the selected one highlighted.
export class AmmoStripView {
  private readonly cells: Cell[];
  private readonly highlight: GameObjects.Image;
  private readonly left: number;
  /** Every image and number the strip draws, for showing and hiding it whole. */
  private readonly parts: { setVisible(visible: boolean): unknown }[] = [];

  /** (right, bottom) is the hotbar slot's bottom-right corner; the strip sits beside it. */
  constructor(scene: Scene, right: number, bottom: number) {
    const L = AMMO_STRIP_LAYOUT;
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T): T => {
      o.setScrollFactor(0).setDepth(DEPTHS.hud);
      return o;
    };
    this.left = right + L.gap;
    const frame = scene.textures.getFrame(ATLAS_KEY, SPRITES.hudAmmoCell);
    const top = bottom - frame.height;
    this.cells = SLOT_AMMOS.map((ammoId, i) => {
      const x = this.left + i * L.cellStep;
      this.parts.push(fixed(scene.add.image(x, top, ATLAS_KEY, SPRITES.hudAmmoCell).setOrigin(0)));
      const icon = itemDef(ammoDef(ammoId).itemId).icon;
      this.parts.push(fixed(scene.add.image(x + L.icon.x, top + L.icon.y, ATLAS_KEY, icon).setOrigin(0)));
      const key = new GlyphLine(scene, x + L.key.x, top + L.key.y);
      key.set(String(i + 1));
      const cellCount = new GlyphLine(scene, x + L.count.x, top + L.count.y);
      this.parts.push(key, cellCount);
      return { ammoId, count: cellCount };
    });
    this.highlight = fixed(scene.add.image(this.left, top, ATLAS_KEY, SPRITES.hudAmmoSelect).setOrigin(0));
    this.highlight.setDepth(DEPTHS.hud + 1);
    this.parts.push(this.highlight);
    this.box = { x: this.left, y: top, w: (SLOT_AMMOS.length - 1) * L.cellStep + frame.width, h: frame.height };
  }

  /** The strip's screen rect, so clicks on it never fire (015). */
  readonly box: { x: number; y: number; w: number; h: number };

  setVisible(visible: boolean): void {
    for (const p of this.parts) p.setVisible(visible);
  }

  update(tube: TubeState, inventory: Inventory): void {
    for (const [i, c] of this.cells.entries()) {
      c.count.set(String(count(inventory, ammoDef(c.ammoId).itemId)));
      if (c.ammoId === tube.ammoId) this.highlight.setX(this.left + i * AMMO_STRIP_LAYOUT.cellStep);
    }
  }
}
