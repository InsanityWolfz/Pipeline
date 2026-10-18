import { describe, expect, it } from 'vitest';
import { SOUND_MIX } from '../../src/data/sounds';
import { loadSoundSettings } from '../../src/render/soundSettings';

// No browser storage here, which is the guarded read's missing-storage case.
describe('sound settings', () => {
  it('fall back to the defaults when storage is missing', () => {
    expect(loadSoundSettings('', false)).toEqual({ muted: false, volume: SOUND_MIX.volume });
  });

  it('always start muted under automated tests and with ?mute', () => {
    expect(loadSoundSettings('', true).muted).toBe(true);
    expect(loadSoundSettings('?mute', false).muted).toBe(true);
  });
});
