import type { SoundRecipe } from './sounds.ts';

// 034's sounds, as synth recipes beside sounds.ts's: the ley barrier collapsing (a falling
// shimmer and a deep thud), a shot ringing off the Bulwark's shield (a brass clang), its
// bombs' fuse ticking and bursting, its pound shaking the ground, the stone grinding as it
// rears back to lob, and the summon at its altar (a low rising drone, then the crack).

export const HOLLOWS_SOUND_RECIPES = {
  'barrier-collapse': {
    layers: [
      { wave: 'sine', from: 1568, to: 392, dur: 0.9, attack: 0.01, volume: 0.18, tremolo: { rate: 14, depth: 0.5 } },
      { wave: 'noise', from: 7000, to: 1200, dur: 0.8, attack: 0.02, volume: 0.14 },
      { wave: 'sine', from: 90, to: 40, delay: 0.5, dur: 0.6, attack: 0.005, volume: 0.5 },
    ],
  },
  'shield-clang': {
    layers: [
      { wave: 'triangle', from: 1240, to: 1180, dur: 0.35, attack: 0.001, volume: 0.22, tremolo: { rate: 30, depth: 0.4 } },
      { wave: 'sine', from: 1860, to: 1800, dur: 0.25, attack: 0.001, volume: 0.12 },
      { wave: 'noise', from: 5000, to: 2000, dur: 0.05, attack: 0.001, volume: 0.25 },
    ],
  },
  'enemy-bomb-tick': {
    layers: [
      { wave: 'square', from: 880, to: 880, dur: 0.04, attack: 0.001, volume: 0.1, lowpass: 2500 },
      { wave: 'square', from: 880, to: 880, delay: 0.25, dur: 0.04, attack: 0.001, volume: 0.1, lowpass: 2500 },
    ],
  },
  'enemy-bomb-burst': {
    layers: [
      { wave: 'sine', from: 130, to: 45, dur: 0.3, attack: 0.002, volume: 0.6 },
      { wave: 'noise', from: 2500, to: 250, dur: 0.3, attack: 0.002, volume: 0.4 },
    ],
  },
  'bulwark-pound': {
    layers: [
      { wave: 'sine', from: 70, to: 30, dur: 0.6, attack: 0.002, volume: 0.75 },
      { wave: 'noise', from: 900, to: 120, dur: 0.5, attack: 0.002, volume: 0.45 },
      { wave: 'square', from: 60, to: 40, dur: 0.3, attack: 0.002, volume: 0.15, lowpass: 400 },
    ],
  },
  'bulwark-grind': {
    layers: [
      { wave: 'noise', from: 600, to: 300, dur: 0.45, attack: 0.08, volume: 0.25, tremolo: { rate: 18, depth: 0.6 } },
      { wave: 'saw', from: 55, to: 70, dur: 0.45, attack: 0.08, volume: 0.12, lowpass: 300 },
    ],
  },
  summon: {
    layers: [
      { wave: 'saw', from: 55, to: 110, dur: 1.6, attack: 0.4, volume: 0.16, lowpass: 600, tremolo: { rate: 5, depth: 0.4 } },
      { wave: 'sine', from: 220, to: 330, dur: 1.6, attack: 0.5, volume: 0.12 },
      { wave: 'noise', from: 1800, to: 200, delay: 1.5, dur: 0.4, attack: 0.002, volume: 0.4 },
      { wave: 'sine', from: 80, to: 35, delay: 1.5, dur: 0.5, attack: 0.002, volume: 0.5 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
