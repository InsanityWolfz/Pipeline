import type { SoundRecipe } from './soundRecipe.ts';

// 037's sounds, as synth recipes beside sounds.ts's: a level-up chime (a rising
// arpeggio of bright ley bells over a soft swell), taking a talent (a stone set into
// its socket and a short bell), and a respec (the constellation's lights running down).

/** 037's sound keys (joined into SOUNDS). */
export const TALENT_SOUNDS = {
  levelUp: 'level-up',
  talentTake: 'talent-take',
  respec: 'talent-respec',
} as const;

export const TALENT_SOUND_RECIPES = {
  'level-up': {
    layers: [
      { wave: 'sine', from: 262, to: 392, dur: 0.7, attack: 0.08, volume: 0.16, tremolo: { rate: 5, depth: 0.25 } },
      { wave: 'sine', from: 784, to: 784, dur: 0.5, attack: 0.004, volume: 0.17 },
      { wave: 'sine', from: 988, to: 988, delay: 0.09, dur: 0.5, attack: 0.004, volume: 0.15 },
      { wave: 'sine', from: 1175, to: 1175, delay: 0.18, dur: 0.6, attack: 0.004, volume: 0.14 },
      { wave: 'sine', from: 1568, to: 1568, delay: 0.27, dur: 0.8, attack: 0.004, volume: 0.12, tremolo: { rate: 7, depth: 0.35 } },
      { wave: 'noise', from: 9000, to: 4000, delay: 0.27, dur: 0.35, attack: 0.02, volume: 0.04 },
    ],
  },
  'talent-take': {
    layers: [
      { wave: 'sine', from: 180, to: 90, dur: 0.12, attack: 0.002, volume: 0.4 },
      { wave: 'noise', from: 2400, to: 600, dur: 0.07, attack: 0.001, volume: 0.18 },
      { wave: 'sine', from: 1319, to: 1319, delay: 0.05, dur: 0.45, attack: 0.004, volume: 0.13, tremolo: { rate: 9, depth: 0.3 } },
    ],
  },
  'talent-respec': {
    layers: [
      { wave: 'sine', from: 1175, to: 1175, dur: 0.3, attack: 0.004, volume: 0.12 },
      { wave: 'sine', from: 988, to: 988, delay: 0.08, dur: 0.3, attack: 0.004, volume: 0.12 },
      { wave: 'sine', from: 784, to: 784, delay: 0.16, dur: 0.35, attack: 0.004, volume: 0.12 },
      { wave: 'sine', from: 523, to: 392, delay: 0.24, dur: 0.5, attack: 0.01, volume: 0.13 },
      { wave: 'noise', from: 3000, to: 800, delay: 0.24, dur: 0.3, attack: 0.03, volume: 0.05 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
