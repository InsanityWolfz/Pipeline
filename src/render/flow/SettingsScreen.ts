import type { Scene } from 'phaser';
import { BIND_ACTIONS, DEFAULT_BINDINGS, type BindAction } from '../../data/settings';
import { nameOf } from '../keys';
import { rebind, settings, stepVolume, updateSettings } from './settingsStore';
import { SettingsView } from './SettingsView';
import type { MenuRowShown } from './MenuColumn';

// Settings' behaviour (042): the volume steppers, the toggles, the key list (click a row, press a key; Esc cancels; a
// used key swaps; Reset to defaults), and the save rows, which the flow scene carries out.

/** What Settings asks of the flow scene. */
export interface SettingsActions {
  back(): void;
  exportSave(): void;
  importSave(): void;
  exportDamaged(): void;
  /** Whether the slot holds a save this build can't read (Export damaged save shows). */
  damaged(): boolean;
  notes(): number;
  click(): void;
  /** 044: the sandbox: no save rows (it never touches the save), and the panel's key in the key list. */
  sandbox: boolean;
}

const VOLUMES = ['master', 'music', 'effects'] as const;
type Volume = (typeof VOLUMES)[number];
const isVolume = (id: string): id is Volume => (VOLUMES as readonly string[]).includes(id);
const isAction = (id: string): id is BindAction => (BIND_ACTIONS as readonly string[]).includes(id);

export class SettingsScreen {
  private readonly view: SettingsView;
  private readonly act: SettingsActions;

  constructor(scene: Scene, actions: SettingsActions) {
    this.view = new SettingsView(scene);
    this.act = actions;
  }

  get isOpen(): boolean {
    return this.view.isOpen;
  }

  open(): void {
    this.view.showMain({ settings: settings(), damaged: this.act.damaged(), notes: this.act.notes(), saveRows: !this.act.sandbox });
  }

  close(): void {
    this.view.close();
  }

  /** Redraws what's showing (after a change elsewhere: a note saved, an import). */
  refresh(): void {
    if (!this.view.isOpen) return;
    if (this.view.showingKeys) this.view.showKeys(settings(), this.view.waiting, this.act.sandbox);
    else this.open();
  }

  pointAt(x: number, y: number): void {
    this.view.pointAt(x, y);
  }

  click(x: number, y: number): void {
    const hit = this.view.click(x, y);
    if (!hit) return;
    this.act.click();
    const id = hit.id;
    if (this.view.showingKeys) return this.keysClick(id);
    const s = settings();
    if (isVolume(id)) {
      updateSettings({ [id]: stepVolume(s[id], hit.part === 'up' ? 1 : -1) });
    } else if (id === 'mute') updateSettings({ muted: !s.muted });
    else if (id === 'flashes') updateSettings({ flashes: !s.flashes });
    else if (id === 'keys') return this.view.showKeys(s, null, this.act.sandbox);
    else if (id === 'export') this.act.exportSave();
    else if (id === 'import') this.act.importSave();
    else if (id === 'damaged') this.act.exportDamaged();
    else if (id === 'back') return this.act.back();
    this.refresh();
  }

  private keysClick(id: string): void {
    if (id === 'keysBack') return this.open();
    if (id === 'reset') updateSettings({ bindings: { ...DEFAULT_BINDINGS } });
    this.view.showKeys(settings(), isAction(id) ? id : null, this.act.sandbox);
  }

  /** A key went down while Settings is open. Returns whether Settings used it. Esc backs out one level. */
  keyDown(code: number, isEsc: boolean): boolean {
    if (!this.view.isOpen) return false;
    const waiting = this.view.waiting;
    if (this.view.showingKeys && waiting && isAction(waiting)) {
      const name = nameOf(code);
      const next = !isEsc && name ? rebind(settings().bindings, waiting, name) : null;
      if (next) updateSettings({ bindings: next });
      this.view.showKeys(settings(), null, this.act.sandbox);
      return true;
    }
    if (!isEsc) return false;
    if (this.view.showingKeys) this.open();
    else this.act.back();
    return true;
  }

  get rows(): MenuRowShown[] {
    return this.view.rows;
  }

  get keyRows(): MenuRowShown[] {
    return this.view.keyRows;
  }

  get waiting(): string | null {
    return this.view.waiting;
  }
}
