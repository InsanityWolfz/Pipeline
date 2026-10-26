import type { SoundRecipe } from './soundRecipe.ts';

// 063's sounds, as synth recipes beside sounds.ts's: the area box let go (a soft ley snap closing round the pieces)
// and a blueprint stamped down (a stone thump with a ley ring as every piece lands at once). An area pick-up plays the
// one-piece pick-up sound once for the batch.

/** 063's sound keys (joined into SOUNDS). */
export const BLUEPRINT_SOUNDS = {
  areaRelease: 'area-release',
  stamp: 'blueprint-stamp',
} as const;

export const BLUEPRINT_SOUND_RECIPES = {
  'area-release': {
    layers: [
      { wave: 'sine', from: 660, to: 990, dur: 0.08, attack: 0.004, volume: 0.14 },
      { wave: 'triangle', from: 1320, to: 1320, delay: 0.05, dur: 0.1, attack: 0.002, volume: 0.07 },
      { wave: 'noise', from: 5000, to: 2500, dur: 0.05, attack: 0.002, volume: 0.04 },
    ],
  },
  'blueprint-stamp': {
    layers: [
      { wave: 'sine', from: 150, to: 60, dur: 0.2, attack: 0.002, volume: 0.5 },
      { wave: 'noise', from: 1500, to: 300, dur: 0.12, attack: 0.001, volume: 0.28 },
      { wave: 'sine', from: 523, to: 784, delay: 0.06, dur: 0.35, attack: 0.02, volume: 0.13, tremolo: { rate: 10, depth: 0.3 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
