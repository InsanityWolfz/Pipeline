import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { FLOW_DIM, FLOW_ROWS, MENU_ROW_W, NOTE_PANEL } from '../../data/flowLayout';
import { FONT_FILES, TEXT_STYLES } from '../../data/fonts';
import { paletteHex } from '../../data/palette';
import { NOTES, NOTE_TEXT } from '../../data/save';
import { colorOf } from '../color';
import { drawTablet } from '../tablet';
import { TextLine } from '../textLine';
import { MenuColumn, type MenuRowShown } from './MenuColumn';

// The feedback note (042): a small tablet with a multi-line text box (an HTML textarea over the canvas; no new
// dependency), up to 2,000 characters, with Save note and Cancel. While it's open the game's keyboard is off, so
// typing never reaches the game's keys; Enter adds a line, Ctrl+Enter saves, Esc cancels.

export interface NoteUi {
  rows: MenuRowShown[];
  text: string;
  open: boolean;
}

export class NoteView {
  private readonly scene: Scene;
  private readonly dim: GameObjects.Rectangle;
  private readonly panel: GameObjects.Graphics;
  private readonly title: TextLine;
  private readonly count: TextLine;
  private readonly menu: MenuColumn;
  private readonly box: HTMLTextAreaElement;
  private open = false;
  private onSave: (text: string) => void = () => undefined;
  private onCancel: () => void = () => undefined;

  constructor(scene: Scene, depth: number = DEPTHS.menu + 30) {
    this.scene = scene;
    const P = NOTE_PANEL;
    this.dim = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, colorOf(FLOW_DIM.color), FLOW_DIM.alpha).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    const menuY = P.y + P.box.y + P.box.h + P.buttonsGap;
    const h = menuY - P.y + MenuColumn.heightOf([{ id: 'a', label: '' }, { id: 'b', label: '' }], FLOW_ROWS) + P.pad;
    drawTablet(this.panel, P.x, P.y, P.w, h);
    this.title = new TextLine(scene, P.x + P.pad, P.y + P.titleY, depth + 3, false, 'display').set(NOTE_TEXT.title);
    this.count = new TextLine(scene, 0, P.y + P.countY, depth + 3, false, 'body');
    this.menu = new MenuColumn(scene, 0, 0, FLOW_ROWS, depth + 2);
    this.menu.set(
      [
        { id: 'saveNote', label: NOTE_TEXT.save },
        { id: 'cancelNote', label: NOTE_TEXT.cancel },
      ],
      Math.round((VIEW_WIDTH - MENU_ROW_W) / 2),
      menuY,
    );
    this.box = this.makeBox();
    this.setOpen(false);
  }

  private makeBox(): HTMLTextAreaElement {
    const box = document.createElement('textarea');
    box.maxLength = NOTES.maxChars;
    box.setAttribute('aria-label', NOTE_TEXT.title);
    box.dataset.flow = 'note';
    const s = box.style;
    s.position = 'fixed';
    s.resize = 'none';
    s.boxSizing = 'border-box';
    s.border = `1px solid ${paletteHex('brass')}`;
    s.outline = 'none';
    s.background = paletteHex('ink');
    s.color = paletteHex(TEXT_STYLES.body.fill);
    s.fontFamily = `"${FONT_FILES[TEXT_STYLES.body.font].family}", sans-serif`;
    s.zIndex = '10';
    box.addEventListener('input', () => this.showCount());
    box.addEventListener('keydown', (e) => {
      // Nothing typed here reaches the page's other listeners (the game's keyboard is off too).
      e.stopPropagation();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.onSave(box.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.onCancel();
      }
    });
    document.body.appendChild(box);
    this.scene.events.once('destroy', () => box.remove());
    return box;
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Opens an empty note; `onSave` gets its text, `onCancel` runs on Cancel or Esc. */
  show(onSave: (text: string) => void, onCancel: () => void): void {
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.box.value = '';
    this.setOpen(true);
    this.place();
    this.showCount();
    this.box.focus();
  }

  hide(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    for (const o of [this.dim, this.panel]) o.setVisible(open);
    this.title.setVisible(open);
    this.count.setVisible(open);
    this.menu.setVisible(open);
    this.box.style.display = open ? 'block' : 'none';
    // Typing never reaches the game's keys while the note is open.
    const keyboard = this.scene.input.keyboard?.manager;
    if (keyboard) keyboard.enabled = !open;
    if (!open) this.box.blur();
  }

  private showCount(): void {
    const P = NOTE_PANEL;
    this.count.set(NOTE_TEXT.count(this.box.value.length));
    this.count.moveTo(P.x + P.w - P.pad - this.count.width, P.y + P.countY);
  }

  /** Keeps the text box over its spot on the canvas, wherever the canvas is and however it's zoomed. */
  place(): void {
    if (!this.open) return;
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const k = canvas.width / VIEW_WIDTH;
    const P = NOTE_PANEL;
    const s = this.box.style;
    s.left = `${canvas.left + (P.x + P.pad) * k}px`;
    s.top = `${canvas.top + (P.y + P.box.y) * k}px`;
    s.width = `${(P.w - 2 * P.pad) * k}px`;
    s.height = `${P.box.h * k}px`;
    s.fontSize = `${P.fontPx * k}px`;
    s.lineHeight = `${P.lineHeight * k}px`;
    s.padding = `${3 * k}px`;
  }

  pointAt(x: number, y: number): void {
    if (this.open) this.menu.pointAt(x, y);
  }

  /** A click on Save note or Cancel. */
  click(x: number, y: number): boolean {
    const id = this.open ? this.menu.click(x, y)?.id : undefined;
    if (id === 'saveNote') this.onSave(this.box.value);
    else if (id === 'cancelNote') this.onCancel();
    return id !== undefined;
  }

  get ui(): NoteUi {
    return { rows: this.open ? this.menu.shown : [], text: this.box.value, open: this.open };
  }
}
