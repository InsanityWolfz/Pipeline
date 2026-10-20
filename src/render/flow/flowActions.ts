import { CONFIRMS, FAREWELL, type ConfirmKind } from '../../data/titleScreen';
import { SAVE_TEXT } from '../../data/save';
import { FOUNDRY_ROOM } from '../../data/rooms';
import { wakeInFoundry } from '../../sim/save';
import type { SimState } from '../../sim/state';
import type { CardView } from './CardView';
import type { FlowEvent } from './flowMachine';
import { applyImport, pickImport } from './saveFiles';
import type { SaveStore, SlotRead } from './saveStore';

// What the title's rows, the pause menu's Settings and Quit to title, and Import save do (042), with their confirms.
// The flow scene gives them what they need; they decide nothing about screens beyond the flow events they send.

export interface FlowContext {
  send(event: FlowEvent): boolean;
  readonly card: CardView;
  readonly saves: SaveStore;
  slot(): SlotRead;
  readSlot(): void;
  /** Starts a game: the real start (012), or a restored save with its end card seen or not. */
  startNew(): void;
  startSaved(state: SimState, endCardSeen: boolean): void;
  endGame(): void;
  /** The running game's room, or null on the title. */
  liveRoom(): string | null;
  openSettings(): void;
  refreshSettings(): void;
  notice(message: string): void;
}

export class FlowActions {
  private readonly c: FlowContext;

  constructor(context: FlowContext) {
    this.c = context;
  }

  /** Shows a confirm card over the current screen: yes runs `onYes`, no runs `onNo` (or cancels). */
  ask(kind: ConfirmKind, onYes: () => void, onNo: () => void = () => void this.c.send('cancel')): void {
    if (!this.c.send('confirm')) return;
    const k = CONFIRMS[kind];
    this.c.card.show([{ text: k.text, style: 'display' }], [
      { id: 'yes', label: k.yes, run: onYes },
      { id: 'no', label: k.no, run: onNo },
    ]);
  }

  /** New game: at once with no save; with one, after a confirm that moves it to the backup key (042.6). */
  newGame(): void {
    const start = (): void => {
      if (this.c.send('start')) this.c.startNew();
    };
    if (this.c.slot().status === 'none') return start();
    this.ask('newGame', () => {
      this.c.saves.clearToBackup();
      this.c.readSlot();
      start();
    });
  }

  /** Continue: the save restored, waking in the foundry as a KO's wake does. */
  continueGame(): void {
    this.c.readSlot();
    const { status, state, envelope } = this.c.slot();
    if (status !== 'ok' || !state || !envelope || !this.c.send('start')) return;
    wakeInFoundry(state);
    this.c.startSaved(state, envelope.meta.endCardSeen);
  }

  /** Quit (042.13): try to close the tab, which works only where the browser allows it, then say goodbye. */
  quit(): void {
    window.close();
    if (!this.c.send('quit')) return;
    this.c.card.show([{ text: FAREWELL.text, style: 'display' }], [{ id: 'farewellBack', label: FAREWELL.back, run: () => void this.c.send('back') }]);
  }

  /** The pause menu's Settings and Quit to title: the confirm says what's lost outside the foundry. */
  pauseAction(action: 'settings' | 'quit'): void {
    if (action === 'settings') return this.c.openSettings();
    this.ask(this.c.liveRoom() === FOUNDRY_ROOM ? 'quitInFoundry' : 'quitOutside', () => {
      if (!this.c.send('toTitle')) return;
      this.c.endGame();
      this.c.readSlot();
    });
  }

  /** Import save: the picker, then a confirm; a bad file says why and changes nothing. */
  async importSave(): Promise<void> {
    const picked = await pickImport();
    if (!picked) return;
    if ('bad' in picked) return this.c.notice(picked.bad);
    this.ask('importSave', () => {
      applyImport(this.c.saves, picked.good);
      this.c.send('accept');
      this.c.readSlot();
      this.c.refreshSettings();
      this.c.notice(SAVE_TEXT.imported);
    });
  }
}
