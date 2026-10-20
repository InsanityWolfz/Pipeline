import { Scene } from 'phaser';
import { CONFIRMS, FAREWELL, type ConfirmKind } from '../../data/titleScreen';
import { TUTORIAL_START } from '../../data/player';
import { SAVE_TEXT } from '../../data/save';
import { SOUNDS } from '../../data/sounds';
import { FOUNDRY_ROOM } from '../../data/rooms';
import { createSim, type SimState } from '../../sim/state';
import { wakeInFoundry } from '../../sim/save';
import { fontsReady } from '../fonts';
import { GameScene } from '../GameScene';
import { MENU_HOVER_EVENT } from '../menuFeedback';
import { parseStart } from '../playtest';
import { currentFit, toView, type ScreenFit } from '../scale';
import { parseSeed } from '../seed';
import { SoundView } from '../SoundView';
import { bakeVectors } from '../vector/textures';
import { CardView, type CardUi } from './CardView';
import { continueShown } from './continueLine';
import type { MenuRowShown } from './MenuColumn';
import { FlowMachine, type FlowEvent, type FlowState } from './flowMachine';
import type { GameHost } from './host';
import { NoticeView } from './NoticeView';
import { SaveStore, type SlotRead, type SlotStatus } from './saveStore';
import { storageBlocked } from './storage';
import { TitleView, type TitleUi } from './TitleView';

// The flow scene (042): runs for the whole session, drawn over the game. It owns the flow machine and every screen
// that isn't the game itself (the title, the cards, notices), the save slot, and starts and ends GameScenes: a fresh
// one, under a fresh key, for each New game or Continue, removed on Quit to title. A `?start=…` or `?playtest` URL
// skips the title and never touches the save slot (042.1).

/** The flow as the test hook reports it (042). */
export interface FlowReport {
  state: FlowState;
  hasSave: boolean;
  saveStatus: SlotStatus;
  /** Saves written this session. */
  saves: number;
  notes: number;
}

/** The flow screens as drawn, for `ui().flow`. */
export interface FlowUi {
  state: FlowState;
  title: TitleUi | null;
  /** A confirm or the farewell card. */
  card: CardUi | null;
  settings: { rows: MenuRowShown[] } | null;
  bindings: { rows: MenuRowShown[]; waiting: string | null } | null;
  endCard: CardUi | null;
  note: { rows: MenuRowShown[]; text: string; open: boolean } | null;
  /** The notice on screen ("Couldn't save…"), or null. */
  notice: string | null;
}

/** Whether a URL is a dev or test start that skips the title and never touches the save slot (042.1). */
export function skipsTitle(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('start') || params.has('playtest');
}

