import { describe, expect, it } from 'vitest';
import { HOLLOWS_SOUND_RECIPES } from '../../src/data/hollowsSounds';
import { SOUNDS } from '../../src/data/sounds';
import { SealSound } from '../../src/render/hollowsFeel';
import type { SoundView } from '../../src/render/SoundView';

// 043.5 in 045: the forum's seal hums while it stands, and plays the barrier's collapse as it drops.

function fakeSound() {
  const played: string[] = [];
  const loops = new Map<string, boolean>();
  const s = { play: (k: string) => played.push(k), loop: (k: string, on: boolean) => loops.set(k, on) } as unknown as SoundView;
  return { s, played, loops };
}

describe("the seal's sounds (045, 043.5)", () => {
  it('hums while sealed, then collapses once as it drops', () => {
    const f = fakeSound();
    const seal = new SealSound();
    seal.update(false, f.s);
    expect(f.loops.get(SOUNDS.sealHum)).toBe(false);
    seal.update(true, f.s);
    seal.update(true, f.s);
    expect(f.loops.get(SOUNDS.sealHum)).toBe(true);
    expect(f.played).toEqual([]);
    seal.update(false, f.s);
    expect(f.loops.get(SOUNDS.sealHum)).toBe(false);
    expect(f.played).toEqual([SOUNDS.barrierCollapse]);
    expect(seal.drops).toBe(1);
    seal.update(false, f.s);
    expect(f.played).toEqual([SOUNDS.barrierCollapse]);
  });

  it('the hum is a seamless loop recipe', () => {
    expect(HOLLOWS_SOUND_RECIPES['seal-hum'].loop).toBeGreaterThan(0);
  });
});

describe("the boss room's hum (059)", () => {
  it("plays at half 045's volume: each layer's peak halved", () => {
    expect(HOLLOWS_SOUND_RECIPES['seal-hum'].layers.map((l) => l.volume)).toEqual([0.16 / 2, 0.1 / 2, 0.035 / 2]);
  });
});
