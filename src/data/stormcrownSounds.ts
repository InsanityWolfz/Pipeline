import type { SoundRecipe } from './sounds.ts';

// 064's sounds, as synth recipes beside sounds.ts's: lightning striking a storm rod (a sharp crack into a rolling
// rumble), a lightning arc leaping between enemies (a dry electric crackle with a buzz), and the Conductor's: its blink
// (a zipping snap out and in), its arc lash (a whip-crack of current), its storm call (a rising hum before thunder) and
// its rod chain (a buzzing hum of current running rod to rod). Its barrier's collapse is the Hollows barrier's own (034).

/** 064's sound keys (joined into SOUNDS). */
export const STORMCROWN_SOUNDS = {
  rodStrike: 'rod-strike',
  arcCrackle: 'arc-crackle',
  blink: 'conductor-blink',
  lash: 'arc-lash',
  stormCall: 'storm-call',
  rodChain: 'rod-chain',
} as const;

export const STORMCROWN_SOUND_RECIPES = {
  'rod-strike': {
    layers: [
      { wave: 'noise', from: 9000, to: 3000, dur: 0.12, attack: 0.001, volume: 0.42 },
      { wave: 'square', from: 1800, to: 300, dur: 0.08, attack: 0.001, volume: 0.12 },
      { wave: 'noise', from: 500, to: 120, delay: 0.06, dur: 1.1, attack: 0.05, volume: 0.32, tremolo: { rate: 6, depth: 0.5 } },
      { wave: 'sine', from: 55, to: 35, delay: 0.05, dur: 1.0, attack: 0.04, volume: 0.35 },
    ],
  },
  'arc-crackle': {
    layers: [
      { wave: 'noise', from: 8000, to: 4000, dur: 0.18, attack: 0.002, volume: 0.24, tremolo: { rate: 55, depth: 0.95 } },
      { wave: 'saw', from: 120, to: 110, dur: 0.16, attack: 0.002, volume: 0.1, tremolo: { rate: 40, depth: 0.7 } },
    ],
  },
  'conductor-blink': {
    layers: [
      { wave: 'sine', from: 300, to: 2400, dur: 0.12, attack: 0.002, volume: 0.24 },
      { wave: 'noise', from: 7000, to: 2000, delay: 0.1, dur: 0.14, attack: 0.002, volume: 0.22 },
      { wave: 'sine', from: 2200, to: 400, delay: 0.12, dur: 0.14, attack: 0.002, volume: 0.2 },
    ],
  },
  'arc-lash': {
    layers: [
      { wave: 'noise', from: 9000, to: 1500, dur: 0.22, attack: 0.001, volume: 0.4 },
      { wave: 'saw', from: 900, to: 140, dur: 0.18, attack: 0.001, volume: 0.16, tremolo: { rate: 45, depth: 0.8 } },
      { wave: 'sine', from: 90, to: 45, dur: 0.3, attack: 0.002, volume: 0.3 },
    ],
  },
  'storm-call': {
    layers: [
      { wave: 'sine', from: 110, to: 220, dur: 0.9, attack: 0.3, volume: 0.24, tremolo: { rate: 8, depth: 0.5 } },
      { wave: 'noise', from: 400, to: 1400, dur: 0.9, attack: 0.4, volume: 0.14 },
      { wave: 'noise', from: 600, to: 120, delay: 0.85, dur: 0.8, attack: 0.02, volume: 0.3, tremolo: { rate: 7, depth: 0.5 } },
    ],
  },
  'rod-chain': {
    layers: [
      { wave: 'saw', from: 90, to: 120, dur: 0.6, attack: 0.03, volume: 0.16, tremolo: { rate: 30, depth: 0.7 } },
      { wave: 'noise', from: 7000, to: 4000, dur: 0.6, attack: 0.02, volume: 0.18, tremolo: { rate: 48, depth: 0.9 } },
      { wave: 'sine', from: 60, to: 50, dur: 0.6, attack: 0.03, volume: 0.24 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
