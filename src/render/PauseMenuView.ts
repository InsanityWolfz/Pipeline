import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { PAUSE_MENU } from '../data/hudLayout';
import { colorOf } from './color';
import { PAUSE_ROWS, pauseRows } from './craftMenuLayout';
import { inRect } from './foundryLayout';
import { flashRow, RowHover } from './menuFeedback';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** What a click on the pause menu asks for. */
export type PauseAction = 'mute' | 'volumeDown' | 'volumeUp' | 'resume';

/** The sound settings the menu shows. */
export interface SoundShown {
  muted: boolean;
  volume: number;
}

// The pause menu (020): Esc stops the world and shows this over it, a carved title
// card and rows for the sound settings (on/off, master volume) and resume. Rows
// light under the cursor and flash when pressed, like every menu.
export class PauseMenuView {
  private readonly scene: Scene;
  private readonly dim: GameObjects.Rectangle;
  private readonly panel: GameObjects.Graphics;
  private readonly rows: GameObjects.Image[];
  private readonly texts: TextLine[] = [];
  private readonly values: TextLine[];
  private readonly hover: RowHover;
  private open = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.hover = new RowHover(scene);
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, depth: number): T => {
      o.setScrollFactor(0).setDepth(depth);
      return o;
    };
    const P = PAUSE_MENU;
    this.dim = fixed(scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, colorOf(P.dim.color), P.dim.alpha).setOrigin(0), DEPTHS.menu - 2);
    this.panel = fixed(scene.add.graphics(), DEPTHS.menu - 1);
    const rects = pauseRows();
    const first = rects[0] ?? { x: 0, y: 0, w: 0, h: 0 };
    const cardX = Math.round((VIEW_WIDTH - P.card.w) / 2);
    const cardY = first.y - P.card.gap - P.card.h;
    drawTablet(this.panel, cardX, cardY, P.card.w, P.card.h);
    const text = (x: number, y: number, words: string, style: 'title' | 'body' | 'display' = 'body', centre = false): TextLine => {
      const line = new TextLine(scene, x, y, DEPTHS.menu + 2, false, style).set(words);
      if (centre) line.moveTo(Math.round(VIEW_WIDTH / 2 - line.width / 2), y);
      this.texts.push(line);
      return line;
    };
    text(0, cardY + P.card.titleY, P.title, 'title', true);
    text(0, cardY + P.card.noteY, P.note, 'body', true);
    this.rows = rects.map((r) => fixed(addVector(scene, r.x, r.y, SPRITES.craftRow).setOrigin(0), DEPTHS.menu));
    for (const [i, r] of rects.entries()) {
      const name = PAUSE_ROWS[i] ?? 'resume';
      text(r.x + P.label.x, r.y + P.label.y, P.rows[name], 'display');
    }
    const sound = rects[0] ?? first;
    const volume = rects[1] ?? first;
    this.values = [text(sound.x + P.value.x, sound.y + P.value.y, ''), text(volume.x + P.value.x, volume.y + P.value.y, '')];
    text(volume.x + P.volume.down, volume.y + P.value.y, '−');
    text(volume.x + P.volume.up, volume.y + P.value.y, '+');
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of [this.dim, this.panel, ...this.rows]) o.setVisible(open);
    for (const t of this.texts) t.setVisible(open);
    if (!open) this.hover.set(-1);
  }

  /** While open, the whole screen is the menu: no press reaches the world. */
  overUi(): boolean {
    return this.open;
  }

  /** Shows the current sound settings. */
  update(sound: SoundShown): void {
    if (!this.open) return;
    this.values[0]?.set(sound.muted ? 'Off' : 'On');
    this.values[1]?.set(`${Math.round(sound.volume * 100)}%`);
  }

  /** The cursor is at a screen point: its row lights, with the hover sound on a new row. */
  pointAt(x: number, y: number): void {
    const i = this.open ? pauseRows().findIndex((r) => inRect(r, x, y)) : -1;
    if (!this.hover.set(i)) return;
    for (const [k, row] of this.rows.entries()) row.setFrame(this.hover.frame(k));
  }

  /** What a click at a screen point asks for, flashing its row; null off the rows. */
  click(x: number, y: number): PauseAction | null {
    if (!this.open) return null;
    const rects = pauseRows();
    const i = rects.findIndex((r) => inRect(r, x, y));
    const r = rects[i];
    if (!r) return null;
    flashRow(this.scene, r.x, r.y);
    const name = PAUSE_ROWS[i];
    if (name === 'sound') return 'mute';
    if (name === 'resume') return 'resume';
    // The volume row: its − lowers and its + raises; anywhere else on the row does nothing.
    const { down, up, hit } = PAUSE_MENU.volume;
    if (Math.abs(x - (r.x + down)) <= hit) return 'volumeDown';
    if (Math.abs(x - (r.x + up)) <= hit) return 'volumeUp';
    return null;
  }
}
