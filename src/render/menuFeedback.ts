import type { Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { MENU_FEEDBACK } from '../data/hudLayout';
import { addVector } from './vector/textures';

// Menu row feedback (020): a row lights under the cursor, with the hover sound
// as the cursor reaches a new row, and flashes brass when pressed. The flash is
// its own image, so it shows even when the press closes the menu.

/** Emitted on the scene when the cursor reaches a new menu row; the scene plays the hover sound. */
export const MENU_HOVER_EVENT = 'menu-hover';

/** Which row of one menu is under the cursor. */
/** A menu's row frames: plain, lit under the cursor, and the press flash. */
export interface RowFrames {
  plain: string;
  hover: string;
  press: string;
}

/** The 184x20 rows of the picker, pause and site menus. */
export const MENU_ROW_FRAMES: RowFrames = { plain: SPRITES.craftRow, hover: SPRITES.craftRowHover, press: SPRITES.craftRowPress };

export class RowHover {
  private readonly scene: Scene;
  private readonly frames: RowFrames;
  private index = -1;

  constructor(scene: Scene, frames: RowFrames = MENU_ROW_FRAMES) {
    this.scene = scene;
    this.frames = frames;
  }

  /** The row under the cursor is now `index` (-1 for none). Returns whether that changed. A row that can't be used lights and sounds nothing. */
  set(index: number, usable = true): boolean {
    if (index === this.index) return false;
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
}

/** A brass flash over the row at (x, y), screen px, fading out. */
export function flashRow(scene: Scene, x: number, y: number, frame: string = SPRITES.craftRowPress): void {
  const flash = addVector(scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.menu + 3);
  scene.tweens.add({ targets: flash, alpha: 0, duration: MENU_FEEDBACK.pressMs, onComplete: () => flash.destroy() });
}