export class FlowScene extends Scene {
  private readonly search: string;
  readonly machine: FlowMachine;
  readonly saves: SaveStore;
  private slot: SlotRead = { status: 'none', envelope: null, state: null, raw: null };
  private fit: ScreenFit = currentFit();
  private sounds?: SoundView;
  private title?: TitleView;
  private card?: CardView;
  private notice?: NoticeView;
  /** What the open card's buttons do. */
  private cardActions: Record<string, () => void> = {};
  /** The running game, or null on the title. */
  running: GameScene | null = null;
  /** The running game's end card has been seen (042: saved in the envelope at the next foundry entry). */
  endCardSeen = false;
  private games = 0;
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
      pauseAction: () => undefined,
      afterTick: (sim) => this.afterTick(sim),
    };
  }

  preload(): void {
    SoundView.preload(this);
  }

  create(): void {
    bakeVectors(this, this.fit.scale);
    this.applyFit(this.fit);
    this.sounds = new SoundView(this, false);
    this.events.on(MENU_HOVER_EVENT, () => this.sounds?.play(SOUNDS.menuHover));
    this.title = new TitleView(this, this.fit.scale);
    this.card = new CardView(this);
    this.notice = new NoticeView(this);
    this.input.on('pointermove', (p: { x: number; y: number }) => this.pointAt(p));
    this.input.on('pointerdown', (p: { x: number; y: number }) => this.click(p));
    this.built = true;
    if (this.saves.enabled && storageBlocked()) this.notice.show(SAVE_TEXT.blocked);
    if (this.machine.state === 'play') this.startGame(createSim(parseSeed(this.search), { start: parseStart(this.search) }));
    else this.readSlot();
    this.sync();
  }

  /** The scene has built its screens and the fonts are loaded. */
  get ready(): boolean {
    return this.built && fontsReady();
  }

  /** The running game scene, or null on the title. */
  get live(): GameScene | null {
    return this.running;
  }

  /** Matches the camera (and the running game's) to the backbuffer. */
  applyFit(fit: ScreenFit): void {
    this.fit = fit;
    if (this.cameras?.main) this.cameras.main.setOrigin(0, 0).setSize(fit.width, fit.height).setZoom(fit.scale);
    this.running?.applyFit(fit);
  }

  override update(_time: number, delta: number): void {
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

  /** Reads the save slot again and shows it on the title's Continue row. */
  readSlot(): void {
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
  }

  private view(p: { x: number; y: number }): { x: number; y: number } {
    return toView(p.x, p.y, this.fit.scale);
  }

  private pointAt(p: { x: number; y: number }): void {
    const v = this.view(p);
    if (this.card?.isOpen) this.card.pointAt(v.x, v.y);
    else if (this.machine.state === 'title') this.title?.pointAt(v.x, v.y);
  }

  private click(p: { x: number; y: number }): void {
    const v = this.view(p);
    if (this.card?.isOpen) {
      const id = this.card.click(v.x, v.y);
      const act = id ? this.cardActions[id] : undefined;
      if (act) {
        this.sounds?.play(SOUNDS.menuClick);
        act();
      }
      return;
    }
    if (this.machine.state !== 'title') return;
    const row = this.title?.click(v.x, v.y);
    if (!row) return;
    this.sounds?.play(SOUNDS.menuClick);
    if (row === 'newGame') this.newGame();
    else if (row === 'continue') this.continueGame();
    else if (row === 'quit') this.quit();
  }

  /** Shows a confirm card over the current screen: its yes runs `onYes`, its no runs `onNo` (or cancels). */
  ask(kind: ConfirmKind, onYes: () => void, onNo: () => void = () => void this.send('cancel')): void {
    if (!this.send('confirm')) return;
    const c = CONFIRMS[kind];
    this.cardActions = { yes: onYes, no: onNo };
    this.card?.show([{ text: c.text, style: 'display' }], [
      { id: 'yes', label: c.yes },
      { id: 'no', label: c.no },
    ]);
  }

  /** New game: at once with no save; with one, after a confirm that moves it to the backup key (042.6). */
  private newGame(): void {
    const start = (): void => {
      if (!this.send('start')) return;
      this.endCardSeen = false;
      this.startGame(createSim(parseSeed(this.search), { start: TUTORIAL_START }));
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
    if (this.slot.status !== 'ok' || !state || !envelope) return;
    if (!this.send('start')) return;
    this.endCardSeen = envelope.meta.endCardSeen;
    wakeInFoundry(state);
    this.startGame(state);
  }

  /** Quit (042.13): try to close the tab, which works only where the browser allows it, then say goodbye. */
  private quit(): void {
    window.close();
    if (!this.send('quit')) return;
    this.cardActions = {
      farewellBack: () => {
        this.card?.hide();
        this.send('back');
      },
    };
    this.card?.show([{ text: FAREWELL.text, style: 'display' }], [{ id: 'farewellBack', label: FAREWELL.back }]);
  }

  /** After each tick: a foundry entry saves (042.2); a failed write says so and play goes on. */
  private afterTick(sim: SimState): void {
    if (sim.events.foundryArrivals.length === 0) return;
    const result = this.saves.write(sim, this.endCardSeen, new Date());
    if (result === 'failed') this.notice?.show(SAVE_TEXT.failed);
    // The slot now holds a save; the title reads it in full when it's next shown.
    if (result === 'saved') this.slot = { ...this.slot, status: 'ok' };
  }

  /** Starts a game on `sim`: a fresh GameScene under a fresh key, drawn under this scene. */
  private startGame(sim: SimState): void {
    this.endGame();
    const scene = new GameScene(sim, this.host);
    this.games += 1;
    this.game.scene.add(`game-${this.games}`, scene, true);
    this.scene.bringToTop();
    this.running = scene;
  }

  /** Discards the running game, if any. */
  endGame(): void {
    const old = this.running;
    if (!old) return;
    this.running = null;
    this.game.scene.remove(old.scene.key);
  }

  /** The flow for the test hook. */
  report(): FlowReport {
    return { state: this.machine.state, hasSave: this.slot.status !== 'none', saveStatus: this.slot.status, saves: this.saves.saves, notes: 0 };
  }

  get ui(): FlowUi {
    const onTitle = this.title?.isVisible ?? false;
    return { state: this.machine.state, title: onTitle ? (this.title?.ui ?? null) : null, card: this.card?.ui ?? null, settings: null, bindings: null, endCard: null, note: null, notice: this.notice?.current ?? null };
  }
}
