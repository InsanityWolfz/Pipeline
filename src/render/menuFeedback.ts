import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { MENU_FEEDBACK } from '../data/hudLayout';
import { MENU_MOTION } from '../data/hudLook';
import { MENU_MOTION_SHOWN, reducedMotion, SEEK_MS } from './menuCurves';
import { addVector } from './vector/textures';

// Menu row feedback (020): a row lights under the cursor, with the hover sound
// as the cursor reaches a new row, and flashes brass when pressed. The flash is
// its own image, so it shows even when the press closes the menu.

/** Emitted on the scene when the cursor reaches a new menu row; the scene plays the hover sound. */
export const MENU_HOVER_EVENT = 'menu-hover';

/** A menu's row frames: plain, lit under the cursor, and the press flash. */
export interface RowFrames {
  plain: string;
  hover: string;
  press: string;
}

/** The 184x20 rows of the picker, pause and site menus. */
export const MENU_ROW_FRAMES: RowFrames = { plain: SPRITES.craftRow, hover: SPRITES.craftRowHover, press: SPRITES.craftRowPress };

/**
 * Which row of one menu is under the cursor. 081: the lit row's hover look is an overlay over its plain frame that
 * fades in (80 ms, `MENU_MOTION.hoverMs`) instead of snapping; the row the cursor leaves keeps its overlay, which fades
 * out over the same time, so a sweep never blinks dark between rows. With reduced motion both land at once. The
 * overlays (two at most, made on first need through `overlay`) are reused from a pool; `close()` hides them at once.
 */
export class RowHover {
  private readonly scene: Scene;
  private readonly frames: RowFrames;
  private readonly overlay: (frame: string) => GameObjects.Image;
  private index = -1;
  /** The overlay lighting `row`, the one fading out of the row the cursor left, and overlays free for reuse. */
  private lit: GameObjects.Image | null = null;
  private row: GameObjects.Image | null = null;
  private fading: GameObjects.Image | null = null;
  private readonly pool: GameObjects.Image[] = [];
  /** The menu whose rows the cursor last touched, for the test hook. */
  static last: RowHover | null = null;

  constructor(scene: Scene, frames: RowFrames = MENU_ROW_FRAMES, overlay?: (frame: string) => GameObjects.Image) {
    this.scene = scene;
    this.frames = frames;
    this.overlay = overlay ?? ((frame) => addVector(scene, 0, 0, frame).setScrollFactor(0));
  }

  /** The row under the cursor is now `index` (-1 for none). Returns whether that changed. A row that can't be used lights and sounds nothing. */
  set(index: number, usable = true): boolean {
    if (index === this.index) return false;
    if (index >= 0) RowHover.last = this;
    if (index >= 0 && usable) this.scene.events.emit(MENU_HOVER_EVENT);
    this.index = index;
    return true;
  }

  /** The cursor left row `index`. */
  leave(index: number): void {
    if (index === this.index) this.index = -1;
  }

  /** The frame row `index` shows: lit under the cursor (if it can be used), else plain. */
  frame(index: number, usable = true): string {
    return usable && index === this.index ? this.frames.hover : this.frames.plain;
  }

  /**
   * 081: draws row `index` on its `image`: the plain frame, with the hover overlay fading in over it while it's the
   * lit row (if it can be used), and fading out once it isn't.
   */
  paint(index: number, image: GameObjects.Image, usable = true): void {
    image.setFrame(this.frames.plain);
    const lit = usable && index === this.index && image.visible;
    if (lit && this.row !== image) {
      if (this.row) this.retire();
      this.row = image;
      this.lit = this.place(this.pool.pop() ?? this.overlay(this.frames.hover), image);
      this.fade(this.lit, 1);
    } else if (lit && this.lit) this.follow(this.lit, image);
    else if (!lit && this.row === image) this.retire();
  }

  /** 081: the lit row's index and the two rims' alphas (the lit one and the one fading out, 0 for none), for `ui().menuMotion`. */
  get rims(): { row: number; lit: number; fading: number } {
    return { row: this.lit ? this.index : -1, lit: this.lit?.visible ? this.lit.alpha : 0, fading: this.fading?.visible ? this.fading.alpha : 0 };
  }

  /** The menu closed: no row lit, the overlays gone at once. */
  close(): void {
    this.index = -1;
    this.row = null;
    for (const o of [this.lit, this.fading]) if (o) this.free(o);
    this.lit = null;
    this.fading = null;
  }

  /** The lit row's overlay starts fading out where it is (one still fading from before goes at once). */
  private retire(): void {
    if (this.fading) this.free(this.fading);
    this.fading = this.lit;
    this.lit = null;
    this.row = null;
    if (this.fading) this.fade(this.fading, 0);
  }

  /** An overlay hidden, its tweens stopped, back in the pool. */
  private free(o: GameObjects.Image): void {
    this.scene.tweens.killTweensOf(o);
    o.setVisible(false).setAlpha(0);
    if (!this.pool.includes(o)) this.pool.push(o);
  }

  /** The fade-out finished: its overlay goes back to the pool. */
  private readonly faded = (): void => {
    if (this.fading) this.free(this.fading);
    this.fading = null;
  };

  /** An overlay laid over `image`, in its container if it has one. */
  private place(o: GameObjects.Image, image: GameObjects.Image): GameObjects.Image {
    o.setFrame(this.frames.hover);
    const parent = image.parentContainer;
    if (parent && o.parentContainer !== parent) parent.add(o);
    this.follow(o, image);
    // Just above its row, under the row's icons and words (Phaser's moveAbove leaves a child that's already higher).
    if (parent) {
      const at = parent.getIndex(image);
      const now = parent.getIndex(o);
      parent.moveTo(o, now > at ? at + 1 : at);
    } else o.setDepth(image.depth + 0.5);
    return o;
  }

  /** Keeps an overlay on its row (a row that moved, scaled or hid). */
  private follow(o: GameObjects.Image, image: GameObjects.Image): void {
    o.setPosition(image.x, image.y).setOrigin(image.originX, image.originY).setScale(image.scaleX, image.scaleY).setVisible(image.visible);
  }

  private fade(o: GameObjects.Image, to: number): void {
    this.scene.tweens.killTweensOf(o);
    if (to > 0) MENU_MOTION_SHOWN.hovers++;
    if (reducedMotion()) {
      if (to > 0) o.setAlpha(to);
      else this.faded();
      return;
    }
    if (to > 0) o.setVisible(true).setAlpha(0);
    // From its alpha now, named: a seek resets a property tween to its start value, which a bare `to` leaves unset.
    this.scene.tweens.add({ targets: o, alpha: { from: o.alpha, to }, duration: MENU_MOTION.hoverMs, ease: 'Cubic.easeOut', ...(to > 0 ? {} : { onComplete: this.faded }) }).seek(SEEK_MS);
  }
}

/** 081: the last hovered menu's rims, or none. */
export const hoverRims = (): { row: number; lit: number; fading: number } => RowHover.last?.rims ?? { row: -1, lit: 0, fading: 0 };

/** A brass flash over the row at (x, y), screen px, fading out. */
export function flashRow(scene: Scene, x: number, y: number, frame: string = MENU_ROW_FRAMES.press, scale = 1): void {
  const flash = addVector(scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 3);
  // 050: a scaled column's (the title's) flash covers its bigger row.
  flash.setScale(flash.scaleX * scale, flash.scaleY * scale);
  scene.tweens.add({ targets: flash, alpha: 0, duration: MENU_FEEDBACK.pressMs, onComplete: () => flash.destroy() });
}
