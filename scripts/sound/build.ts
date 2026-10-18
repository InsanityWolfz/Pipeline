// Renders every sound recipe in src/data/sounds.ts to <out>/<key>.wav.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOUND_RATE, SOUND_RECIPES } from '../../src/data/sounds.ts';
import { renderSound } from './synth.ts';
import { encodeWav } from './wav.ts';

export function buildSounds(out: string): string[] {
  mkdirSync(out, { recursive: true });
  const keys = Object.keys(SOUND_RECIPES) as (keyof typeof SOUND_RECIPES)[];
  for (const key of keys) writeFileSync(join(out, `${key}.wav`), encodeWav(renderSound(SOUND_RECIPES[key], SOUND_RATE), SOUND_RATE));
  return keys;
}
