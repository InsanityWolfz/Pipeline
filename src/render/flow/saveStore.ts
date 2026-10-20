import { STORAGE_KEYS } from '../../data/save';
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
    // The slot read as Continue reads it: a save this build can't load is never written over.
    const raw = readKey(STORAGE_KEYS.save);
    if (raw !== null && readSave(raw).status !== 'ok') return 'skipped';
    const env = makeEnvelope(snapshot(sim), { build: buildId(), savedAt: now.toISOString(), endCardSeen });
    if (!writeKey(STORAGE_KEYS.save, JSON.stringify(env))) return 'failed';
    this.saves += 1;
    return 'saved';
  }

  /** Copies the slot to the backup key; false when there's a save and it couldn't be copied (storage full). */
  private backUp(): boolean {
    const raw = readKey(STORAGE_KEYS.save);
    return raw === null || writeKey(STORAGE_KEYS.backup, raw);
  }

  /**
   * New game (042.6): the old save goes to the backup key, then the slot empties. If the backup can't be written,
   * nothing changes and it returns false: the save is never lost.
   */
  clearToBackup(): boolean {
    if (!this.enabled) return true;
    if (!this.backUp()) return false;
    removeKey(STORAGE_KEYS.save);
    return true;
  }

  /**
   * An import (042.6): the old save goes to the backup key, then the imported envelope is written over the slot.
   * False, with the slot as it was, when either write fails.
   */
  replace(env: SaveEnvelope): boolean {
    if (!this.enabled) return false;
    return this.backUp() && writeKey(STORAGE_KEYS.save, JSON.stringify(env));
  }
}
