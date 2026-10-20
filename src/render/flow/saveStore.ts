import { SAVE_FORMAT, SAVE_VERSION, STORAGE_KEYS } from '../../data/save';
import { makeEnvelope, readSave, snapshot, type SaveEnvelope, type SaveStatus } from '../../sim/save';
import type { SimState } from '../../sim/state';
import { buildId, readKey, removeKey, writeKey } from './storage';

// The one save slot (042) in browser storage: written on each foundry entry, read for the title's Continue, moved to
// the backup key when New game or an import replaces it (042.6). A dev or test URL never touches it (042.1), and a
// save this build can't read (newer, corrupt, too old) is never overwritten until New game or an import.

export type SlotStatus = 'none' | SaveStatus;

/** What the slot holds now. */
export interface SlotRead {
  status: SlotStatus;
  /** The loaded save, when `ok`. */
  envelope: SaveEnvelope | null;
  state: SimState | null;
  /** The stored text as it is (for Export damaged save). */
  raw: string | null;
}

const NONE: SlotRead = { status: 'none', envelope: null, state: null, raw: null };

/** The slot's status from its text without restoring it: enough to know whether this build may write over it. */
export function peekStatus(raw: string | null): SlotStatus {
  if (raw === null) return 'none';
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || !('format' in data) || data.format !== SAVE_FORMAT || !('version' in data)) return 'corrupt';
    const v = data.version;
    if (typeof v !== 'number') return 'corrupt';
    return v > SAVE_VERSION ? 'newer' : 'ok';
  } catch {
    return 'corrupt';
  }
}

export class SaveStore {
  /** False under a dev or test URL (042.1): nothing is read or written. */
  readonly enabled: boolean;
  /** Saves written this session (`flow().saves`). */
  saves = 0;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  /** The slot, loaded and checked. */
  read(): SlotRead {
    if (!this.enabled) return NONE;
    const raw = readKey(STORAGE_KEYS.save);
    if (raw === null) return NONE;
    const r = readSave(raw);
    return r.status === 'ok' ? { status: 'ok', envelope: r.envelope, state: r.state, raw } : { status: r.status, envelope: null, state: null, raw };
  }

  /**
   * Saves the game as it is this tick (a foundry entry). Returns 'saved', 'skipped' (a dev URL, or a save in the slot
   * this build can't read, which it never overwrites), or 'failed' (storage full, blocked or missing).
   */
  write(sim: SimState, endCardSeen: boolean, now: Date): 'saved' | 'skipped' | 'failed' {
    if (!this.enabled) return 'skipped';
    const held = peekStatus(readKey(STORAGE_KEYS.save));
    if (held !== 'none' && held !== 'ok') return 'skipped';
    const env = makeEnvelope(snapshot(sim), { build: buildId(), savedAt: now.toISOString(), endCardSeen });
    if (!writeKey(STORAGE_KEYS.save, JSON.stringify(env))) return 'failed';
    this.saves += 1;
    return 'saved';
  }

  /** New game (042.6): the old save goes to the backup key and the slot empties. */
  clearToBackup(): void {
    if (!this.enabled) return;
    const raw = readKey(STORAGE_KEYS.save);
    if (raw !== null) writeKey(STORAGE_KEYS.backup, raw);
    removeKey(STORAGE_KEYS.save);
  }

  /** An import (042.6): the old save goes to the backup key, the imported envelope takes the slot. */
  replace(env: SaveEnvelope): boolean {
    if (!this.enabled) return false;
    this.clearToBackup();
    return writeKey(STORAGE_KEYS.save, JSON.stringify(env));
  }
}
