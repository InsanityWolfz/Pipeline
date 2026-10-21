import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../../data/assets';
import { MENU_ROW_H, MENU_ROW_W } from '../../data/flowLayout';
import { flashRow, RowHover } from '../menuFeedback';
import { TextLine } from '../textLine';
import { addVector } from '../vector/textures';

// A column of 020-style menu rows for the flow screens (042): the title's menu, Settings, the key list and the
// cards' buttons. A row lights under the cursor (with the hover sound) and flashes when pressed; a row that can't be
// used is greyed and does neither. A row may show a value at its right, − and + steppers, and a line under it.

export interface MenuRowSpec {
  id: string;
  label: string;
  /** Shown at the row's right end (a volume, On/Off, a key). */
  value?: string;
  /** − and + by the value: a click near either steps it. */
  stepper?: boolean;
  /** One line of small text under the row (the Continue line, a notice). */
  sub?: string;
  /** False greys the row out: no hover, no press. */
  usable?: boolean;
}

export interface MenuRowShown {
  id: string;
  label: string;
  value: string | null;
  sub: string | null;
  usable: boolean;
  /** The row's box, view px. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a click landed: the row, or its − or + stepper. */
export interface MenuHit {
  id: string;
  part: 'row' | 'down' | 'up';
}

/** Row layout numbers, view px. */
export interface MenuColumnLayout {
  gap: number;
  subH: number;
  label: { x: number; y: number };
  sub: { x: number; y: number };
  value: { right: number; y: number };
  stepper: { down: number; up: number; hit: number };
  greyAlpha: number;
  /** 050 (F): the whole column drawn this many times bigger (the title's menu); 1 when absent. */
  scale?: number;
}

interface RowParts {
  spec: MenuRowSpec;
  image: GameObjects.Image;
  texts: TextLine[];
  value: TextLine | null;
  y: number;
}

const inBox = (b: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

export class MenuColumn {
  private readonly scene: Scene;
  private readonly layout: MenuColumnLayout;
  private readonly depth: number;
  private readonly hover: RowHover;
  private rows: RowParts[] = [];
  private x: number;
  private y: number;
  private visible = true;
  /** The column's scale (050), and its rows' size at that scale. */
  private readonly k: number;
  private readonly rowW: number;
  private readonly rowH: number;

  constructor(scene: Scene, x: number, y: number, layout: MenuColumnLayout, depth: number = DEPTHS.menu) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.layout = layout;
    this.depth = depth;
    this.hover = new RowHover(scene);
    this.k = layout.scale ?? 1;
    this.rowW = MENU_ROW_W * this.k;
    this.rowH = MENU_ROW_H * this.k;
  }

  /** The column's height for these rows, view px. */
  static heightOf(rows: readonly MenuRowSpec[], layout: Pick<MenuColumnLayout, 'gap' | 'subH' | 'scale'>): number {
    const k = layout.scale ?? 1;
    return rows.reduce((h, r, i) => h + (MENU_ROW_H + (r.sub ? layout.subH : 0) + (i > 0 ? layout.gap : 0)) * k, 0);
  }

  get height(): number {
    return MenuColumn.heightOf(
      this.rows.map((r) => r.spec),
      this.layout,
    );
  }

  /** Lays the rows out from the top; rebuilds only what changed. */
  set(specs: readonly MenuRowSpec[], x = this.x, y = this.y): void {
    const same = x === this.x && y === this.y && specs.length === this.rows.length && specs.every((s, i) => sameShape(s, this.rows[i]?.spec));
    if (same) {
      // Only words or values changed: update in place.
      for (const [i, s] of specs.entries()) this.refresh(i, s);
      return;
    }
    this.clear();
    this.x = x;
    this.y = y;
    const L = this.layout;
    const k = this.k;
    const text = (tx: number, ty: number, style: 'display' | 'body'): TextLine => new TextLine(this.scene, tx, ty, this.depth + 2, false, style, k);
    let top = y;
    this.rows = specs.map((spec) => {
      const image = addVector(this.scene, x, top, SPRITES.craftRow).setOrigin(0).setScrollFactor(0).setDepth(this.depth);
      image.setScale(image.scaleX * k, image.scaleY * k);
      const label = text(x + L.label.x * k, top + L.label.y * k, 'display').set(spec.label);
      const texts = [label];
      let value: TextLine | null = null;
      if (spec.value !== undefined) {
        value = text(0, top + L.value.y * k, 'body');
        texts.push(value);
        if (spec.stepper) {
          texts.push(text(x + L.stepper.down * k, top + L.value.y * k, 'body').set('−'));
          texts.push(text(x + L.stepper.up * k, top + L.value.y * k, 'body').set('+'));
        }
      }
      if (spec.sub) texts.push(text(x + L.sub.x * k, top + this.rowH + L.sub.y * k, 'body').set(spec.sub));
      const parts: RowParts = { spec, image, texts, value, y: top };
      top += this.rowH + (spec.sub ? L.subH * k : 0) + L.gap * k;
      return parts;
    });
    for (const [i, s] of specs.entries()) this.refresh(i, s);
    this.setVisible(this.visible);
  }

  private refresh(i: number, spec: MenuRowSpec): void {
    const row = this.rows[i];
    if (!row) return;
    row.spec = spec;
    const L = this.layout;
    const k = this.k;
    row.texts[0]?.set(spec.label);
    if (row.value && spec.value !== undefined) {
      row.value.set(spec.value);
      // Right-aligned to the value column; centred between the steppers when it has them.
      const vx = spec.stepper ? Math.round(this.x + ((L.stepper.down + L.stepper.up) / 2 + 3) * k - row.value.width / 2) : Math.round(this.x + L.value.right * k - row.value.width);
      row.value.moveTo(vx, row.y + L.value.y * k);
    }
    // A line under the row ends at the row's right end, so a long one (the Continue line) grows leftward, on screen.
    const sub = spec.sub ? row.texts[row.texts.length - 1] : undefined;
    if (sub && spec.sub) sub.set(spec.sub).moveTo(Math.round(this.x + this.rowW - L.sub.x * k - sub.width), row.y + this.rowH + L.sub.y * k);
    const usable = spec.usable !== false;
    const alpha = usable ? 1 : L.greyAlpha;
    row.image.setAlpha(alpha).setFrame(this.hover.frame(i, usable));
    for (const t of row.texts) t.setAlpha(alpha);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const r of this.rows) {
      r.image.setVisible(visible);
      for (const t of r.texts) t.setVisible(visible);
    }
    if (!visible) this.hover.set(-1);
  }

