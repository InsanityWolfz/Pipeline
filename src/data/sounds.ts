// Sound effects and ambient loops (014), as synth recipes. `npm run sound` renders
// each one to assets/build/sounds/<key>.wav; render plays them by these keys.

/** One voice of a sound: a wave whose pitch sweeps `from` → `to` Hz under an attack/decay envelope. */
export interface SoundLayer {
  wave: 'sine' | 'square' | 'saw' | 'triangle' | 'noise';
  /** Start and end pitch, Hz. Noise uses `to` as its low-pass cutoff sweep instead. */
  from: number;
  to: number;
  /** When it starts and how long it lasts, s. */
  delay?: number;
  dur: number;
  attack?: number;
  /** Peak level, 0–1. */
  volume: number;
  /** Amplitude wobble: rate Hz and depth 0–1. */
  tremolo?: { rate: number; depth: number };
  /** A one-pole low-pass cutoff, Hz. */
  lowpass?: number;
}

export interface SoundRecipe {
  layers: readonly SoundLayer[];
  /** Ambient loops: this long, s; layers wrap round the end so it loops seamlessly. */
  loop?: number;
}

export const SOUND_RATE = 22050;

/** Sound keys. Render uses these, never string literals. */
export const SOUNDS = {
  fireArrow: 'fire-arrow',
  fireBomb: 'fire-bomb',
  fireLeyBolt: 'fire-ley-bolt',
  dryFire: 'dry-fire',
  hit: 'hit',
  enemyHurt: 'enemy-hurt',
  enemyDeath: 'enemy-death',
  huskWindup: 'husk-windup',
  wispCharge: 'wisp-charge',
  wardenSlam: 'warden-slam',
  burst: 'burst',
  playerHurt: 'player-hurt',
  playerKo: 'player-ko',
  pickup: 'pickup',
  harvest: 'harvest',
  craft: 'craft',
  place: 'place',
  pickUpPiece: 'pick-up-piece',
  rotate: 'rotate',
  machineCraft: 'machine-craft',
  refill: 'refill',
  attune: 'attune',
  claim: 'claim',
  travel: 'travel',
  menuClick: 'menu-click',
  menuHover: 'menu-hover',
  gateOpen: 'gate-open',
  roll: 'roll',
  ambientClearing: 'ambient-clearing',
  ambientRuin: 'ambient-ruin',
  ambientFoundry: 'ambient-foundry',
  ambientShrine: 'ambient-shrine',
} as const;

export type SoundKey = (typeof SOUNDS)[keyof typeof SOUNDS];

const birds = (times: readonly number[], pitch: number): SoundLayer[] =>
  times.flatMap((t, i) => [
    { wave: 'sine', from: pitch + i * 140, to: pitch + 900 + i * 90, delay: t, dur: 0.07, attack: 0.01, volume: 0.12 },
    { wave: 'sine', from: pitch + 700 + i * 60, to: pitch + 200, delay: t + 0.09, dur: 0.09, attack: 0.01, volume: 0.1 },
  ]);

const chimes = (notes: readonly [number, number][], volume: number): SoundLayer[] =>
  notes.flatMap(([t, f]) => [
    { wave: 'sine', from: f, to: f, delay: t, dur: 2.6, attack: 0.01, volume },
    { wave: 'sine', from: f * 2.76, to: f * 2.76, delay: t, dur: 1.2, attack: 0.01, volume: volume * 0.35 },
  ]);

