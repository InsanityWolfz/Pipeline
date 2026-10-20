import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim } from '../../src/sim/state';
import { SaveStore, peekStatus } from '../../src/render/flow/saveStore';
import { continueShown, saveLine, savedWhen } from '../../src/render/flow/continueLine';
import { installStorage } from './memoryStorage';

// 042: the one save slot in browser storage, guarded; the title's Continue line.

const NOW = new Date(2026, 9, 19, 21, 40);
let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});

describe('save store (042)', () => {
  it('writes on a foundry entry and reads it back for Continue', () => {
    const saves = new SaveStore(true);
    expect(saves.read().status).toBe('none');
    const sim = createSim(3, { start: TUTORIAL_START });
    expect(saves.write(sim, false, NOW)).toBe('saved');
    expect(saves.saves).toBe(1);
    const slot = saves.read();
    expect(slot.status).toBe('ok');
    expect(slot.state?.seed).toBe(3);
    expect(slot.envelope?.savedAt).toBe(NOW.toISOString());
  });

  it('never touches the slot under a dev or test URL (042.1)', () => {
    store.set(STORAGE_KEYS.save, 'something');
    const saves = new SaveStore(false);
    expect(saves.read().status).toBe('none');
    expect(saves.write(createSim(1), false, NOW)).toBe('skipped');
    expect(store.get(STORAGE_KEYS.save)).toBe('something');
  });

  it('never overwrites a newer or unreadable save (042.5)', () => {
    const saves = new SaveStore(true);
    for (const held of [JSON.stringify({ format: 'pipeline-save', version: 999 }), 'garbage {']) {
      store.set(STORAGE_KEYS.save, held);
      expect(saves.write(createSim(1), false, NOW)).toBe('skipped');
      expect(store.get(STORAGE_KEYS.save)).toBe(held);
    }
    expect(peekStatus(JSON.stringify({ format: 'pipeline-save', version: 999 }))).toBe('newer');
    expect(saves.read().status).toBe('corrupt');
    expect(saves.read().raw).toBe('garbage {');
  });

  it('New game moves the old save to the backup key and empties the slot (042.6)', () => {
    const saves = new SaveStore(true);
    saves.write(createSim(1, { start: TUTORIAL_START }), false, NOW);
    const old = store.get(STORAGE_KEYS.save);
    saves.clearToBackup();
    expect(store.has(STORAGE_KEYS.save)).toBe(false);
    expect(store.get(STORAGE_KEYS.backup)).toBe(old);
  });

  it('a failed write says so and throws nothing', () => {
    installStorage(true);
    const saves = new SaveStore(true);
    expect(saves.read().status).toBe('none');
    expect(saves.write(createSim(1), false, NOW)).toBe('failed');
  });
});

describe('Continue line (042)', () => {
  it('shows level, pylons, bosses beaten and when it was saved', () => {
    expect(savedWhen(NOW.toISOString())).toBe('19 Oct, 21:40');
    expect(saveLine({ level: 8, claims: ['shrine', 'quarry', 'old-grove'], bossDefeats: ['bulwark'] }, NOW.toISOString())).toBe('Level 8 · 3 pylons · Bulwark · saved 19 Oct, 21:40');
    expect(saveLine({ level: 1, claims: ['shrine'], bossDefeats: [] }, NOW.toISOString())).toBe('Level 1 · 1 pylon · saved 19 Oct, 21:40');
  });

  it('greys Continue out with no save, or a newer or unreadable one, saying why', () => {
    expect(continueShown({ status: 'none', envelope: null, state: null, raw: null })).toEqual({ usable: false, line: null });
    expect(continueShown({ status: 'newer', envelope: null, state: null, raw: '' })).toEqual({ usable: false, line: 'This save is from a newer version of the game.' });
    expect(continueShown({ status: 'corrupt', envelope: null, state: null, raw: '' })).toEqual({ usable: false, line: "Your save couldn't be read." });
    expect(continueShown({ status: 'too-old', envelope: null, state: null, raw: '' }).usable).toBe(false);
  });
});
