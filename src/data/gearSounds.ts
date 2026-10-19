import type { SoundRecipe } from './soundRecipe.ts';

// 036's sounds, as synth recipes beside sounds.ts's: a relic identified at the bench
// (a low ley swell under a bright violet chime), the Wardstone's ward breaking on a
// block (a glassy crack and a ring falling away), and Last Ember saving the player (a
// soft whoomph of flame and a warm rising tone).

/** 036's sound keys (joined into SOUNDS). */
export const GEAR_SOUNDS = {
  relicIdentify: 'relic-identify',
  wardBreak: 'ward-break',
  emberSave: 'ember-save',
} as const;

export const GEAR_SOUND_RECIPES = {
  'relic-identify': {
    layers: [
      { wave: 'sine', from: 196, to: 392, dur: 0.6, attack: 0.1, volume: 0.18, tremolo: { rate: 6, depth: 0.3 } },
      { wave: 'sine', from: 988, to: 988, delay: 0.25, dur: 0.7, attack: 0.005, volume: 0.16 },
      { wave: 'sine', from: 1480, to: 1480, delay: 0.33, dur: 0.8, attack: 0.005, volume: 0.13, tremolo: { rate: 8, depth: 0.4 } },
      { wave: 'triangle', from: 1976, to: 1976, delay: 0.41, dur: 0.6, attack: 0.005, volume: 0.07 },
      { wave: 'noise', from: 8000, to: 3000, delay: 0.25, dur: 0.4, attack: 0.02, volume: 0.06 },
    ],
  },
  'ward-break': {
    layers: [
      { wave: 'noise', from: 9000, to: 2500, dur: 0.16, attack: 0.001, volume: 0.32 },
      { wave: 'triangle', from: 1760, to: 880, dur: 0.4, attack: 0.002, volume: 0.2, tremolo: { rate: 24, depth: 0.5 } },
      { wave: 'sine', from: 2640, to: 1320, delay: 0.03, dur: 0.35, attack: 0.002, volume: 0.1 },
    ],
  },
  'ember-save': {
    layers: [
      { wave: 'noise', from: 600, to: 2400, dur: 0.3, attack: 0.04, volume: 0.3 },
      { wave: 'sine', from: 110, to: 70, dur: 0.35, attack: 0.005, volume: 0.4 },
      { wave: 'sine', from: 440, to: 880, delay: 0.12, dur: 0.6, attack: 0.05, volume: 0.15, tremolo: { rate: 10, depth: 0.3 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
