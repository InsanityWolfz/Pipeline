import { SOUND_MIX, SOUND_SETTINGS_KEY } from '../data/sounds';

// Mute and volume, kept in localStorage. Storage can be missing or throw
// (private windows, blocked site data), so every read and write is guarded.

export interface SoundSettings {
  muted: boolean;
  volume: number;
}

/** Saved settings, or the defaults. Under automated tests (and `?mute`) it always starts muted. */
export function loadSoundSettings(search: string, automated: boolean): SoundSettings {
  const fallback: SoundSettings = { muted: false, volume: SOUND_MIX.volume };
  let saved = fallback;
  try {
    const raw = window.localStorage.getItem(SOUND_SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && 'muted' in parsed && 'volume' in parsed) {
      const { muted, volume } = parsed;
      if (typeof muted === 'boolean' && typeof volume === 'number' && volume >= 0 && volume <= 1) saved = { muted, volume };
    }
  } catch {
    saved = fallback;
  }
  const forceMute = automated || new URLSearchParams(search).has('mute');
  return forceMute ? { ...saved, muted: true } : saved;
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    window.localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not saved this time; the game still plays with them.
  }
}
