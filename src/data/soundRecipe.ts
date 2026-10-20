// The shape of a synth sound recipe (014): sounds.ts and its per-spec companions hold the
// recipes; `npm run sound` renders them.

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
