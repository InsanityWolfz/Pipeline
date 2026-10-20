import { EXPORT_FORMAT, EXPORT_VERSION, SAVE_FORMAT } from '../../data/save';
import { readEnvelope, type SaveEnvelope } from '../../sim/save';
import { notesFrom, type FeedbackNote } from './feedbackStore';

// The export file (042): the save envelope (or null with no save) and every feedback note, for a playtester to send
// to Shaun. Settings aren't in it (042.8). An import is checked like a stored save: format, version, migrations, shape.

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  build: string;
  save: unknown;
  feedback: FeedbackNote[];
}

/** The slot's text as the export's `save`: the stored envelope as it is, or null with none (or none that parses). */
export function savePart(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return typeof data === 'object' && data !== null && 'format' in data && data.format === SAVE_FORMAT ? data : null;
  } catch {
    return null;
  }
}

export function makeExport(raw: string | null, notes: readonly FeedbackNote[], build: string, now: Date): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), build, save: savePart(raw), feedback: [...notes] };
}

export type ImportRead = { ok: true; envelope: SaveEnvelope; notes: FeedbackNote[] } | { ok: false; reason: 'format' | 'newer' | 'corrupt' };

/** An imported file's text: an export (or a bare save envelope), its save checked as a stored one is. */
export function readImport(text: string): ImportRead {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'format' };
  }
  if (typeof data !== 'object' || data === null || !('format' in data)) return { ok: false, reason: 'format' };
  const isExport = data.format === EXPORT_FORMAT;
  if (!isExport && data.format !== SAVE_FORMAT) return { ok: false, reason: 'format' };
  const save = isExport && 'save' in data ? data.save : data;
  const notes = isExport && 'feedback' in data ? notesFrom(data.feedback) : [];
  const read = readEnvelope(save);
  if (read.status === 'ok') return { ok: true, envelope: read.envelope, notes };
  return { ok: false, reason: read.status === 'newer' ? 'newer' : save === null || read.reason === 'not a Pipeline save' ? 'format' : 'corrupt' };
}
