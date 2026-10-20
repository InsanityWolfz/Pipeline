import { DAMAGED_FILE, EXPORT_FILE, SAVE_TEXT, STORAGE_KEYS } from '../../data/save';
import { makeExport, readImport, type ImportRead } from './exportFile';
import { loadNotes, mergeNotes, storeNotes } from './feedbackStore';
import { download, isoDate, pickFile } from './files';
import type { SaveStore } from './saveStore';
import { buildId, readKey } from './storage';

// Settings' save rows (042): Export save (the slot and every note), Export damaged save (the raw text), and Import
// save (the picker, a check like a stored save's, a confirm, then the slot replaced and the notes merged).

export function exportSave(now: Date = new Date()): void {
  const file = makeExport(readKey(STORAGE_KEYS.save), loadNotes(), buildId(), now);
  download(EXPORT_FILE(isoDate(now)), JSON.stringify(file, null, 1));
}

export function exportDamaged(now: Date = new Date()): void {
  download(DAMAGED_FILE(isoDate(now)), readKey(STORAGE_KEYS.save) ?? '', 'text/plain');
}

/** Opens the picker and checks the file. Resolves with the good file, or the words for why it was refused (null: none picked). */
export async function pickImport(): Promise<{ good: Extract<ImportRead, { ok: true }> } | { bad: string } | null> {
  const text = await pickFile();
  if (text === null) return null;
  const read = readImport(text);
  if (read.ok) return { good: read };
  return { bad: SAVE_TEXT.importBad[read.reason] };
}

/** Takes a checked import: the slot replaced (the old save to the backup key) and its notes merged in. */
export function applyImport(saves: SaveStore, good: Extract<ImportRead, { ok: true }>): boolean {
  storeNotes(mergeNotes(loadNotes(), good.notes));
  return saves.replace(good.envelope);
}
