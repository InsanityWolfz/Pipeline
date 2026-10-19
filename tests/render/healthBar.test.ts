import { describe, expect, it } from 'vitest';
import { HP_BAR } from '../../src/data/hudLayout';
import { chunkOf, createHealthBar, isLow, pulseOf, stepHealthBar, type HealthBarInput } from '../../src/render/healthBarModel';

// The HP bar's motion (031), pure: the fill shown, the white damage chunk that holds
// then drains, the smooth rise while healing, and the low-HP pulse.

const MAX = 100;
const at = (health: number, healing = false, dying = false): HealthBarInput => ({ health, max: MAX, healing, dying });

describe('the damage chunk', () => {
  it('a drop leaves the lost part white for chunkHoldMs, then drains to the new value over chunkDrainMs', () => {
    const m = createHealthBar(100);
    stepHealthBar(m, at(70), 16);
    expect(m.shown).toBe(70);
    expect(chunkOf(m)).toBe(30);
    stepHealthBar(m, at(70), HP_BAR.chunkHoldMs - 20);
    expect(chunkOf(m)).toBe(30);
    // Into the drain: half way through it, about half is left.
    stepHealthBar(m, at(70), 20 + HP_BAR.chunkDrainMs / 2);
    expect(chunkOf(m)).toBeGreaterThan(10);
    expect(chunkOf(m)).toBeLessThan(20);
    stepHealthBar(m, at(70), HP_BAR.chunkDrainMs);
    expect(chunkOf(m)).toBe(0);
  });

  it('a hit during the hold grows the same chunk and restarts the hold', () => {
    const m = createHealthBar(100);
    stepHealthBar(m, at(80), 16);
    stepHealthBar(m, at(80), HP_BAR.chunkHoldMs - 50);
    stepHealthBar(m, at(60), 16);
    expect(chunkOf(m)).toBe(40);
    // The hold starts over: still the whole chunk just before it would have ended the second time.
    stepHealthBar(m, at(60), HP_BAR.chunkHoldMs - 20);
    expect(chunkOf(m)).toBe(40);
    stepHealthBar(m, at(60), 20 + HP_BAR.chunkDrainMs + 1);
    expect(chunkOf(m)).toBe(0);
  });

  it('healing past the chunk clears it; healing into it shrinks it', () => {
    const m = createHealthBar(100);
    stepHealthBar(m, at(50), 16);
    expect(chunkOf(m)).toBe(50);
    stepHealthBar(m, at(60, true), 16);
    expect(chunkOf(m)).toBe(40);
    stepHealthBar(m, at(100, true), 16);
    expect(chunkOf(m)).toBe(0);
    // The drain doesn't bring back a cleared chunk.
    stepHealthBar(m, at(100), HP_BAR.chunkHoldMs + HP_BAR.chunkDrainMs);
    expect(chunkOf(m)).toBe(0);
  });
});

describe('the fill', () => {
  it('rises smoothly while healing', () => {
    const m = createHealthBar(40);
    stepHealthBar(m, at(50, true), 16);
    expect(m.shown).toBeGreaterThan(40);
    expect(m.shown).toBeLessThan(50);
    for (let i = 0; i < 200; i++) stepHealthBar(m, at(50, true), 16);
    expect(m.shown).toBe(50);
  });

  it('jumps when health rises without healing (a wake at full health)', () => {
    const m = createHealthBar(10);
    stepHealthBar(m, at(100), 16);
    expect(m.shown).toBe(100);
    expect(chunkOf(m)).toBe(0);
  });
});

describe('low HP', () => {
  it('is below a quarter of max health, never while dying', () => {
    expect(isLow(25, MAX, false)).toBe(false);
    expect(isLow(24, MAX, false)).toBe(true);
    expect(isLow(1, MAX, false)).toBe(true);
    expect(isLow(0, MAX, true)).toBe(false);
    expect(isLow(10, MAX, true)).toBe(false);
  });

  it('pulses once per pulseMs while low and rests at 0 otherwise', () => {
    const m = createHealthBar(100);
    stepHealthBar(m, at(100), 16);
    expect(pulseOf(m)).toBe(0);
    stepHealthBar(m, at(20), 16);
    const seen: number[] = [];
    for (let t = 0; t < HP_BAR.pulseMs; t += 10) {
      stepHealthBar(m, at(20), 10);
      seen.push(pulseOf(m));
    }
    expect(Math.max(...seen)).toBeGreaterThan(0.95);
    expect(Math.min(...seen)).toBeLessThan(0.05);
    // Back at the threshold, it stops; and during the KO fade.
    stepHealthBar(m, at(25), 16);
    expect(pulseOf(m)).toBe(0);
    stepHealthBar(m, at(0, false, true), 16);
    expect(pulseOf(m)).toBe(0);
  });
});
