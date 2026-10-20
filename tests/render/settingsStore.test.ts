import { beforeEach, describe, expect, it } from 'vitest';
import { BIND_ACTIONS, DEFAULT_BINDINGS, DEFAULT_SETTINGS, FIXED_KEYS } from '../../src/data/settings';
import { STORAGE_KEYS } from '../../src/data/save';
import { SOUND_SETTINGS_KEY } from '../../src/data/sounds';
import { loadSettings, parseSettings, rebind } from '../../src/render/flow/settingsStore';
import { installStorage } from './memoryStorage';

// 042: settings in one versioned key, the old sound key read once, guarded storage, and rebinding by swapping.

let store: Map<string, string>;
beforeEach(() => {
  store = installStorage();
});

describe('settings defaults (042)', () => {
  it('has no key bound twice, feedback on F, flip on G, and no fixed key bound', () => {
    const keys = Object.values(DEFAULT_BINDINGS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(DEFAULT_BINDINGS.feedback).toBe('F');
    expect(DEFAULT_BINDINGS.flip).toBe('G');
    for (const k of keys) expect(FIXED_KEYS).not.toContain(k);
    expect(Object.keys(DEFAULT_BINDINGS)).toEqual([...BIND_ACTIONS]);
  });

  it('starts with sound on at 70% master, music and effects full, flashes on', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ master: 0.7, music: 1, effects: 1, muted: false, flashes: true });
  });
});

describe('settings store (042)', () => {
  it('reads the old pipeline.sound key once into pipeline.settings', () => {
    store.set(SOUND_SETTINGS_KEY, JSON.stringify({ muted: true, volume: 0.3 }));
    const s = loadSettings('', false);
    expect(s).toMatchObject({ master: 0.3, muted: true, music: 1 });
    expect(JSON.parse(store.get(STORAGE_KEYS.settings) ?? '{}')).toMatchObject({ version: 1, master: 0.3, muted: true });
  });

  it('starts muted under tests and ?mute, without saving it', () => {
    expect(loadSettings('', true).muted).toBe(true);
    expect(loadSettings('?mute', false).muted).toBe(true);
    expect(store.has(STORAGE_KEYS.settings)).toBe(false);
  });

  it('takes defaults for bad fields, and garbage or blocked storage gives the defaults', () => {
    expect(parseSettings(JSON.stringify({ master: 7, music: 0.31, flashes: 'no', bindings: { dodge: 'SHIFT', up: 'ESC' } }))).toMatchObject({ master: 0.7, music: 0.3, flashes: true, bindings: { ...DEFAULT_BINDINGS, dodge: 'SHIFT' } });
    expect(parseSettings('{')).toBeNull();
    // Two actions on one key fall back to the default keys.
    expect(parseSettings(JSON.stringify({ bindings: { dodge: 'W' } }))?.bindings).toEqual(DEFAULT_BINDINGS);
    installStorage(true);
    expect(loadSettings('', false)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('rebinding (042)', () => {
  it('binds a free key', () => {
    expect(rebind(DEFAULT_BINDINGS, 'dodge', 'SHIFT')).toEqual({ ...DEFAULT_BINDINGS, dodge: 'SHIFT' });
  });

  it('swaps with the action already on that key, so no key does two things', () => {
    const next = rebind(DEFAULT_BINDINGS, 'dodge', 'E');
    expect(next).toMatchObject({ dodge: 'E', interact: 'SPACE' });
    const keys = Object.values(next ?? {});
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('refuses Esc, Tab and the sound keys', () => {
    for (const k of FIXED_KEYS) expect(rebind(DEFAULT_BINDINGS, 'dodge', k)).toBeNull();
  });
});
