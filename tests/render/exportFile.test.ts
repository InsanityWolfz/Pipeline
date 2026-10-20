import { SAVE_VERSION } from '../../src/data/save';
import { beforeEach, describe, expect, it } from 'vitest';
import { NOTES, STORAGE_KEYS } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim } from '../../src/sim/state';
import { makeEnvelope, snapshot } from '../../src/sim/save';
import { makeExport, readImport } from '../../src/render/flow/exportFile';
import { addNote, loadNotes, mergeNotes, type FeedbackNote } from '../../src/render/flow/feedbackStore';
import { installStorage } from './memoryStorage';

// 042: the export file (save + notes, no settings), imports checked like a stored save, notes merged by id and capped.

const NOW = new Date('2026-10-20T10:00:00Z');
const note = (id: string, text = 'hi'): FeedbackNote => ({ id, writtenAt: NOW.toISOString(), build: 'dev', state: 'play', text, snapshot: null });
const envText = (): string => JSON.stringify(makeEnvelope(snapshot(createSim(9, { start: TUTORIAL_START })), { build: 'dev', savedAt: NOW.toISOString(), endCardSeen: false }));

let store: Map<string, string>;
beforeEach(() => {
  store = installStorage();
});

describe('export file (042)', () => {
  it('holds the save envelope and every note, and no settings', () => {
    const file = makeExport(envText(), [note('a')], 'dev', NOW);
    expect(file).toMatchObject({ format: 'pipeline-export', version: 1, exportedAt: NOW.toISOString(), build: 'dev', feedback: [note('a')] });
    expect(file.save).toMatchObject({ format: 'pipeline-save', version: SAVE_VERSION });
    expect(Object.keys(file)).not.toContain('settings');
    expect(makeExport(null, [], 'dev', NOW).save).toBeNull();
  });

  it('reads back what it wrote: the save and its notes', () => {
    const read = readImport(JSON.stringify(makeExport(envText(), [note('a')], 'dev', NOW)));
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.envelope.state).toMatchObject({ seed: 9 });
      expect(read.notes).toEqual([note('a')]);
    }
  });

  it('says why a bad file is refused', () => {
    expect(readImport('hello')).toEqual({ ok: false, reason: 'format' });
    expect(readImport(JSON.stringify({ format: 'other' }))).toEqual({ ok: false, reason: 'format' });
    expect(readImport(JSON.stringify(makeExport(null, [], 'dev', NOW)))).toEqual({ ok: false, reason: 'format' });
    const newer = { ...JSON.parse(envText()), version: 99 };
    expect(readImport(JSON.stringify({ ...makeExport(null, [], 'dev', NOW), save: newer }))).toEqual({ ok: false, reason: 'newer' });
    const broken = { ...JSON.parse(envText()), state: { seed: 'x' } };
    expect(readImport(JSON.stringify({ ...makeExport(null, [], 'dev', NOW), save: broken }))).toEqual({ ok: false, reason: 'corrupt' });
  });
});

describe('feedback notes (042)', () => {
  it('keeps notes newest last, merges by id, and keeps at most 50', () => {
    expect(mergeNotes([note('a'), note('b')], [note('b'), note('c')]).map((n) => n.id)).toEqual(['a', 'b', 'c']);
    const many = Array.from({ length: NOTES.maxNotes + 5 }, (_, i) => note(`n${i}`));
    const kept = mergeNotes([], many);
    expect(kept).toHaveLength(NOTES.maxNotes);
    expect(kept[0]?.id).toBe('n5');
  });

  it('stores a note, cut to 2,000 characters, and warns near the limit', () => {
    const r = addNote(note('x', 'y'.repeat(NOTES.maxChars + 10)));
    expect(r).toMatchObject({ stored: true, nearLimit: false, count: 1 });
    expect(loadNotes()[0]?.text).toHaveLength(NOTES.maxChars);
    store.set(STORAGE_KEYS.feedback, JSON.stringify(Array.from({ length: NOTES.warnAt }, (_, i) => note(`k${i}`))));
    expect(addNote(note('last')).nearLimit).toBe(true);
    store.set(STORAGE_KEYS.feedback, 'garbage');
    expect(loadNotes()).toEqual([]);
  });
});
