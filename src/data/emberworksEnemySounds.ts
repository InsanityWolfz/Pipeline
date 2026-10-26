import type { SoundRecipe } from './soundRecipe.ts';

// 061's sounds, as synth recipes beside sounds.ts's: a cinder mote swelling (a rising, quickening hiss of heat) and
// bursting (a soft whoomph with a spit of sparks); a bellows hound's dash (a bellows wheeze into a rush of air and
// clatter); a slag golem's slam (a wet, heavy thud of slag) and its split (a cracking crust and two glooping drops);
// and a kiln-tender's beam (a warm, wavering hum while it channels).

/** 061's sound keys (joined into SOUNDS). */
export const EMBERWORKS_ENEMY_SOUNDS = {
  moteSwell: 'mote-swell',
  moteBurst: 'mote-burst',
  houndDash: 'hound-dash',
  golemSlam: 'golem-slam',
  golemSplit: 'golem-split',
  tenderHum: 'tender-hum',
} as const;

/** Their wind-up cues, by enemy kind (joined into WINDUP_SOUNDS): the mote's swell. */
export const EMBERWORKS_ENEMY_WINDUPS = {
  mote: EMBERWORKS_ENEMY_SOUNDS.moteSwell,
} as const;

export const EMBERWORKS_ENEMY_SOUND_RECIPES = {
  'mote-swell': {
    layers: [
      { wave: 'noise', from: 600, to: 3200, dur: 0.72, attack: 0.5, volume: 0.22, tremolo: { rate: 14, depth: 0.5 } },
      { wave: 'sine', from: 180, to: 420, dur: 0.72, attack: 0.4, volume: 0.16 },
    ],
  },
  'mote-burst': {
    layers: [
      { wave: 'sine', from: 160, to: 50, dur: 0.32, attack: 0.004, volume: 0.6 },
      { wave: 'noise', from: 2400, to: 400, dur: 0.3, attack: 0.003, volume: 0.4 },
      { wave: 'noise', from: 7000, to: 3500, delay: 0.04, dur: 0.25, attack: 0.002, volume: 0.1, tremolo: { rate: 40, depth: 0.9 } },
    ],
  },
  'hound-dash': {
    layers: [
      { wave: 'noise', from: 500, to: 1800, dur: 0.18, attack: 0.05, volume: 0.25 },
      { wave: 'noise', from: 1800, to: 600, delay: 0.16, dur: 0.4, attack: 0.01, volume: 0.32 },
      { wave: 'square', from: 220, to: 180, delay: 0.16, dur: 0.3, attack: 0.002, volume: 0.05, lowpass: 900, tremolo: { rate: 24, depth: 0.7 } },
    ],
  },
  'golem-slam': {
    layers: [
      { wave: 'sine', from: 90, to: 32, dur: 0.5, attack: 0.002, volume: 0.75 },
      { wave: 'noise', from: 900, to: 150, dur: 0.4, attack: 0.002, volume: 0.4, lowpass: 1200 },
    ],
  },
  'golem-split': {
    layers: [
      { wave: 'noise', from: 4000, to: 900, dur: 0.22, attack: 0.002, volume: 0.32, tremolo: { rate: 30, depth: 0.8 } },
      { wave: 'sine', from: 260, to: 110, delay: 0.12, dur: 0.18, attack: 0.005, volume: 0.35 },
      { wave: 'sine', from: 230, to: 95, delay: 0.26, dur: 0.18, attack: 0.005, volume: 0.32 },
    ],
  },
  'tender-hum': {
    layers: [
      { wave: 'triangle', from: 220, to: 240, dur: 0.9, attack: 0.15, volume: 0.16, tremolo: { rate: 6, depth: 0.4 } },
      { wave: 'sine', from: 110, to: 120, dur: 0.9, attack: 0.15, volume: 0.2 },
      { wave: 'noise', from: 1200, to: 1600, dur: 0.9, attack: 0.3, volume: 0.05 },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;