export const SOUND_RECIPES: Readonly<Record<SoundKey, SoundRecipe>> = {
  'fire-arrow': {
    layers: [
      { wave: 'noise', from: 6000, to: 1500, dur: 0.12, attack: 0.002, volume: 0.35 },
      { wave: 'triangle', from: 700, to: 180, dur: 0.08, attack: 0.002, volume: 0.35 },
    ],
  },
  'fire-bomb': {
    layers: [
      { wave: 'sine', from: 160, to: 60, dur: 0.22, attack: 0.002, volume: 0.6 },
      { wave: 'noise', from: 1500, to: 300, dur: 0.18, attack: 0.002, volume: 0.35 },
    ],
  },
  'fire-ley-bolt': {
    layers: [
      { wave: 'square', from: 1400, to: 500, dur: 0.14, attack: 0.002, volume: 0.16, lowpass: 3500 },
      { wave: 'sine', from: 2200, to: 900, dur: 0.18, attack: 0.002, volume: 0.25, tremolo: { rate: 40, depth: 0.5 } },
    ],
  },
  'dry-fire': { layers: [{ wave: 'square', from: 220, to: 200, dur: 0.05, attack: 0.001, volume: 0.15, lowpass: 1500 }] },
  hit: {
    layers: [
      { wave: 'noise', from: 3000, to: 800, dur: 0.07, attack: 0.001, volume: 0.4 },
      { wave: 'square', from: 300, to: 120, dur: 0.06, attack: 0.001, volume: 0.15, lowpass: 2000 },
    ],
  },
  'enemy-hurt': { layers: [{ wave: 'saw', from: 320, to: 160, dur: 0.12, attack: 0.005, volume: 0.22, lowpass: 1800 }] },
  'enemy-death': {
    layers: [
      { wave: 'saw', from: 260, to: 50, dur: 0.45, attack: 0.005, volume: 0.25, lowpass: 1400 },
      { wave: 'noise', from: 2500, to: 200, dur: 0.5, attack: 0.01, volume: 0.25 },
      { wave: 'sine', from: 900, to: 1800, delay: 0.25, dur: 0.4, attack: 0.05, volume: 0.1 },
    ],
  },
  'husk-windup': { layers: [{ wave: 'saw', from: 90, to: 180, dur: 0.35, attack: 0.15, volume: 0.22, lowpass: 900 }] },
  'wisp-charge': {
    layers: [{ wave: 'sine', from: 400, to: 1600, dur: 0.5, attack: 0.3, volume: 0.18, tremolo: { rate: 18, depth: 0.6 } }],
  },
  'warden-slam': {
    layers: [
      { wave: 'sine', from: 110, to: 35, dur: 0.6, attack: 0.002, volume: 0.8 },
      { wave: 'noise', from: 1200, to: 100, dur: 0.5, attack: 0.002, volume: 0.45 },
    ],
  },
  burst: {
    layers: [
      { wave: 'sine', from: 130, to: 40, dur: 0.5, attack: 0.002, volume: 0.7 },
      { wave: 'noise', from: 4000, to: 200, dur: 0.6, attack: 0.002, volume: 0.5 },
    ],
  },
  'player-hurt': {
    layers: [
      { wave: 'square', from: 500, to: 220, dur: 0.15, attack: 0.002, volume: 0.2, lowpass: 2500 },
      { wave: 'noise', from: 2000, to: 500, dur: 0.1, attack: 0.001, volume: 0.25 },
    ],
  },
  'player-ko': {
    layers: [
      { wave: 'triangle', from: 440, to: 110, dur: 1.2, attack: 0.01, volume: 0.35 },
      { wave: 'sine', from: 660, to: 165, dur: 1.2, attack: 0.01, volume: 0.2 },
      { wave: 'sine', from: 1200, to: 2400, delay: 0.6, dur: 0.9, attack: 0.3, volume: 0.1 },
    ],
  },
  pickup: {
    layers: [
      { wave: 'sine', from: 880, to: 880, dur: 0.06, attack: 0.002, volume: 0.22 },
      { wave: 'sine', from: 1320, to: 1320, delay: 0.05, dur: 0.12, attack: 0.002, volume: 0.22 },
    ],
  },
  harvest: {
    layers: [
      { wave: 'noise', from: 2500, to: 900, dur: 0.06, attack: 0.001, volume: 0.35 },
      { wave: 'triangle', from: 260, to: 200, dur: 0.06, attack: 0.001, volume: 0.25 },
    ],
  },
  craft: {
    layers: [
      { wave: 'triangle', from: 523, to: 523, dur: 0.08, attack: 0.002, volume: 0.22 },
      { wave: 'triangle', from: 659, to: 659, delay: 0.07, dur: 0.08, attack: 0.002, volume: 0.22 },
      { wave: 'triangle', from: 784, to: 784, delay: 0.14, dur: 0.2, attack: 0.002, volume: 0.22 },
    ],
  },
  place: {
    layers: [
      { wave: 'sine', from: 180, to: 90, dur: 0.12, attack: 0.001, volume: 0.45 },
      { wave: 'noise', from: 1800, to: 400, dur: 0.06, attack: 0.001, volume: 0.25 },
    ],
  },
  'pick-up-piece': { layers: [{ wave: 'triangle', from: 300, to: 600, dur: 0.1, attack: 0.002, volume: 0.25 }] },
  rotate: { layers: [{ wave: 'square', from: 900, to: 900, dur: 0.03, attack: 0.001, volume: 0.1, lowpass: 3000 }] },
  'machine-craft': {
    layers: [
      { wave: 'noise', from: 900, to: 300, dur: 0.18, attack: 0.01, volume: 0.25 },
      { wave: 'triangle', from: 1046, to: 1046, delay: 0.05, dur: 0.12, attack: 0.002, volume: 0.12 },
    ],
  },
  refill: { layers: [{ wave: 'sine', from: 1200, to: 1700, dur: 0.12, attack: 0.01, volume: 0.15, tremolo: { rate: 30, depth: 0.4 } }] },
  attune: {
    layers: [
      { wave: 'sine', from: 220, to: 440, dur: 1.4, attack: 0.6, volume: 0.3 },
      { wave: 'sine', from: 330, to: 660, dur: 1.4, attack: 0.6, volume: 0.2 },
      { wave: 'sine', from: 1320, to: 1760, delay: 0.5, dur: 1, attack: 0.3, volume: 0.1, tremolo: { rate: 12, depth: 0.5 } },
    ],
  },
  claim: {
    layers: [
      { wave: 'sine', from: 392, to: 392, dur: 1.2, attack: 0.05, volume: 0.25 },
      { wave: 'sine', from: 587, to: 587, delay: 0.15, dur: 1.1, attack: 0.05, volume: 0.2 },
      { wave: 'sine', from: 784, to: 784, delay: 0.3, dur: 1, attack: 0.05, volume: 0.18 },
    ],
  },
  travel: {
    layers: [
      { wave: 'noise', from: 300, to: 4000, dur: 0.7, attack: 0.4, volume: 0.35 },
      { wave: 'sine', from: 300, to: 1200, dur: 0.7, attack: 0.4, volume: 0.12 },
    ],
  },
  'menu-click': { layers: [{ wave: 'square', from: 1200, to: 900, dur: 0.035, attack: 0.001, volume: 0.1, lowpass: 4000 }] },
  'menu-hover': { layers: [{ wave: 'sine', from: 1800, to: 1800, dur: 0.02, attack: 0.001, volume: 0.05 }] },
  'gate-open': {
    layers: [
      { wave: 'noise', from: 800, to: 150, dur: 0.9, attack: 0.02, volume: 0.45 },
      { wave: 'sine', from: 90, to: 50, dur: 0.8, attack: 0.01, volume: 0.4 },
    ],
  },
  roll: { layers: [{ wave: 'noise', from: 600, to: 2200, dur: 0.18, attack: 0.05, volume: 0.2 }] },
  'ambient-clearing': {
    loop: 8,
    layers: [
      { wave: 'noise', from: 500, to: 500, dur: 8, attack: 0, volume: 0.12, tremolo: { rate: 0.25, depth: 0.6 } },
      ...birds([0.8, 1.15, 4.6, 6.9, 7.2], 2400),
    ],
  },
  'ambient-ruin': {
    loop: 8,
    layers: [
      { wave: 'noise', from: 300, to: 300, dur: 8, attack: 0, volume: 0.1, tremolo: { rate: 0.125, depth: 0.7 } },
      ...chimes([[2, 523], [6.5, 392]], 0.04),
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
  'ambient-shrine': {
    loop: 8,
    layers: [
      { wave: 'sine', from: 220, to: 220, dur: 8, attack: 0, volume: 0.06, tremolo: { rate: 0.25, depth: 0.5 } },
      ...chimes([[0.5, 659], [2.5, 880], [4.5, 784], [6.5, 988]], 0.07),
    ],
  },
};

/** The ambient loop for each room; rooms not listed are silent. */
export const ROOM_AMBIENCE: Readonly<Record<string, SoundKey>> = {
  clearing: SOUNDS.ambientClearing,
  'ruin-hall': SOUNDS.ambientRuin,
  foundry: SOUNDS.ambientFoundry,
  shrine: SOUNDS.ambientShrine,
};

/** Mixing: master volume to start with, how loud loops sit under effects, and the room crossfade. */
export const SOUND_MIX = { volume: 0.7, ambient: 0.45, crossfadeMs: 1200 } as const;

/** Where the mute and volume settings are saved in localStorage. */
export const SOUND_SETTINGS_KEY = 'pipeline.sound';

/** Effects the tube fires with, by ammo id. */
export const FIRE_SOUNDS: Readonly<Record<string, SoundKey>> = {
  arrow: SOUNDS.fireArrow,
  bomb: SOUNDS.fireBomb,
  'ley-bolt': SOUNDS.fireLeyBolt,
};

/** The wind-up cue by enemy kind. */
export const WINDUP_SOUNDS: Readonly<Record<string, SoundKey>> = {
  melee: SOUNDS.huskWindup,
  caster: SOUNDS.wispCharge,
  slammer: SOUNDS.wardenSlam,
};
