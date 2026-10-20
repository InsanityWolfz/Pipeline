import { NOTES, STORAGE_KEYS } from '../../data/save';
import type { SimSummary } from '../../sim/summary';
import type { FlowState } from './flowMachine';
import { readKey, writeKey } from './storage';

// Feedback notes (042): F writes one at any time; each keeps the flow state and a game-state snapshot (the compact
// summary getState() returns, or null on the title). Stored under `pipeline.feedback`, newest last, at most 50 (the
// oldest dropped). They survive New game and Continue, go in every export, and merge on import (by id).

export interface FeedbackNote {
  id: string;
  writtenAt: string;
  build: string;
  state: FlowState;
  text: string;
  snapshot: SimSummary | null;
}

const isNote = (v: unknown): v is FeedbackNote => {
  if (typeof v !== 'object' || v === null) return false;
  const n = v as Record<string, unknown>;
  return typeof n.id === 'string' && typeof n.writtenAt === 'string' && typeof n.build === 'string' && typeof n.state === 'string' && typeof n.text === 'string' && (n.snapshot === null || typeof n.snapshot === 'object');
};

/** Notes from parsed data: only well-formed ones. */
export function notesFrom(data: unknown): FeedbackNote[] {
  return Array.isArray(data) ? data.filter(isNote) : [];
}

/** The stored notes, oldest first (guarded: unreadable or blocked storage gives none). */
export function loadNotes(): FeedbackNote[] {
  const raw = readKey(STORAGE_KEYS.feedback);
  if (raw === null) return [];
  try {
    return notesFrom(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Keeps the newest `NOTES.maxNotes`. */
const capped = (notes: readonly FeedbackNote[]): FeedbackNote[] => notes.slice(Math.max(0, notes.length - NOTES.maxNotes));

/** `incoming` added after `existing`, skipping ids already there, capped. */
export function mergeNotes(existing: readonly FeedbackNote[], incoming: readonly FeedbackNote[]): FeedbackNote[] {
  const ids = new Set(existing.map((n) => n.id));
  return capped([...existing, ...incoming.filter((n) => !ids.has(n.id) && ids.add(n.id))]);
}

/** Stores the notes; false when storage refused. */
export function storeNotes(notes: readonly FeedbackNote[]): boolean {
  return writeKey(STORAGE_KEYS.feedback, JSON.stringify(notes));
}

/** Adds a note (its text cut to the limit); returns whether it was stored and whether the limit is near. */
export function addNote(note: FeedbackNote): { stored: boolean; nearLimit: boolean; count: number } {
  const notes = mergeNotes(loadNotes(), [{ ...note, text: note.text.slice(0, NOTES.maxChars) }]);
  return { stored: storeNotes(notes), nearLimit: notes.length >= NOTES.warnAt, count: notes.length };
}

/** A new note's id: the time and a random tail (render-side randomness; the sim never sees it). */
export function noteId(now: Date): string {
  return `${now.getTime().toString(36)}-${Math.floor(Math.random() * 36 ** 6).toString(36)}`;
}
