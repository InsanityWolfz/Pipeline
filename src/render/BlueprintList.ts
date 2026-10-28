import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { BLUEPRINT_LIST, BLUEPRINT_SPRITES } from '../data/blueprintAssets';
import { BLUEPRINT_TEXT } from '../data/blueprints';
import type { Blueprint } from '../sim/blueprints';
import { blueprintIcon } from './blueprintLayout';
import { blueprintListLayout } from './blueprintListLayout';
import { inRect, type ScreenRect } from './foundryLayout';
import { RowHover } from './menuFeedback';
import { MenuMotion } from './MenuMotion';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The list as drawn (063), for `ui().blueprints.list`, view px. */
export interface BlueprintListShown {
  open: boolean;
  rows: { slot: number; name: string; pieces: number; icon: string; box: ScreenRect; del: ScreenRect }[];
  /** The empty line shows (no blueprints saved). */
  empty: boolean;
}

export const NO_BLUEPRINT_LIST: BlueprintListShown = { open: false, rows: [], empty: false };

interface Row {
  images: GameObjects.Image[];
  texts: TextLine[];
}

// The blueprint list (063): a tablet over the build bar's Tools group, in the house panel style (the menus' rows), a
// row per saved blueprint with its icon, its name, its piece count and a delete mark. Clicking a row takes it as the
// ghost; its delete mark asks to confirm (BlueprintUi). Rows are rebuilt only when the blueprints change.
export class BlueprintList {
  private readonly scene: Scene;
  private readonly panel: GameObjects.Graphics;
  private readonly title: TextLine;
  private readonly empty: TextLine;
  private readonly hover: RowHover;
  private rows: Row[] = [];
  private key = '';
  private open = false;
  shown: BlueprintListShown = NO_BLUEPRINT_LIST;
  /** 081: the open's fade and rise. */
  private readonly motion: MenuMotion;

  constructor(scene: Scene) {
    this.scene = scene;
    this.hover = new RowHover(scene);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 1).setVisible(false);
    this.title = new TextLine(scene, 0, 0, DEPTHS.menu + 1, false, 'display').set(BLUEPRINT_TEXT.listTitle).setVisible(false);
    this.empty = new TextLine(scene, 0, 0, DEPTHS.menu + 1, false, 'body').set(BLUEPRINT_TEXT.empty).setVisible(false);
    this.motion = new MenuMotion(scene, 'blueprints', DEPTHS.menu - 1).adopt([this.panel, this.title, this.empty]);
  }

  /** Over the open panel. */
  overUi(x: number, y: number): boolean {
    return this.open && inRect(blueprintListLayout(this.shown.rows.length).panel, x, y);
  }

  /** The row under a point, and whether it's on its delete mark; null off the rows. */
  hit(x: number, y: number): { slot: number; del: boolean } | null {
    if (!this.open) return null;
    const r = this.shown.rows.find((row) => inRect(row.box, x, y));
    return r ? { slot: r.slot, del: inRect(r.del, x, y) } : null;
  }

  /** The cursor at a view point: the row under it lights, with the hover sound. */
  pointAt(x: number, y: number): void {
    const i = this.open ? this.shown.rows.findIndex((r) => inRect(r.box, x, y)) : -1;
    if (!this.hover.set(i)) return;
    for (const [k, r] of this.rows.entries()) if (r.images[0]) this.hover.paint(k, r.images[0]);
  }

  update(open: boolean, blueprints: readonly Blueprint[]): void {
    const key = open ? blueprints.map((b) => `${b.itemId ?? ''}:${b.name}:${b.pieces.length}`).join('|') : '';
    if (open !== this.open || key !== this.key) this.rebuild(open, blueprints, key);
  }

  private rebuild(open: boolean, blueprints: readonly Blueprint[], key: string): void {
    if (open && !this.open) this.motion.show();
    if (!open) this.motion.hide();
    this.hover.close();
    this.open = open;
    this.key = key;
    for (const r of this.rows) {
      for (const o of r.images) o.destroy();
      for (const t of r.texts) t.destroy();
    }
    this.rows = [];
    const list = open ? blueprints : [];
    const L = blueprintListLayout(list.length);
    const B = BLUEPRINT_LIST;
    this.panel.clear().setVisible(open);
    if (open) drawTablet(this.panel, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    this.title.setVisible(open).moveTo(L.title.x, L.title.y);
    this.empty.setVisible(open && list.length === 0).moveTo(L.panel.x + B.pad + B.name.x, L.panel.y + B.pad + B.title.h + B.empty.y);
    const add = (x: number, y: number, frame: string, depth: number): GameObjects.Image => addVector(this.scene, x, y, frame).setOrigin(0).setScrollFactor(0).setDepth(depth);
    const shownRows: BlueprintListShown['rows'] = [];
    for (const r of L.rows) {
      const bp = list[r.slot];
      if (!bp) continue;
      const icon = blueprintIcon(bp);
      const half = (B.del.size - B.del.mark) / 2;
      const images = [add(r.x, r.y, SPRITES.craftRow, DEPTHS.menu), add(r.x + B.icon.x, r.y + B.icon.y, icon, DEPTHS.menu + 1), add(r.del.x + half, r.del.y + half, BLUEPRINT_SPRITES.deleteMark, DEPTHS.menu + 1)];
      const name = new TextLine(this.scene, r.x + B.name.x, r.y + B.name.y, DEPTHS.menu + 1).set(bp.name);
      const count = new TextLine(this.scene, 0, r.y + B.count.y, DEPTHS.menu + 1, false, 'label').set(BLUEPRINT_TEXT.pieces(bp.pieces.length));
      count.moveTo(r.x + r.w - B.count.right - count.width, r.y + B.count.y);
      this.rows.push({ images, texts: [name, count] });
      this.motion.adopt([...images, name, count]);
      shownRows.push({ slot: r.slot, name: bp.name, pieces: bp.pieces.length, icon, box: { x: r.x, y: r.y, w: r.w, h: r.h }, del: r.del });
    }
    this.shown = { open, rows: shownRows, empty: open && list.length === 0 };
  }
}
