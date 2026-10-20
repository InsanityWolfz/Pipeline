import type { CardUi } from './CardView';
import type { FlowState } from './flowMachine';
import type { MenuRowShown } from './MenuColumn';
import type { SlotStatus } from './saveStore';
import type { TitleUi } from './TitleView';

// What the test hook reports of the flow (042): `__GAME__.flow()` and `ui().flow`.

export interface FlowReport {
  state: FlowState;
  hasSave: boolean;
  saveStatus: SlotStatus;
  /** Saves written this session. */
  saves: number;
  /** Feedback notes stored. */
  notes: number;
}

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

/** Whether a URL is a dev or test start that skips the title and never touches the save slot (042.1), the sandbox's (044) among them. */
export function skipsTitle(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('start') || params.has('playtest') || params.has('sandbox');
}

/** Whether a URL starts the sandbox (044): Settings hides its save rows and shows the panel's key. */
export const isSandboxUrl = (search: string): boolean => new URLSearchParams(search).has('sandbox');
