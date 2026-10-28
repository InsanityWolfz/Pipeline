import { describe, expect, it } from 'vitest';
import { LIGHTNING_FLASH, MOOD_BLEND, MOOD_EDGES, REGION_MOODS } from '../../src/data/moods';
import { hexToRgb, paletteHex } from '../../src/data/palette';
import { WORLD_SHAPE } from '../../src/data/worldShape';

// 074: a mood per danger ring (render reads it; the sim never does), every colour a palette id, the wash capped.

const RINGS = [0, 1, 2, 3, 4, 5] as const;
const isPaletteId = (id: string): boolean => {
  try {
    paletteHex(id);
    return true;
  } catch {
    return false;
  }
};
/** The ambient as the spec's table gives it: white toward the colour by `darkness`. */
const ambientHex = (color: string, darkness: number): [number, number, number] => hexToRgb(paletteHex(color)).map((c) => Math.round(255 + (c - 255) * darkness)) as [number, number, number];

describe('region moods (074)', () => {
  it('has a mood for each ring 0–5, Region 1’s three rings sharing one', () => {
    for (const r of RINGS) expect(REGION_MOODS[r]).toBeDefined();
    expect(REGION_MOODS[1]).toBe(REGION_MOODS[0]);
    expect(REGION_MOODS[2]).toBe(REGION_MOODS[0]);
  });

  it('uses palette ids only, and caps the wash at 0.06', () => {
    for (const r of RINGS) {
      const m = REGION_MOODS[r];
      const ids = [m.ambient.color, m.wash.color, m.lights.ley, m.lights.fire, m.lights.accent, ...(m.fog ? [m.fog.color] : [])];
      for (const id of ids) expect(isPaletteId(id), `${r}: ${id}`).toBe(true);
      expect(m.wash.alpha).toBeLessThanOrEqual(0.06);
    }
    expect(isPaletteId(LIGHTNING_FLASH.color)).toBe(true);
  });

  // 074 review: the dark regions retuned toward the approved "Ley-lit" card (docs/art/style-test-2.html): dusky, not pale haze.
  it('matches the spec’s table as retuned: ambients, washes, fog, accents and light scales', () => {
    const near = (got: [number, number, number], want: string) => {
      const w = hexToRgb(want);
      for (const i of [0, 1, 2]) expect(Math.abs((got[i] ?? 0) - (w[i] ?? 0))).toBeLessThanOrEqual(2);
    };
    const table = [
      { ring: 0, ambient: '#fcfef4', wash: ['sun', 0.04], fog: null, accent: 'sun', scale: 0.3 },
      { ring: 3, ambient: '#8f9aac', wash: ['hollow-dark', 0.04], fog: ['hollow-dark', 0.1, 4], accent: 'vein', scale: 1 },
      { ring: 4, ambient: '#af8477', wash: ['flame-dark', 0.06], fog: ['ash-dark', 0.15, 6], accent: 'cinder-light', scale: 1.2 },
      { ring: 5, ambient: '#4c4b60', wash: ['storm-dark', 0.06], fog: ['storm-dark', 0.1, 12], accent: 'storm-glow', scale: 1.8 },
    ] as const;
    for (const t of table) {
      const m = REGION_MOODS[t.ring];
      near(ambientHex(m.ambient.color, m.ambient.darkness), t.ambient);
      expect([m.wash.color, m.wash.alpha]).toEqual(t.wash);
      expect(m.fog ? [m.fog.color, m.fog.alpha, m.fog.speed] : null).toEqual(t.fog);
      expect(m.lights).toEqual({ ley: 'cyan', fire: 'cinder', accent: t.accent });
      expect(m.lightScale).toBe(t.scale);
    }
  });

  it('blends over 4 tiles each side of the three region edges, from the inner ring to the outer', () => {
    expect(MOOD_BLEND.tiles).toBe(4);
    expect(MOOD_EDGES.map((e) => [e.radius, e.inner, e.outer])).toEqual([
      [WORLD_SHAPE.region1, 2, 3],
      [WORLD_SHAPE.hollows, 3, 4],
      [WORLD_SHAPE.emberworks, 4, 5],
    ]);
  });

  it('flashes toward storm-pale for 120 ms and eases back over 400 ms', () => {
    expect(LIGHTNING_FLASH).toMatchObject({ color: 'storm-pale', darkness: 0.3, holdMs: 120, easeMs: 400 });
  });
});
