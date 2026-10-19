import type { SoundRecipe } from './soundRecipe.ts';

// 038's sounds, as synth recipes beside sounds.ts's: a landmine arming where it lands
// (an iron clunk and a rising ley click) and bursting (a sharp, tight crack with a ring
// of shards). The bomblets burst with the bomb's own sound, quieter (038.10).

/** 038's sound keys (joined into SOUNDS). */
export const MINE_SOUNDS = {
  mineArm: 'mine-arm',
  mineBurst: 'mine-burst',
} as const;

export const MINE_SOUND_RECIPES = {
  'mine-arm': {
    layers: [
      { wave: 'sine', from: 160, to: 70, dur: 0.1, attack: 0.002, volume: 0.45 },
      { wave: 'noise', from: 3000, to: 900, dur: 0.05, attack: 0.001, volume: 0.2 },
      { wave: 'square', from: 1200, to: 1800, delay: 0.08, dur: 0.06, attack: 0.002, volume: 0.07, lowpass: 3000 },
    ],
  },
  'mine-burst': {
    layers: [
      { wave: 'noise', from: 6000, to: 700, dur: 0.22, attack: 0.001, volume: 0.5 },
      { wave: 'sine', from: 180, to: 50, dur: 0.28, attack: 0.001, volume: 0.65 },
      { wave: 'triangle', from: 2200, to: 1400, delay: 0.02, dur: 0.18, attack: 0.002, volume: 0.08, tremolo: { rate: 26, depth: 0.5 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
