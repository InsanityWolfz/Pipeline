import type { SoundRecipe } from './soundRecipe.ts';

// 062's sounds, as synth recipes beside sounds.ts's: the Smelter's pour as it starts a craft (a hiss of molten metal
// and a low gurgle), the kiln's roar (a rushing fire with a deep rumble), and a steel round's heavier shot: its
// family's sound, lower and fuller, with a metal ring. A glass bolt fires as a ley bolt does.
// 066: the Tempering coil's crackle (a dry electric spit over a low hum), and a stormsteel round's shot: steel's,
// sharper (a brighter, higher crack) with a snap of static on top. A storm glass bolt fires as a ley bolt does.

/** 062's sound keys (joined into SOUNDS). */
export const TIER_SOUNDS = {
  smelterPour: 'smelter-pour',
  kilnRoar: 'kiln-roar',
  fireArrowSteel: 'fire-arrow-steel',
  fireBombSteel: 'fire-bomb-steel',
  coilCrackle: 'coil-crackle',
  fireArrowStormsteel: 'fire-arrow-stormsteel',
  fireBombStormsteel: 'fire-bomb-stormsteel',
} as const;

export const TIER_SOUND_RECIPES = {
  'smelter-pour': {
    layers: [
      { wave: 'noise', from: 3200, to: 900, dur: 0.7, attack: 0.08, volume: 0.22 },
      { wave: 'sine', from: 140, to: 90, dur: 0.6, attack: 0.05, volume: 0.25, tremolo: { rate: 9, depth: 0.6 } },
      { wave: 'triangle', from: 520, to: 380, delay: 0.1, dur: 0.4, attack: 0.03, volume: 0.06, tremolo: { rate: 14, depth: 0.5 } },
    ],
  },
  'kiln-roar': {
    layers: [
      { wave: 'noise', from: 1400, to: 500, dur: 0.8, attack: 0.15, volume: 0.3, tremolo: { rate: 6, depth: 0.4 } },
      { wave: 'sine', from: 70, to: 55, dur: 0.8, attack: 0.15, volume: 0.35 },
    ],
  },
  'fire-arrow-steel': {
    layers: [
      { wave: 'noise', from: 4500, to: 1100, dur: 0.14, attack: 0.002, volume: 0.38 },
      { wave: 'triangle', from: 520, to: 130, dur: 0.11, attack: 0.002, volume: 0.42 },
      { wave: 'triangle', from: 1900, to: 1700, delay: 0.01, dur: 0.12, attack: 0.002, volume: 0.06, tremolo: { rate: 30, depth: 0.4 } },
    ],
  },
  'fire-bomb-steel': {
    layers: [
      { wave: 'sine', from: 130, to: 45, dur: 0.28, attack: 0.002, volume: 0.68 },
      { wave: 'noise', from: 1200, to: 250, dur: 0.22, attack: 0.002, volume: 0.38 },
      { wave: 'triangle', from: 1500, to: 1300, delay: 0.02, dur: 0.16, attack: 0.002, volume: 0.06, tremolo: { rate: 24, depth: 0.4 } },
    ],
  },
  'coil-crackle': {
    layers: [
      { wave: 'noise', from: 7000, to: 3000, dur: 0.5, attack: 0.01, volume: 0.18, tremolo: { rate: 23, depth: 0.9 } },
      { wave: 'square', from: 120, to: 110, dur: 0.5, attack: 0.05, volume: 0.06, lowpass: 900 },
      { wave: 'triangle', from: 2600, to: 1800, delay: 0.12, dur: 0.06, attack: 0.002, volume: 0.08 },
    ],
  },
  'fire-arrow-stormsteel': {
    layers: [
      { wave: 'noise', from: 7500, to: 1800, dur: 0.12, attack: 0.002, volume: 0.36 },
      { wave: 'triangle', from: 760, to: 170, dur: 0.1, attack: 0.002, volume: 0.4 },
      { wave: 'triangle', from: 2600, to: 2300, delay: 0.01, dur: 0.1, attack: 0.002, volume: 0.06, tremolo: { rate: 40, depth: 0.6 } },
    ],
  },
  'fire-bomb-stormsteel': {
    layers: [
      { wave: 'sine', from: 170, to: 55, dur: 0.24, attack: 0.002, volume: 0.64 },
      { wave: 'noise', from: 2400, to: 400, dur: 0.2, attack: 0.002, volume: 0.36 },
      { wave: 'triangle', from: 2200, to: 1900, delay: 0.02, dur: 0.12, attack: 0.002, volume: 0.06, tremolo: { rate: 36, depth: 0.6 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;

/** 062: a steel round fires with these, by its family; any other round (a glass bolt too) with its family's own. */
export const STEEL_FIRE_SOUNDS = { arrow: TIER_SOUNDS.fireArrowSteel, bomb: TIER_SOUNDS.fireBombSteel, landmine: TIER_SOUNDS.fireBombSteel } as const;

/** 066: a stormsteel round fires with these, by its family: steel's, sharper. */
export const STORMSTEEL_FIRE_SOUNDS = { arrow: TIER_SOUNDS.fireArrowStormsteel, bomb: TIER_SOUNDS.fireBombStormsteel, landmine: TIER_SOUNDS.fireBombStormsteel } as const;

/** 062: the sound a Forge machine makes as it starts working a craft, by machine id (066: the coil's crackle). */
export const WORK_SOUNDS = { smelter: TIER_SOUNDS.smelterPour, kiln: TIER_SOUNDS.kilnRoar, 'tempering-coil': TIER_SOUNDS.coilCrackle } as const;
