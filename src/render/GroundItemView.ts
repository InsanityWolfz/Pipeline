import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, GROUND_ITEM_LIFT, SPRITES } from '../data/assets';
import { ITEMS } from '../data/items';
import type { GroundItem } from '../sim/drops';


interface Drawn {
  item: GameObjects.Image;
  shadow: GameObjects.Image;
}

// Draws items lying on the ground, each over a small shadow and sorted by its ground point.
export class GroundItemView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(items: readonly GroundItem[]): void {
    const live = new Set<number>();
    for (const g of items) {
      live.add(g.id);
      if (this.drawn.has(g.id)) continue;
      const def = ITEMS[g.itemId];
      if (!def) throw new Error(`Unknown item '${g.itemId}'`);
      const x = Math.round(g.x);
      const y = Math.round(g.y);
      this.drawn.set(g.id, {
        shadow: this.scene.add.image(x, y, ATLAS_KEY, SPRITES.itemShadow).setDepth(DEPTHS.shadow),
        item: this.scene.add.image(x, y + GROUND_ITEM_LIFT, ATLAS_KEY, def.icon).setOrigin(0.5, 1).setDepth(y),
      });
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.item.destroy();
      d.shadow.destroy();
      this.drawn.delete(id);
    }
  }
}
