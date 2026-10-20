import { BIND_ACTIONS, DEFAULT_SETTINGS, FIXED_KEYS, SETTINGS_VERSION, type BindAction, type Settings } from '../../data/settings';
import { STORAGE_KEYS } from '../../data/save';
import { SOUND_SETTINGS_KEY } from '../../data/sounds';
import { readKey, writeKey } from './storage';

// The settings (042), shared by every scene: loaded once from `pipeline.settings` (versioned), with the old
// `pipeline.sound` key's mute and volume read into it once; saved on every change; listeners hear each change.
// Under automated tests and `?mute`, sound starts muted, as before 042. Guarded storage: blocked, it's the defaults.

type Listener = (s: Readonly<Settings>) => void;

let current: Settings | null = null;
const listeners = new Set<Listener>();

const clampVolume = (v: unknown, fallback: number): number => (typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 10) / 10 : fallback);

/** Stored settings checked field by field (a bad field takes its default), or null with none stored. */
export function parseSettings(raw: string | null): Settings | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  const D = DEFAULT_SETTINGS;
  const bindings = { ...D.bindings };
  if (typeof d.bindings === 'object' && d.bindings !== null) {
    const b = d.bindings as Record<string, unknown>;
    for (const a of BIND_ACTIONS) {
      const key = b[a];
      if (typeof key === 'string' && key !== '' && !FIXED_KEYS.includes(key)) bindings[a] = key;
    }
  }
  // Two actions on one key (a hand-edited file) fall back to the defaults.
  const keys = Object.values(bindings);
  const clean = new Set(keys).size === keys.length;
  return {
    version: SETTINGS_VERSION,
    master: clampVolume(d.master, D.master),
    music: clampVolume(d.music, D.music),
    effects: clampVolume(d.effects, D.effects),
    muted: typeof d.muted === 'boolean' ? d.muted : D.muted,
    flashes: typeof d.flashes === 'boolean' ? d.flashes : D.flashes,
    bindings: clean ? bindings : { ...D.bindings },
  };
}

/** The settings from storage: `pipeline.settings`, else the old `pipeline.sound`'s mute and volume, else the defaults. */
export function loadSettings(search: string, automated: boolean): Settings {
  let s = parseSettings(readKey(STORAGE_KEYS.settings));
  if (!s) {
    s = { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_SETTINGS.bindings } };
    const old = readKey(SOUND_SETTINGS_KEY);
    if (old !== null) {
      try {
        const o = JSON.parse(old) as Record<string, unknown>;
        s.master = clampVolume(o.volume, s.master);
        if (typeof o.muted === 'boolean') s.muted = o.muted;
      } catch {
        // An unreadable old key is ignored.
      }
      writeKey(STORAGE_KEYS.settings, JSON.stringify(s));
    }
  }
  const forceMute = automated || new URLSearchParams(search).has('mute');
  return forceMute ? { ...s, muted: true } : s;
}

/** The live settings (loaded on first use). */
export function settings(): Readonly<Settings> {
  current ??= loadSettings(typeof window === 'undefined' ? '' : window.location.search, typeof navigator !== 'undefined' && navigator.webdriver);
  return current;
}

/** Changes settings, saves them, and tells the listeners. */
export function updateSettings(patch: Partial<Omit<Settings, 'version'>>): void {
  current = { ...settings(), ...patch, version: SETTINGS_VERSION };
  writeKey(STORAGE_KEYS.settings, JSON.stringify(current));
  for (const l of listeners) l(current);
}

/** Calls `fn` on every change; returns the unsubscribe. */
export function onSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Forgets the loaded settings (tests). */
export function resetSettingsCache(): void {
  current = null;
  listeners.clear();
}

/**
 * Binds `action` to `key`. A key another action holds swaps with it, so no key ever does two things; a fixed key
 * (Esc, Tab, M, [ and ]) is refused. Returns the new bindings, or null when refused.
 */
export function rebind(bindings: Readonly<Record<BindAction, string>>, action: BindAction, key: string): Record<BindAction, string> | null {
  if (FIXED_KEYS.includes(key)) return null;
  const next = { ...bindings };
  const holder = BIND_ACTIONS.find((a) => a !== action && next[a] === key);
  if (holder) next[holder] = next[action];
  next[action] = key;
  return next;
}
