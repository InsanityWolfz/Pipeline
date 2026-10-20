import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { PICKUP_FEED } from '../data/hudPanels';
import { keyLook } from './itemShown';
import type { ScreenBox } from './bottomHud';
import { addPickup, ageFeed, lineAlpha, type FeedLine } from './pickupFeedModel';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** One drawn line: its faint tablet, the item's icon and "+N Name". */
interface Slot {
  back: GameObjects.Graphics;
  icon: GameObjects.Image;
  text: TextLine;
}

// The pickup feed (031): top-left, where the materials column was, a line per item
// picked up ("[icon] +3 Wood"), repeats merged, newest on top, each fading after a
// hold. Driven by the sim's `pickups` events only. Fixed to the screen.
export class PickupFeed {
  private lines: FeedLine[] = [];
  private readonly slots: Slot[];

  constructor(scene: Scene) {
    const F = PICKUP_FEED;
    this.slots = Array.from({ length: F.maxLines }, () => ({
      back: scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud),
      icon: addVector(scene, 0, 0, SPRITES.itemWood).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.hud + 1),
      text: new TextLine(scene, 0, 0, DEPTHS.hud + 2, false, 'body'),
    }));
    this.draw();
  }

  /** The lines on show, newest first (`ui().pickupFeed`). */
  get shown(): { itemId: string; count: number }[] {
    return this.lines.map((l) => ({ itemId: l.itemId, count: l.count }));
  }

  /** The drawn lines' boxes: a press there never fires (015). */
  get boxes(): ScreenBox[] {
    const F = PICKUP_FEED;
    return this.lines.map((_, i) => ({ x: F.x, y: F.y + i * F.lineStep, w: F.width, h: F.lineStep }));
  }

  /** Pickups since the last frame join the feed, by the key each shows under (033: unknown schematics share one); the lines age `dtMs`. */
  update(pickups: readonly string[], dtMs: number): void {
    this.lines = ageFeed(this.lines, dtMs);
    for (const key of pickups) this.lines = addPickup(this.lines, key);
    this.draw();
  }

  private draw(): void {
    const F = PICKUP_FEED;
    this.slots.forEach((slot, i) => {
      const line = this.lines[i];
      slot.back.clear();
      slot.icon.setVisible(line !== undefined);
      slot.text.setVisible(line !== undefined);
      if (!line) return;
      const item = keyLook(line.itemId);
      const y = F.y + i * F.lineStep;
      const alpha = lineAlpha(line);
      slot.icon.setFrame(item.icon).setPosition(F.x + F.icon.x, y + F.icon.y).setAlpha(alpha);
      slot.text.set(`+${line.count} ${item.name}`).moveTo(F.x + F.text.x, y + F.text.y).setAlpha(alpha);
      const w = Math.min(F.width, F.text.x + slot.text.width + F.pad);
      drawTablet(slot.back, F.x - F.pad, y + F.back.y, w + F.pad, F.back.h, F.alpha * alpha);
    });
  }
}