  /** The rows as drawn, for the test hook. */
  get shown(): MenuRowShown[] {
    return this.rows.map((r) => ({ id: r.spec.id, label: r.spec.label, value: r.spec.value ?? null, sub: r.spec.sub ?? null, usable: r.spec.usable !== false, x: this.x, y: r.y, w: this.rowW, h: this.rowH }));
  }

  private indexAt(x: number, y: number): number {
    return this.rows.findIndex((r) => inBox({ x: this.x, y: r.y, w: this.rowW, h: this.rowH }, x, y));
  }

  /** The cursor is at a view point: its row lights, with the hover sound on a new usable row. */
  pointAt(x: number, y: number): void {
    const i = this.visible ? this.indexAt(x, y) : -1;
    const usable = this.rows[i]?.spec.usable !== false;
    if (!this.hover.set(i, usable)) return;
    for (const [k, r] of this.rows.entries()) r.image.setFrame(this.hover.frame(k, r.spec.usable !== false));
  }

  /** What a click at a view point hits, flashing its row; null off the rows or on a greyed one. */
  click(x: number, y: number): MenuHit | null {
    if (!this.visible) return null;
    const i = this.indexAt(x, y);
    const row = this.rows[i];
    if (!row || row.spec.usable === false) return null;
    flashRow(this.scene, this.x, row.y, undefined, this.k);
    if (row.spec.stepper) {
      const { down, up, hit } = this.layout.stepper;
      const k = this.k;
      if (Math.abs(x - (this.x + down * k)) <= hit * k) return { id: row.spec.id, part: 'down' };
      if (Math.abs(x - (this.x + up * k)) <= hit * k) return { id: row.spec.id, part: 'up' };
      return null;
    }
    return { id: row.spec.id, part: 'row' };
  }

  /** The id of the row at `index`, for keyboard use. */
  idAt(index: number): string | null {
    return this.rows[index]?.spec.id ?? null;
  }

  clear(): void {
    for (const r of this.rows) {
      r.image.destroy();
      for (const t of r.texts) t.destroy();
    }
    this.rows = [];
    this.hover.set(-1);
  }
}

/** Same layout: same ids, the same parts (a value, steppers, a line under it). */
function sameShape(a: MenuRowSpec, b: MenuRowSpec | undefined): boolean {
  return !!b && a.id === b.id && (a.value === undefined) === (b.value === undefined) && !!a.stepper === !!b.stepper && !!a.sub === !!b.sub;
}
