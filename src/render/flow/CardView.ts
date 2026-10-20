import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { FLOW_DIM, FLOW_ROWS, MENU_ROW_W } from '../../data/flowLayout';
import { CARD } from '../../data/titleScreen';
import { colorOf } from '../color';
import { drawTablet } from '../tablet';
import { TextLine } from '../textLine';
import { MenuColumn, type MenuRowShown, type MenuRowSpec } from './MenuColumn';

// A card over everything (042): a dim, a 020 tablet with a few wrapped lines of text and a column of buttons under
// them. The confirms (New game over a save, Quit to title, an import), the farewell card and the end card use it.

export interface CardUi {
  lines: string[];
  rows: MenuRowShown[];
  /** The tablet's box, view px. */
  box: { x: number; y: number; w: number; h: number };
}

/** A button on a card and what it does. */
export interface CardButton {
  id: string;
  label: string;
  run: () => void;
}

/** One block of the card's text: its words and its style (a title in the display face, the body under it). */
export interface CardLine {
  text: string;
  style?: 'title' | 'display' | 'body';
  /** Space above it, view px. */
  gap?: number;
}

export class CardView {
  private readonly scene: Scene;
  private readonly depth: number;
  private readonly dim: GameObjects.Rectangle;
  private readonly panel: GameObjects.Graphics;
  private readonly menu: MenuColumn;
  private texts: TextLine[] = [];
  private lines: string[] = [];
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private open = false;
  private actions = new Map<string, () => void>();

  constructor(scene: Scene, depth: number = DEPTHS.menu + 20) {
    this.scene = scene;
    this.depth = depth;
    this.dim = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, colorOf(FLOW_DIM.color), FLOW_DIM.alpha).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    this.menu = new MenuColumn(scene, 0, 0, FLOW_ROWS, depth + 2);
    this.hide();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Shows the card: its lines (wrapped to the card's width) and its buttons, centred on screen. */
  show(lines: readonly CardLine[], buttons: readonly CardButton[], width: number = CARD.w): void {
    this.actions = new Map(buttons.map((b) => [b.id, b.run]));
    this.layout(lines, buttons.map((b) => ({ id: b.id, label: b.label })), width);
  }

  private layout(lines: readonly CardLine[], buttons: readonly MenuRowSpec[], width: number): void {
    for (const t of this.texts) t.destroy();
    const inner = width - 2 * CARD.pad;
    let y = 0;
    this.texts = lines.map((l) => {
      y += l.gap ?? 0;
      const t = new TextLine(this.scene, 0, y, this.depth + 3, false, l.style ?? 'body').set(l.text);
      t.obj.setWordWrapWidth(inner, true).setAlign('center');
      const h = t.obj.height;
      t.moveTo(0, y);
      y += h + CARD.lineGap;
      return t;
    });
    this.lines = lines.map((l) => l.text);
    const textH = y;
    const menuH = MenuColumn.heightOf(buttons, FLOW_ROWS);
    const h = CARD.pad * 2 + textH + CARD.buttonGap + menuH;
    const x = Math.round((VIEW_WIDTH - width) / 2);
    const top = Math.round((VIEW_HEIGHT - h) / 2);
    this.box = { x, y: top, w: width, h };
    this.panel.clear();
    drawTablet(this.panel, x, top, width, h);
    // Each block centred in the card.
    for (const t of this.texts) t.moveTo(Math.round(VIEW_WIDTH / 2 - t.obj.width / 2), top + CARD.pad + t.at.y + 2);
    this.menu.set(buttons, Math.round((VIEW_WIDTH - MENU_ROW_W) / 2), top + CARD.pad + textH + CARD.buttonGap);
    this.setOpen(true);
  }

  hide(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.dim.setVisible(open);
    this.panel.setVisible(open);
    for (const t of this.texts) t.setVisible(open);
    this.menu.setVisible(open);
  }

  pointAt(x: number, y: number): void {
    if (this.open) this.menu.pointAt(x, y);
  }

  /** A click on the card: runs the button it picks; returns whether it picked one. */
  click(x: number, y: number): boolean {
    const id = this.open ? this.menu.click(x, y)?.id : undefined;
    const run = id ? this.actions.get(id) : undefined;
    run?.();
    return run !== undefined;
  }

  /** Runs a button by id (Esc on a confirm runs its `no`); returns whether the card has it. */
  press(id: string): boolean {
    const run = this.open ? this.actions.get(id) : undefined;
    run?.();
    return run !== undefined;
  }

  get ui(): CardUi | null {
    return this.open ? { lines: [...this.lines], rows: this.menu.shown, box: { ...this.box } } : null;
  }
}
