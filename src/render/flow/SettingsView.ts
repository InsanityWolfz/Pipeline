import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { BINDINGS_PANEL, FLOW_DIM, FLOW_ROWS, MENU_ROW_W, SETTINGS_PANEL } from '../../data/flowLayout';
import { ACTION_LABELS, BIND_ACTIONS, SETTINGS_TEXT, type Settings } from '../../data/settings';
import { colorOf } from '../color';
import { keyLabel } from '../keyHint';
import { drawTablet } from '../tablet';
import { TextLine } from '../textLine';
import { MenuColumn, type MenuHit, type MenuRowShown, type MenuRowSpec } from './MenuColumn';

// Settings (042): a 020 tablet over the title or the paused game with the volume rows (− and +), Mute, Flashes, Key
// bindings, Export save, Import save, Export damaged save (when there is one) and Back. Key bindings swaps it for the
// key list: two columns, one row per action with its key, Reset to defaults and Back.

/** What Settings shows beyond the settings themselves. */
export interface SettingsModel {
  settings: Readonly<Settings>;
  damaged: boolean;
  notes: number;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

export class SettingsView {
  private readonly dim: GameObjects.Rectangle;
  private readonly panel: GameObjects.Graphics;
  private readonly title: TextLine;
  private readonly note: TextLine;
  private readonly main: MenuColumn;
  private readonly keyColumns: [MenuColumn, MenuColumn];
  private mode: 'closed' | 'main' | 'keys' = 'closed';
  /** The action waiting for a key in the key list, or null. */
  waiting: string | null = null;

  constructor(scene: Scene, depth: number = DEPTHS.flowSettings) {
    this.dim = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, colorOf(FLOW_DIM.color), FLOW_DIM.alpha).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1);
    this.title = new TextLine(scene, 0, 0, depth + 3, false, 'title');
    this.note = new TextLine(scene, 0, 0, depth + 3, false, 'body');
    this.main = new MenuColumn(scene, 0, 0, FLOW_ROWS, depth + 2);
    this.keyColumns = [new MenuColumn(scene, 0, 0, FLOW_ROWS, depth + 2), new MenuColumn(scene, 0, 0, FLOW_ROWS, depth + 2)];
    this.close();
  }

  get isOpen(): boolean {
    return this.mode !== 'closed';
  }

  get showingKeys(): boolean {
    return this.mode === 'keys';
  }

  /** Opens (or redraws) the main list. */
  showMain(m: SettingsModel): void {
    this.mode = 'main';
    this.waiting = null;
    const s = m.settings;
    const T = SETTINGS_TEXT.rows;
    const onOff = (on: boolean): string => (on ? SETTINGS_TEXT.on : SETTINGS_TEXT.off);
    const rows: MenuRowSpec[] = [
      { id: 'master', label: T.master, value: pct(s.master), stepper: true },
      { id: 'music', label: T.music, value: pct(s.music), stepper: true },
      { id: 'effects', label: T.effects, value: pct(s.effects), stepper: true },
      { id: 'mute', label: T.mute, value: onOff(s.muted) },
      { id: 'flashes', label: T.flashes, value: onOff(s.flashes) },
      { id: 'keys', label: T.keys },
      { id: 'export', label: T.export, sub: SETTINGS_TEXT.notes(m.notes) },
      { id: 'import', label: T.import },
      ...(m.damaged ? [{ id: 'damaged', label: T.damaged }] : []),
      { id: 'back', label: T.back },
    ];
    const P = SETTINGS_PANEL;
    const h = P.titleH + MenuColumn.heightOf(rows, FLOW_ROWS) + 2 * P.pad;
    const w = MENU_ROW_W + 2 * P.pad;
    const x = Math.round((VIEW_WIDTH - w) / 2);
    const y = Math.max(P.y, Math.round((VIEW_HEIGHT - h) / 2));
    this.frame(x, y, w, h, SETTINGS_TEXT.title, null, P.titleY);
    this.main.set(rows, x + P.pad, y + P.pad + P.titleH);
    this.setVisible();
  }

  /** Opens (or redraws) the key list. */
  showKeys(s: Readonly<Settings>, waiting: string | null): void {
    this.mode = 'keys';
    this.waiting = waiting;
    const rows: MenuRowSpec[] = [
      ...BIND_ACTIONS.map((a) => ({ id: a, label: ACTION_LABELS[a], value: a === waiting ? SETTINGS_TEXT.waiting : keyLabel(s.bindings[a]) })),
      { id: 'reset', label: SETTINGS_TEXT.reset },
      { id: 'keysBack', label: SETTINGS_TEXT.rows.back },
    ];
    const B = BINDINGS_PANEL;
    const cols = [rows.slice(0, B.perColumn), rows.slice(B.perColumn)];
    const colH = Math.max(...cols.map((c) => MenuColumn.heightOf(c, FLOW_ROWS)));
    const w = 2 * MENU_ROW_W + B.columnGap + 2 * B.pad;
    const h = B.titleH + colH + 2 * B.pad;
    const x = Math.round((VIEW_WIDTH - w) / 2);
    const y = Math.max(B.y, Math.round((VIEW_HEIGHT - h) / 2));
    this.frame(x, y, w, h, SETTINGS_TEXT.keysTitle, SETTINGS_TEXT.keysNote, B.titleY, B.noteY);
    cols.forEach((c, i) => this.keyColumns[i]?.set(c, x + B.pad + i * (MENU_ROW_W + B.columnGap), y + B.pad + B.titleH));
    this.setVisible();
  }

  private frame(x: number, y: number, w: number, h: number, title: string, note: string | null, titleY: number, noteY = 0): void {
    this.panel.clear();
    drawTablet(this.panel, x, y, w, h);
    this.title.set(title).moveTo(Math.round(VIEW_WIDTH / 2 - this.title.width / 2), y + titleY);
    this.note.set(note ?? '').moveTo(Math.round(VIEW_WIDTH / 2 - this.note.width / 2), y + noteY);
  }

  close(): void {
    this.mode = 'closed';
    this.waiting = null;
    this.setVisible();
  }

  private setVisible(): void {
    const open = this.mode !== 'closed';
    for (const o of [this.dim, this.panel]) o.setVisible(open);
    this.title.setVisible(open);
    this.note.setVisible(this.mode === 'keys');
    this.main.setVisible(this.mode === 'main');
    for (const c of this.keyColumns) c.setVisible(this.mode === 'keys');
  }

  pointAt(x: number, y: number): void {
    if (this.mode === 'main') this.main.pointAt(x, y);
    else if (this.mode === 'keys') for (const c of this.keyColumns) c.pointAt(x, y);
  }

  click(x: number, y: number): MenuHit | null {
    if (this.mode === 'main') return this.main.click(x, y);
    if (this.mode === 'keys') return this.keyColumns[0].click(x, y) ?? this.keyColumns[1].click(x, y);
    return null;
  }

  get rows(): MenuRowShown[] {
    return this.mode === 'main' ? this.main.shown : [];
  }

  get keyRows(): MenuRowShown[] {
    return this.mode === 'keys' ? [...this.keyColumns[0].shown, ...this.keyColumns[1].shown] : [];
  }
}
