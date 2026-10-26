import type { SoundLayer, SoundRecipe } from './soundRecipe.ts';

// The ambient loops (014, 017), as synth recipes beside sounds.ts's effects: wind and birds outside, the foundry's
// low hum inside, and which room plays which.

/** The ambient loops' sound keys (joined into SOUNDS). */
export const AMBIENT_SOUNDS = {
  ambientClearing: 'ambient-clearing',
  ambientFoundry: 'ambient-foundry',
} as const;

type AmbientKey = (typeof AMBIENT_SOUNDS)[keyof typeof AMBIENT_SOUNDS];

const birds = (times: readonly number[], pitch: number): SoundLayer[] =>
  times.flatMap((t, i) => [
    { wave: 'sine', from: pitch + i * 140, to: pitch + 900 + i * 90, delay: t, dur: 0.07, attack: 0.01, volume: 0.12 },
    { wave: 'sine', from: pitch + 700 + i * 60, to: pitch + 200, delay: t + 0.09, dur: 0.09, attack: 0.01, volume: 0.1 },
  ]);

export const AMBIENT_SOUND_RECIPES: Readonly<Record<AmbientKey, SoundRecipe>> = {
  'ambient-clearing': {
    loop: 8,
    layers: [
      { wave: 'noise', from: 500, to: 500, dur: 8, attack: 0, volume: 0.12, tremolo: { rate: 0.25, depth: 0.6 } },
      ...birds([0.8, 1.15, 4.6, 6.9, 7.2], 2400),
    ],
  },
  'ambient-foundry': {
    loop: 8,
    layers: [
      { wave: 'sine', from: 55, to: 55, dur: 8, attack: 0, volume: 0.22, tremolo: { rate: 0.5, depth: 0.3 } },
      { wave: 'sine', from: 110, to: 110, dur: 8, attack: 0, volume: 0.1, tremolo: { rate: 0.375, depth: 0.4 } },
      { wave: 'noise', from: 200, to: 200, dur: 8, attack: 0, volume: 0.05 },
    ],
  },
};

/** The ambient loop for each room; rooms not listed are silent. */
export const ROOM_AMBIENCE: Readonly<Record<string, AmbientKey>> = {
  // Wind and birds outside (017).
  overworld: AMBIENT_SOUNDS.ambientClearing,
  foundry: AMBIENT_SOUNDS.ambientFoundry,
  // 044: the sandbox's room, open to the sky, as outside.
  sandbox: AMBIENT_SOUNDS.ambientClearing,
};
