import { Scene } from 'phaser';
import { CONFIRMS, FAREWELL, type ConfirmKind } from '../../data/titleScreen';
import { TUTORIAL_START } from '../../data/player';
import { SAVE_TEXT } from '../../data/save';
import { SOUNDS } from '../../data/sounds';
import { FOUNDRY_ROOM } from '../../data/rooms';
import { createSim } from '../../sim/state';
import { wakeInFoundry } from '../../sim/save';
import { fontsReady } from '../fonts';
import type { GameScene } from '../GameScene';
import { codeOf } from '../keys';
import { MENU_HOVER_EVENT } from '../menuFeedback';
import { parseStart } from '../playtest';
import { currentFit, toView, type ScreenFit } from '../scale';
import { parseSeed } from '../seed';
import { SoundView } from '../SoundView';
import { bakeVectors } from '../vector/textures';
import { CardView } from './CardView';
import { continueShown } from './continueLine';
import { loadNotes } from './feedbackStore';
import { FlowMachine, type FlowEvent } from './flowMachine';
import { skipsTitle, type FlowReport, type FlowUi } from './flowTypes';
import { GameRunner } from './GameRunner';
import type { GameHost } from './host';
import { NoticeView } from './NoticeView';
import { applyImport, exportDamaged, exportSave, pickImport } from './saveFiles';
import { SaveStore, type SlotRead } from './saveStore';
import { SettingsScreen } from './SettingsScreen';
import { settings } from './settingsStore';
import { storageBlocked } from './storage';
import { TitleView } from './TitleView';

// The flow scene (042): runs for the whole session, drawn over the game. It owns the flow machine and every screen
// that isn't the game itself (the title, Settings, the cards, notices) and the save slot, and starts and ends games
// (GameRunner). A `?start=…` or `?playtest` URL skips the title and never touches the save slot (042.1).

export class FlowScene extends Scene {
  private readonly search: string;
  readonly machine: FlowMachine;
  readonly saves: SaveStore;
  private slot: SlotRead = { status: 'none', envelope: null, state: null, raw: null };
  private fit: ScreenFit = currentFit();
  private runner?: GameRunner;
  private sounds?: SoundView;
  private title?: TitleView;
  private card?: CardView;
  private notice?: NoticeView;
  private settingsScreen?: SettingsScreen;
  /** Input taken this frame, acted on next frame: the game scene below sees this frame's keys and clicks while still covered, so none reach it. */
  private queued: { frame: number; run: () => void }[] = [];
  private built = false;
  /** What the running game asks of the flow. */
  private readonly host: GameHost;

  constructor(search: string) {
    super('flow');
    this.search = search;
    const m = new FlowMachine(skipsTitle(search) ? 'play' : 'title');
    this.machine = m;
    this.saves = new SaveStore(!skipsTitle(search));
    this.host = {
      get stepping(): boolean {
        return m.stepping;
      },
      get paused(): boolean {
        return m.state === 'paused';
      },
      get covered(): boolean {
        return m.state !== 'play' && m.state !== 'paused';
      },
      pause: () => void this.send('pause'),
      resume: () => void this.send('resume'),
      pauseAction: (action) => this.pauseAction(action),
      afterTick: (sim) => {
        // The slot now holds a save; the title reads it in full when it's next shown.
        if (this.runner?.afterTick(sim)) this.slot = { ...this.slot, status: 'ok' };
      },
    };
  }

  preload(): void {
    SoundView.preload(this);
  }

