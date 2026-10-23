import type { SoundRecipe } from './sounds.ts';

// 060's sounds, as synth recipes beside sounds.ts's: a cinder vent flaring open (a rushing roar of hot air with a low
// rumble under it and a crackle on top). Its barrier's collapse is the Hollows barrier's own (034).

/** 060's sound keys (joined into SOUNDS). */
export const EMBERWORKS_SOUNDS = {
  ventFlare: 'vent-flare',
} as const;

export const EMBERWORKS_SOUND_RECIPES = {
  'vent-flare': {
    layers: [
      { wave: 'noise', from: 400, to: 2600, dur: 0.7, attack: 0.08, volume: 0.28 },
      { wave: 'sine', from: 60, to: 85, dur: 0.7, attack: 0.06, volume: 0.35, tremolo: { rate: 11, depth: 0.4 } },
      { wave: 'noise', from: 5000, to: 3000, delay: 0.15, dur: 0.45, attack: 0.01, volume: 0.08, tremolo: { rate: 32, depth: 0.8 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
