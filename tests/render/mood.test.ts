import { describe, expect, it } from 'vitest';
import { LIGHTNING_FLASH, MOOD_BLEND, MOOD_EDGES, REGION_MOODS } from '../../src/data/moods';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import { ambientRgb, flashLevel, moodAt, withFlash } from '../../src/render/lighting/mood';

// 074: the mood by distance from the foundry's door (the camera's centre), blended over 4 tiles each side of a region
// edge; and the lightning flash's curve.

const brightness = (rgb: readonly number[]): number => rgb.reduce((a, b) => a + b, 0);

describe('moodAt (074)', () => {
  it('is each region’s own mood away from the edges', () => {
    expect(moodAt(10)).toMatchObject({ ring: 0, blend: 0 });
    expect(moodAt(40).ambient).toEqual(ambientRgb(REGION_MOODS[0].ambient.color, REGION_MOODS[0].ambient.darkness));
    expect(moodAt(63)).toMatchObject({ ring: 3, blend: 0 });
    expect(moodAt(95)).toMatchObject({ ring: 4, blend: 0 });
    expect(moodAt(130)).toMatchObject({ ring: 5, blend: 0 });
    expect(moodAt(130).lightScale).toBe(1.4);
    expect(moodAt(130).ambient).toEqual(ambientRgb('storm', 0.75));
  });

  it('darkens region by region, Region 1 to the Stormcrown', () => {
    const b = [10, 63, 95, 130].map((d) => brightness(moodAt(d).ambient));
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeLessThan(b[i - 1] ?? 0);
  });

  it('blends linearly across each edge’s band, halfway on the edge, with no step bigger than one quantum', () => {
    for (const e of MOOD_EDGES) {
      const lo = e.radius - MOOD_BLEND.tiles;
      const hi = e.radius + MOOD_BLEND.tiles;
      expect(moodAt(lo - 0.01)).toMatchObject({ ring: e.inner, blend: 0 });
      expect(moodAt(e.radius)).toMatchObject({ ring: e.inner, outer: e.outer, blend: 0.5 });
      expect(moodAt(hi + 0.01)).toMatchObject({ ring: e.outer, blend: 0 });
      const inner = brightness(moodAt(lo - 0.01).ambient);
      const outer = brightness(moodAt(hi + 0.01).ambient);
      const quantum = Math.abs(inner - outer) / MOOD_BLEND.steps;
      let last = inner;
      for (let d = lo - 0.5; d <= hi + 0.5; d += 0.05) {
        const now = brightness(moodAt(d).ambient);
        expect(Math.abs(now - last)).toBeLessThanOrEqual(quantum + 3);
        last = now;
      }
    }
  });

  it('carries the wash, the fog (none in Region 1) and the light scale through the blend', () => {
    expect(moodAt(10).fog.alpha).toBe(0);
    expect(moodAt(10).wash.alpha).toBe(0.04);
    expect(moodAt(130).fog).toMatchObject({ alpha: 0.12, speed: 12, rgb: hexToRgb(paletteHex('storm-light')) });
    const edge = moodAt(MOOD_EDGES[0]?.radius ?? 0);
    expect(edge.fog.alpha).toBeCloseTo(0.05, 5);
    expect(edge.lightScale).toBeCloseTo(0.55, 5);
  });
});

describe('the lightning flash (074)', () => {
  it('holds full for 120 ms, eases back to nothing over 400 ms, and is never there with Flashes off', () => {
    expect(flashLevel(0, true)).toBe(1);
    expect(flashLevel(LIGHTNING_FLASH.holdMs, true)).toBe(1);
    const mid = flashLevel(LIGHTNING_FLASH.holdMs + LIGHTNING_FLASH.easeMs / 2, true);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(flashLevel(LIGHTNING_FLASH.holdMs + LIGHTNING_FLASH.easeMs, true)).toBe(0);
    expect(flashLevel(Infinity, true)).toBe(0);
    expect(flashLevel(0, false)).toBe(0);
  });

  it('lifts the ambient toward storm-pale, never darker', () => {
    const storm = moodAt(130).ambient;
    const lit = withFlash(storm, 1);
    expect(lit).toEqual(ambientRgb('storm-pale', 0.3));
    expect(withFlash(storm, 0)).toEqual(storm);
    const sunny = moodAt(10).ambient;
    for (const [i, c] of withFlash(sunny, 1).entries()) expect(c).toBeGreaterThanOrEqual(sunny[i] ?? 0);
  });
});
