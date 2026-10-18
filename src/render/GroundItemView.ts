import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, GROUND_ITEM_LIFT, SPRITES } from '../data/assets';
import { ITEMS } from '../data/items';
import { PICKUP_SLIDE } from '../data/juice';
import type { GroundItem } from '../sim/drops';
import { addVector } from './vector/textures';

interface Drawn {
  item: GameObjects.Image;
  shadow: GameObjects.Image;
}

// Draws items lying on the ground, each over a small shadow and sorted by its ground point.
// A picked-up item slides into the player instead of vanishing (021).
export class GroundItemView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;
  /** Where the player stands now, followed by items sliding in. */
  private player = { x: 0, y: 0 };
  /** Picked-up items still sliding in, and how far in the furthest one is (0 to 1) (for the test hook). */
  sliding = 0;
  slideProgress = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** `picked` holds the ids of items picked up since the last draw; `player` is where the player stands. */
  update(items: readonly GroundItem[], picked: ReadonlySet<number>, player: { x: number; y: number }): void {
    this.player = { x: player.x, y: player.y };
    const live = new Set<number>();
    for (const g of items) {
      live.add(g.id);
      if (this.drawn.has(g.id)) continue;
      const def = ITEMS[g.itemId];
      if (!def) throw new Error(`Unknown item '${g.itemId}'`);
      const x = Math.round(g.x);
      const y = Math.round(g.y);
      this.drawn.set(g.id, {
        shadow: addVector(this.scene, x, y, SPRITES.itemShadow).setDepth(DEPTHS.shadow),
        item: addVector(this.scene, x, y + GROUND_ITEM_LIFT, def.icon).setOrigin(0.5, 1).setDepth(y),
      });
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.shadow.destroy();
      if (picked.has(id)) this.slide(d.item);
      else d.item.destroy();
      this.drawn.delete(id);
    }
  }

  /** Slides an item's image into the player (who may still be moving), shrinking, then removes it. */
  private slide(image: GameObjects.Image): void {
    const from = { x: image.x, y: image.y, scale: image.scaleX };
    // Over everything standing in the world (the tree it lay behind), just under the pickup sparkle and
    // particles at worldUi - 1 and the "+1" popup at worldUi.
    image.setDepth(DEPTHS.worldUi - 2);
    this.sliding += 1;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: PICKUP_SLIDE.ms,
      ease: 'Quad.In',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        this.slideProgress = t;
        const to = { x: this.player.x, y: this.player.y + GROUND_ITEM_LIFT };
        image.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        image.setScale(from.scale * (1 + (PICKUP_SLIDE.endScale - 1) * t));
      },
      onComplete: () => {
        this.sliding -= 1;
        if (this.sliding === 0) this.slideProgress = 0;
        image.destroy();
      },
    });
  }
}
