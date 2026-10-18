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
      fixed(scene.add.image(x, top, ATLAS_KEY, SPRITES.hudAmmoCell).setOrigin(0));
      const icon = itemDef(ammoDef(ammoId).itemId).icon;
      fixed(scene.add.image(x + L.icon.x, top + L.icon.y, ATLAS_KEY, icon).setOrigin(0));
      new GlyphLine(scene, x + L.key.x, top + L.key.y).set(String(i + 1));
      return { ammoId, count: new GlyphLine(scene, x + L.count.x, top + L.count.y) };
    });
    this.highlight = fixed(scene.add.image(this.left, top, ATLAS_KEY, SPRITES.hudAmmoSelect).setOrigin(0));
    this.highlight.setDepth(DEPTHS.hud + 1);
  }

  update(tube: TubeState, inventory: Inventory): void {
    for (const [i, c] of this.cells.entries()) {
      c.count.set(String(count(inventory, ammoDef(c.ammoId).itemId)));
      if (c.ammoId === tube.ammoId) this.highlight.setX(this.left + i * AMMO_STRIP_LAYOUT.cellStep);
    }
  }
}
