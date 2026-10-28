import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { PICKER_LAYOUT } from '../data/hudLayout';
import { drawTablet } from './tablet';
import { inRect, menuRows } from './foundryLayout';
import { flashRow, RowHover } from './menuFeedback';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';
import { MenuMotion } from './MenuMotion';

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
  private readonly hover: RowHover;
  isOpen = false;
  /** 081: the open's fade and rise; `name` says which menu, for `ui().menuMotion`. */
  private readonly motion: MenuMotion;

  constructor(scene: Scene, name = 'choice') {
    this.scene = scene;
    this.hover = new RowHover(scene);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1);
    this.motion = new MenuMotion(scene, name, DEPTHS.menu - 1).adopt([this.panel]);
  }

  open(): void {
    if (!this.isOpen) this.motion.show();
    this.isOpen = true;
  }

  close(): void {
    this.motion.hide();
    this.hover.close();
    this.isOpen = false;
    this.show([]);
  }

  overUi(x: number, y: number): boolean {
    return this.isOpen && this.rects(this.choices.length).some((r) => inRect(r, x, y));
  }

  /** Each shown row's text and its box on screen, view px (032: for the test hook). */
  get rowsShown(): { text: string; x: number; y: number; w: number; h: number }[] {
    const rects = this.rects(this.choices.length);
    return this.choices.map((c, i) => ({ text: c.text, x: rects[i]?.x ?? 0, y: rects[i]?.y ?? 0, w: rects[i]?.w ?? 0, h: rects[i]?.h ?? 0 }));
  }

  /** The value of the row under a screen point, if open. */
  valueAt(x: number, y: number): T | undefined {
    if (!this.isOpen) return undefined;
    const i = this.rects(this.choices.length).findIndex((r) => inRect(r, x, y));
    return this.choices[i]?.value;
  }

  /** The cursor is at a screen point (020): its row lights, with the hover sound on a new row. */
  pointAt(x: number, y: number): void {
    const i = this.isOpen ? this.rects(this.choices.length).findIndex((r) => inRect(r, x, y)) : -1;
    if (!this.hover.set(i)) return;
    for (const [k, r] of this.rows.entries()) if (r.images[0]) this.hover.paint(k, r.images[0]);
  }

  /** Flashes the row under a screen point, as it's pressed. */
  flashAt(x: number, y: number): void {
    const r = this.isOpen ? this.rects(this.choices.length).find((rect) => inRect(rect, x, y)) : undefined;
    if (r) flashRow(this.scene, r.x, r.y);
  }

  /** The rows' rects on screen, centred. */
  private rects(n: number): ReturnType<typeof menuRows> {
    return menuRows(n);
  }

  /** Shows these rows (while open), rebuilding only on a change. */
  show(choices: readonly Choice<T>[]): void {
    const list = this.isOpen ? [...choices] : [];
    const key = list.map((c) => `${c.icons.join('+')}:${c.text}`).join('|');
    if (key === this.key) return;
    this.key = key;
    this.hover.close();
    for (const r of this.rows) {
      for (const o of r.images) o.destroy();
      r.text.destroy();
    }
    this.choices = list;
    const L = PICKER_LAYOUT;
    const rects = this.rects(list.length);
    this.panel.clear();
    if (rects.length > 0) {
      const x0 = Math.min(...rects.map((r) => r.x)) - L.pad;
      const y0 = Math.min(...rects.map((r) => r.y)) - L.pad;
      const x1 = Math.max(...rects.map((r) => r.x + r.w)) + L.pad;
      const y1 = Math.max(...rects.map((r) => r.y + r.h)) + L.pad;
      drawTablet(this.panel, x0, y0, x1 - x0, y1 - y0);
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
      this.motion.adopt([...images, text]);
      return { images, text };
    });
  }
}
