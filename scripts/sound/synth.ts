// A tiny synth for npm run sound: renders a SoundRecipe to mono samples in -1..1.
// Deterministic: noise comes from a fixed-seed generator, so rebuilds are byte-identical.
import type { SoundLayer, SoundRecipe } from '../../src/data/sounds.ts';

/** A small fixed-seed generator for noise. */
function noiseSource(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 0x100000000) * 2 - 1;
  };
}

function wave(kind: SoundLayer['wave'], phase: number): number {
  const p = phase - Math.floor(phase);
  if (kind === 'sine') return Math.sin(2 * Math.PI * p);
  if (kind === 'square') return p < 0.5 ? 1 : -1;
  if (kind === 'saw') return 2 * p - 1;
  return 1 - 4 * Math.abs(p - 0.5);
}

/** Renders one layer into `out` from its delay; a loop wraps samples past the end round to the start. */
function renderLayer(out: Float32Array, layer: SoundLayer, rate: number, loop: boolean, seed: number): void {
  const start = Math.round((layer.delay ?? 0) * rate);
  const n = Math.round(layer.dur * rate);
  const attack = Math.max(1, Math.round((layer.attack ?? 0.005) * rate));
  const noise = noiseSource(seed);
  let phase = 0;
  let low = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const freq = layer.from + (layer.to - layer.from) * t;
    let v: number;
    if (layer.wave === 'noise') {
      // Noise is shaped by a sweeping one-pole low-pass at `freq`.
      const a = 1 - Math.exp((-2 * Math.PI * freq) / rate);
      low += a * (noise() - low);
      v = low * 2;
    } else {
      phase += freq / rate;
      v = wave(layer.wave, phase);
    }
    if (layer.lowpass && layer.wave !== 'noise') {
      const a = 1 - Math.exp((-2 * Math.PI * layer.lowpass) / rate);
      low += a * (v - low);
      v = low;
    }
    // A loop's beds hold steady; one-shots rise over the attack, then decay away.
    const env = loop && !layer.attack ? 1 : i < attack ? i / attack : Math.pow(1 - (i - attack) / Math.max(1, n - attack), 2);
    const trem = layer.tremolo ? 1 - layer.tremolo.depth * 0.5 * (1 + Math.sin((2 * Math.PI * layer.tremolo.rate * i) / rate)) : 1;
    const at = start + i;
    const idx = loop ? at % out.length : at;
    if (idx < out.length) out[idx] = (out[idx] ?? 0) + v * env * trem * layer.volume;
  }
}

/** Every layer mixed, soft-clipped into -1..1. */
export function renderSound(recipe: SoundRecipe, rate: number): Float32Array {
  const loop = recipe.loop !== undefined;
  const length = loop ? (recipe.loop ?? 0) : Math.max(...recipe.layers.map((l) => (l.delay ?? 0) + l.dur));
  const out = new Float32Array(Math.ceil(length * rate));
  recipe.layers.forEach((layer, i) => renderLayer(out, layer, rate, loop, i + 1));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] ?? 0);
  return out;
}
