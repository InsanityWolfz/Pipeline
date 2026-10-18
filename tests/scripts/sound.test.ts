import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSounds } from '../../scripts/sound/build';
import { renderSound } from '../../scripts/sound/synth';
import { encodeWav } from '../../scripts/sound/wav';
import { SOUND_RATE, SOUND_RECIPES, SOUNDS } from '../../src/data/sounds';

describe('the sound synth', () => {
  it('renders the same samples every time, inside -1..1', () => {
    const a = renderSound(SOUND_RECIPES['fire-arrow'], SOUND_RATE);
    const b = renderSound(SOUND_RECIPES['fire-arrow'], SOUND_RATE);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(Math.max(...a.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it('makes a loop exactly its length', () => {
    const loop = renderSound(SOUND_RECIPES['ambient-foundry'], SOUND_RATE);
    expect(loop.length).toBe(8 * SOUND_RATE);
  });

  it('writes a 16-bit mono WAV header', () => {
    const wav = encodeWav(new Float32Array([0, 1, -1]), 8000);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(8000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(6);
    expect(wav.readInt16LE(46)).toBe(32767);
  });
});

describe('sound data', () => {
  it('has a recipe for every key', () => {
    for (const key of Object.values(SOUNDS)) expect(SOUND_RECIPES[key]?.layers.length, key).toBeGreaterThan(0);
  });

  it('matches the committed sounds, so they were rebuilt after editing', () => {
    const out = mkdtempSync(join(tmpdir(), 'sound-'));
    buildSounds(out);
    expect(readdirSync('assets/build/sounds').sort()).toEqual(readdirSync(out).sort());
    for (const file of readdirSync(out)) {
      expect(readFileSync(join(out, file)).equals(readFileSync(join('assets/build/sounds', file))), `${file} is stale: run npm run sound`).toBe(true);
    }
    rmSync(out, { recursive: true });
  });
});