  create(): void {
    bakeVectors(this, this.fit.scale);
    this.applyFit(this.fit);
    this.sounds = new SoundView(this, true);
    this.events.on(MENU_HOVER_EVENT, () => this.sounds?.play(SOUNDS.menuHover));
    this.title = new TitleView(this, this.fit.scale);
    this.card = new CardView(this);
    this.notice = new NoticeView(this);
    this.runner = new GameRunner(this.game, this.saves, () => this.scene.bringToTop(), (m) => this.notice?.show(m));
    this.settingsScreen = new SettingsScreen(this, {
      back: () => {
        this.settingsScreen?.close();
        this.send('back');
      },
      exportSave: () => exportSave(),
      importSave: () => void this.importSave(),
      exportDamaged: () => exportDamaged(),
      damaged: () => this.slot.status === 'corrupt' || this.slot.status === 'too-old',
      notes: () => loadNotes().length,
      click: () => this.sounds?.play(SOUNDS.menuClick),
    });
    this.input.on('pointermove', (p: { x: number; y: number }) => this.pointAt(p));
    this.input.on('pointerdown', (p: { x: number; y: number }) => this.later(() => this.click(p)));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.later(() => this.keyDown(e)));
    this.built = true;
    if (this.saves.enabled && storageBlocked()) this.notice.show(SAVE_TEXT.blocked);
    if (this.machine.state === 'play') this.runner.start(createSim(parseSeed(this.search), { start: parseStart(this.search) }), this.host, false, this.fit);
    else this.readSlot();
    this.sync();
  }

  /** The scene has built its screens and the fonts are loaded. */
  get ready(): boolean {
    return this.built && fontsReady();
  }

  /** The running game scene, or null on the title. */
  get live(): GameScene | null {
    return this.runner?.scene ?? null;
  }

  /** Matches the camera (and the running game's) to the backbuffer. */
  applyFit(fit: ScreenFit): void {
    this.fit = fit;
    if (this.cameras?.main) this.cameras.main.setOrigin(0, 0).setSize(fit.width, fit.height).setZoom(fit.scale);
    this.live?.applyFit(fit);
  }

  override update(_time: number, delta: number): void {
    const frame = this.game.loop.frame;
    const due = this.queued.filter((q) => q.frame < frame);
    this.queued = this.queued.filter((q) => q.frame >= frame);
    for (const q of due) q.run();
    this.title?.update(delta);
    this.notice?.update(delta);
    this.sync();
    this.sounds?.endFrame();
  }

  /** Applies a flow event, logging the change. */
  send(event: FlowEvent): boolean {
    const from = this.machine.state;
    const changed = this.machine.send(event);
    if (changed) console.info(`[flow] ${from} → ${this.machine.state} (${event})`);
    this.sync();
    return changed;
  }

  /** Runs `run` next frame (see `queued`), unless the flow has moved on since: a click that opened a card isn't also a click on it. */
  private later(run: () => void): void {
    const at = this.machine.state;
    this.queued.push({ frame: this.game.loop.frame, run: () => this.machine.state === at && run() });
  }

  /** Reads the save slot again and shows it on the title's Continue row. */
  private readSlot(): void {
    this.slot = this.saves.read();
    this.title?.setContinue(continueShown(this.slot));
  }

  /** Shows what the state calls for. */
  private sync(): void {
    const s = this.machine.state;
    const onTitle = this.machine.base === 'title' || s === 'farewell';
    this.title?.setVisible(onTitle);
    // The title's ambience is the foundry's loop (042); in a game, the game plays its rooms' loops.
    this.sounds?.ambience(onTitle ? FOUNDRY_ROOM : '');
    if (s !== 'farewell' && s !== 'confirm' && this.card?.isOpen) this.card.hide();
    // Settings stays under a confirm or the note opened over it, and closes when the flow leaves it.
    if (s !== 'settings' && s !== 'confirm' && s !== 'feedback' && this.settingsScreen?.isOpen) this.settingsScreen.close();
  }

  private view(p: { x: number; y: number }): { x: number; y: number } {
    return toView(p.x, p.y, this.fit.scale);
  }

  private pointAt(p: { x: number; y: number }): void {
    const v = this.view(p);
    const s = this.machine.state;
    if (this.card?.isOpen) this.card.pointAt(v.x, v.y);
    else if (s === 'settings') this.settingsScreen?.pointAt(v.x, v.y);
    else if (s === 'title') this.title?.pointAt(v.x, v.y);
  }

  private click(p: { x: number; y: number }): void {
    const v = this.view(p);
    const s = this.machine.state;
    if (this.card?.isOpen) {
      if (this.card.click(v.x, v.y)) this.sounds?.play(SOUNDS.menuClick);
      return;
    }
    if (s === 'settings') return this.settingsScreen?.click(v.x, v.y);
    if (s !== 'title') return;
    const row = this.title?.click(v.x, v.y);
    if (!row) return;
    this.sounds?.play(SOUNDS.menuClick);
    if (row === 'newGame') this.newGame();
    else if (row === 'continue') this.continueGame();
    else if (row === 'settings') this.openSettings();
    else this.quit();
  }

  /** A key on a flow screen: Settings takes it first (a binding, Esc), then Esc cancels a confirm; the feedback key opens the note. */
  private keyDown(e: KeyboardEvent): void {
    const isEsc = e.keyCode === codeOf('ESC');
    if (this.machine.state === 'settings' && this.settingsScreen?.keyDown(e.keyCode, isEsc)) return;
    if (isEsc && this.machine.state === 'confirm') this.card?.press('no');
    else if (e.keyCode === codeOf(settings().bindings.feedback)) this.openFeedback();
  }

  /** The note (042): built in its own slice. */
  private openFeedback(): void {
    return;
  }

  private openSettings(): void {
    if (this.send('settings')) this.settingsScreen?.open();
  }

  /** Shows a confirm card over the current screen: yes runs `onYes`, no runs `onNo` (or cancels). */
  private ask(kind: ConfirmKind, onYes: () => void, onNo: () => void = () => void this.send('cancel')): void {
    if (!this.send('confirm')) return;
    const c = CONFIRMS[kind];
    this.card?.show([{ text: c.text, style: 'display' }], [
      { id: 'yes', label: c.yes, run: onYes },
      { id: 'no', label: c.no, run: onNo },
    ]);
  }

  /** New game: at once with no save; with one, after a confirm that moves it to the backup key (042.6). */
  private newGame(): void {
    const start = (): void => {
      if (this.send('start')) this.runner?.start(createSim(parseSeed(this.search), { start: TUTORIAL_START }), this.host, false, this.fit);
    };
    if (this.slot.status === 'none') return start();
    this.ask('newGame', () => {
      this.saves.clearToBackup();
      this.readSlot();
      start();
    });
  }

  /** Continue: the save restored, waking in the foundry as a KO's wake does. */
  private continueGame(): void {
    this.readSlot();
    const { state, envelope } = this.slot;
    if (this.slot.status !== 'ok' || !state || !envelope || !this.send('start')) return;
    wakeInFoundry(state);
    this.runner?.start(state, this.host, envelope.meta.endCardSeen, this.fit);
  }

  /** Quit (042.13): try to close the tab, which works only where the browser allows it, then say goodbye. */
  private quit(): void {
    window.close();
    if (!this.send('quit')) return;
    this.card?.show([{ text: FAREWELL.text, style: 'display' }], [{ id: 'farewellBack', label: FAREWELL.back, run: () => void this.send('back') }]);
  }

  /** The pause menu's Settings and Quit to title (042). */
  private pauseAction(action: 'settings' | 'quit'): void {
    if (action === 'settings') return this.openSettings();
    const inFoundry = this.live?.sim.roomId === FOUNDRY_ROOM;
    this.ask(inFoundry ? 'quitInFoundry' : 'quitOutside', () => {
      if (!this.send('toTitle')) return;
      this.runner?.end();
      this.readSlot();
    });
  }

  /** Import save: the picker, then a confirm; a bad file says why and changes nothing (042). */
  private async importSave(): Promise<void> {
    const picked = await pickImport();
    if (!picked) return;
    if ('bad' in picked) return this.notice?.show(picked.bad);
    this.ask('importSave', () => {
      applyImport(this.saves, picked.good);
      this.send('accept');
      this.readSlot();
      this.settingsScreen?.refresh();
      this.notice?.show(SAVE_TEXT.imported);
    });
  }

  /** The flow for the test hook. */
  report(): FlowReport {
    return { state: this.machine.state, hasSave: this.slot.status !== 'none', saveStatus: this.slot.status, saves: this.saves.saves, notes: loadNotes().length };
  }

  get ui(): FlowUi {
    const t = this.title;
    const s = this.settingsScreen;
    return {
      state: this.machine.state,
      title: t?.isVisible ? t.ui : null,
      card: this.card?.ui ?? null,
      settings: s?.rows.length ? { rows: s.rows } : null,
      bindings: s?.keyRows.length ? { rows: s.keyRows, waiting: s.waiting } : null,
      endCard: null,
      note: null,
      notice: this.notice?.current ?? null,
    };
  }
}
