import type { SoundRecipe } from './sounds.ts';

// 033's sounds, as synth recipes beside sounds.ts's: restoring a lost part (a ley
// swell filling in, then a brass-and-stone thunk as it solidifies), a schematic's
// chime as it lands, and the shimmer of a banked schematic's diagram appearing.

export const RESEARCH_SOUND_RECIPES = {
  restore: {
    layers: [
      { wave: 'sine', from: 262, to: 523, dur: 0.45, attack: 0.08, volume: 0.2, tremolo: { rate: 9, depth: 0.3 } },
      { wave: 'triangle', from: 392, to: 784, delay: 0.05, dur: 0.4, attack: 0.08, volume: 0.12 },
      { wave: 'noise', from: 1800, to: 300, delay: 0.45, dur: 0.14, attack: 0.002, volume: 0.32 },
      { wave: 'square', from: 130, to: 90, delay: 0.45, dur: 0.18, attack: 0.002, volume: 0.14, lowpass: 900 },
      { wave: 'sine', from: 659, to: 659, delay: 0.5, dur: 0.6, attack: 0.02, volume: 0.12 },
    ],
  },
  'schematic-chime': {
    layers: [
      { wave: 'sine', from: 1047, to: 1047, dur: 0.5, attack: 0.005, volume: 0.2 },
      { wave: 'sine', from: 1319, to: 1319, delay: 0.08, dur: 0.55, attack: 0.005, volume: 0.17 },
      { wave: 'sine', from: 1568, to: 1568, delay: 0.16, dur: 0.7, attack: 0.005, volume: 0.15, tremolo: { rate: 7, depth: 0.35 } },
      { wave: 'noise', from: 9000, to: 5000, dur: 0.3, attack: 0.01, volume: 0.06 },
    ],
  },
  reveal: {
    layers: [
      { wave: 'noise', from: 6000, to: 2500, dur: 0.6, attack: 0.15, volume: 0.08 },
      { wave: 'sine', from: 587, to: 880, dur: 0.6, attack: 0.1, volume: 0.15, tremolo: { rate: 12, depth: 0.5 } },
      { wave: 'sine', from: 880, to: 1175, delay: 0.2, dur: 0.6, attack: 0.08, volume: 0.12 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
