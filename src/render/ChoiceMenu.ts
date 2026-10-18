import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { colorOf } from './color';
import { inRect, menuRows } from './foundryLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** One row: up to two icons, a number beside them, and what clicking it means. */
export interface Choice<T> {
  icons: readonly string[];
  text: string;
  value: T;
}

// A small click menu styled like the hopper picker, for the claimed pylon and the
// stash (009). Rows are rebuilt only when their contents change. The world keeps running.
export class ChoiceMenu<T> {
  private readonly scene: Scene;
  private readonly panel: GameObjects.Graphics;
  private rows: { images: GameObjects.Image[]; text: TextLine }[] = [];
  private choices: Choice<T>[] = [];
  private key = '';
  isOpen = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
    this.show([]);
  }

  overUi(x: number, y: number): boolean {
    return this.isOpen && menuRows(this.choices.length).some((r) => inRect(r, x, y));
  }

  /** The value of the row under a screen point, if open. */
  valueAt(x: number, y: number): T | undefined {
    if (!this.isOpen) return undefined;
    const i = menuRows(this.choices.length).findIndex((r) => inRect(r, x, y));
    return this.choices[i]?.value;
  }

  /** Shows these rows (while open), rebuilding only on a change. */
  show(choices: readonly Choice<T>[]): void {
    const list = this.isOpen ? [...choices] : [];
    const key = list.map((c) => `${c.icons.join('+')}:${c.text}`).join('|');
    if (key === this.key) return;
    this.key = key;
    for (const r of this.rows) {
      for (const o of r.images) o.destroy();
      r.text.set('');
    }
    this.choices = list;
    const L = PICKER_LAYOUT;
    const rects = menuRows(list.length);
    this.panel.clear();
    if (rects.length > 0) {
      const x0 = Math.min(...rects.map((r) => r.x)) - L.pad;
      const y0 = Math.min(...rects.map((r) => r.y)) - L.pad;
      const x1 = Math.max(...rects.map((r) => r.x + r.w)) + L.pad;
      const y1 = Math.max(...rects.map((r) => r.y + r.h)) + L.pad;
      this.panel.fillStyle(colorOf(L.border)).fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
      this.panel.fillStyle(colorOf(L.back)).fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    const add = (x: number, y: number, frame: string, depth: number): GameObjects.Image =>
      addVector(this.scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.rows = rects.map((r, i) => {
      const c = list[i];
      const images = [add(r.x, r.y, SPRITES.craftRow, DEPTHS.menu)];
      const icons = c?.icons ?? [];
      icons.forEach((icon, k) => images.push(add(r.x + L.icon.x + k * L.takeShift, r.y + L.icon.y, icon, DEPTHS.menu + 1)));
      const shift = Math.max(0, icons.length - 1) * L.takeShift;
      const text = new TextLine(this.scene, r.x + L.count.x + shift, r.y + L.count.y, DEPTHS.menu + 1);
      text.set(c?.text ?? '');
      return { images, text };
    });
  }
}
