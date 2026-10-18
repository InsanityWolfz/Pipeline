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

/** Largest per-sample difference (of 32767) that still counts as up to date. */
const SAMPLE_TOLERANCE = 4;

describe('sound data', () => {
  it('has a recipe for every key', () => {
    for (const key of Object.values(SOUNDS)) expect(SOUND_RECIPES[key]?.layers.length, key).toBeGreaterThan(0);
  });

  it('matches the committed sounds, so they were rebuilt after editing', () => {
    const out = mkdtempSync(join(tmpdir(), 'sound-'));
    buildSounds(out);
    expect(readdirSync('assets/build/sounds').sort()).toEqual(readdirSync(out).sort());
    // Float maths can differ in the last bit between Node versions, so samples may be off by a hair.
    for (const file of readdirSync(out)) {
      const fresh = readFileSync(join(out, file));
      const kept = readFileSync(join('assets/build/sounds', file));
      expect(kept.length, `${file} is stale: run npm run sound`).toBe(fresh.length);
      expect(kept.subarray(0, 44).equals(fresh.subarray(0, 44)), `${file} header`).toBe(true);
      let worst = 0;
      for (let i = 44; i < fresh.length; i += 2) worst = Math.max(worst, Math.abs(fresh.readInt16LE(i) - kept.readInt16LE(i)));
      expect(worst, `${file} is stale: run npm run sound`).toBeLessThanOrEqual(SAMPLE_TOLERANCE);
    }
    rmSync(out, { recursive: true });
  });
});
