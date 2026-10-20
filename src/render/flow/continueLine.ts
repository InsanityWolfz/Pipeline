import { CONTINUE_LINE } from '../../data/titleScreen';
import type { SimState } from '../../sim/state';
import type { SlotRead } from './saveStore';
import { pad2 } from './files';

// The title's Continue row (042): greyed out with no save or one that can't be loaded (with why); with a save, one
// line under it: "Level 8 · 3 pylons · Bulwark · saved 19 Oct, 21:40". Pure, for the unit tests.

/** "19 Oct, 21:40", in the player's own time zone. */
export function savedWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '?';
  const pad = pad2;
  return `${d.getDate()} ${CONTINUE_LINE.months[d.getMonth()] ?? ''}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The line for a loaded save. */
export function saveLine(state: Pick<SimState, 'level' | 'claims' | 'bossDefeats'>, savedAt: string): string {
  const L = CONTINUE_LINE;
  const bosses = state.bossDefeats.map((b) => L.bosses[b] ?? b);
  return [L.level(state.level), L.pylons(state.claims.length), ...bosses, L.saved(savedWhen(savedAt))].join(L.join);
}

/** Whether Continue can be used, and its line (or none). */
export function continueShown(slot: SlotRead): { usable: boolean; line: string | null } {
  if (slot.status === 'ok' && slot.state && slot.envelope) return { usable: true, line: saveLine(slot.state, slot.envelope.savedAt) };
  if (slot.status === 'newer') return { usable: false, line: CONTINUE_LINE.newer };
  if (slot.status === 'corrupt' || slot.status === 'too-old') return { usable: false, line: CONTINUE_LINE.corrupt };
  return { usable: false, line: null };
}
