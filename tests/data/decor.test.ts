import { describe, expect, it } from 'vitest';
import { DECOR, DECOR_CLEAR, DECOR_REGIONS, RUIN_VARIANTS } from '../../src/data/decor';
import { FOOTPRINTS } from '../../src/data/footprints';
import { paletteHex } from '../../src/data/palette';
import { DEPTHS } from '../../src/data/assets';
import { PLANT_FRAMES, SCATTER_FRAMES } from '../../src/data/worldArtAssets';
import { inksOf, type VectorSprite } from '../../src/data/art/types';
import { WORLD_ART_SPRITES } from '../../src/data/art/worldArt';
import { OVERWORLD_SPRITES } from '../../src/data/assets';
import { HOLLOWS_SPRITES } from '../../src/data/hollowsAssets';
import { EMBERWORKS_SPRITES } from '../../src/data/emberworksAssets';
import { STORMCROWN_SPRITES } from '../../src/data/stormcrownAssets';
import { VECTOR_SPRITES } from '../../src/data/art/sprites';
import { TERRAIN_SPRITES } from '../../src/data/art/terrain';
import { HOLLOWS_SPRITES_VECTOR } from '../../src/data/art/hollows';
import { EMBERWORKS_SPRITES_VECTOR } from '../../src/data/art/emberworks';
import { STORMCROWN_SPRITES_VECTOR } from '../../src/data/art/stormcrown';

// 077: the world's detail as data: each region's plants, scatter and ruin variants, drawn and registered, in palette
// ids, at the spec's densities; ruin variants keep their base frame's footprint.

const frameNames = (s: VectorSprite): string[] => (s.frames.length === 1 ? [s.key] : s.frames.map((_, i) => `${s.key}/${i}`));
const drawn = new Map(WORLD_ART_SPRITES.flatMap((s) => frameNames(s).map((n) => [n, s] as const)));
const allSprites = [...VECTOR_SPRITES, ...TERRAIN_SPRITES, ...HOLLOWS_SPRITES_VECTOR, ...EMBERWORKS_SPRITES_VECTOR, ...STORMCROWN_SPRITES_VECTOR, ...WORLD_ART_SPRITES];
const spriteOf = (name: string): VectorSprite | undefined => allSprites.find((s) => frameNames(s).includes(name));

describe('decor sets (077)', () => {
  it('gives every region plants and scatter, at the spec’s densities, and the Hollows its vines', () => {
    const R = DECOR.regions;
    expect(DECOR_REGIONS.map((r) => [r, R[r].plantOneIn, R[r].scatterOneIn])).toEqual([
      ['meadow', 7, 10],
      ['hollows', 14, 6],
      ['ember', 24, 6],
      ['storm', 12, 6],
    ]);
    expect(R.hollows.vines?.oneIn).toBe(6);
    for (const r of ['meadow', 'ember', 'storm'] as const) expect(R[r].vines).toBeUndefined();
    expect(DECOR.maxPlantsPerChunk).toBe(80);
    for (const r of DECOR_REGIONS) {
      expect(R[r].plants.length, r).toBeGreaterThan(0);
      expect(R[r].scatter.length, r).toBeGreaterThan(0);
      for (const s of [...R[r].plants, ...R[r].scatter]) expect(s.id, r).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
    // Region 1: grass clumps (3 shapes), flower clumps (3), ferns at grove edges (2), pond-rim reeds.
    expect(R.meadow.plants.map((p) => [p.id, p.where, p.frames.length])).toEqual([
      ['grass-clump', 'open', 3],
      ['flower-clump', 'open', 3],
      ['fern', 'groveEdge', 2],
      ['pond-reed', 'pondRim', 2],
    ]);
  });

  it('draws every plant, scatter mark and variant, in palette ids, and plants stand at most 12 px tall', () => {
    const names = [...Object.values(PLANT_FRAMES).flat(), ...Object.values(SCATTER_FRAMES).flat(), ...RUIN_VARIANTS.flatMap((v) => v.base.flatMap((b) => v.frames(b)))];
    for (const n of names) {
      const s = drawn.get(n);
      expect(s, n).toBeDefined();
      for (const f of s?.frames ?? []) for (const shape of f) for (const id of inksOf(shape)) expect(() => paletteHex(id), `${n}: ${id}`).not.toThrow();
    }
    for (const n of Object.values(PLANT_FRAMES).flat()) {
      if (n.startsWith('decor-vine')) continue;
      const s = drawn.get(n);
      // Its box above the anchor (the foot) is the plant's height.
      expect(s?.anchor[1] ?? 99, n).toBeLessThanOrEqual(12 + 1);
    }
  });

  it('keeps every ruin variant on its base frame’s footprint (same drawn base) and in its piece class', () => {
    const bases = new Set([...OVERWORLD_SPRITES.rocks, OVERWORLD_SPRITES.ruinStone, ...HOLLOWS_SPRITES.rubble, ...EMBERWORKS_SPRITES.chimney, EMBERWORKS_SPRITES.kiln, ...STORMCROWN_SPRITES.ironRod, ...STORMCROWN_SPRITES.cairn]);
    for (const v of RUIN_VARIANTS) {
      expect(v.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(v.share[0]).toBeGreaterThan(0);
      expect(v.share[0]).toBeLessThan(v.share[1]);
      for (const b of v.base) {
        expect(bases, `${v.id}: ${b}`).toContain(b);
        const base = spriteOf(b);
        expect(base, b).toBeDefined();
        for (const f of v.frames(b)) {
          const variant = drawn.get(f);
          expect(variant, f).toBeDefined();
          // The sim reads collision from the base frame's footprint; the variant draws the same base: its shadow
          // ellipse (the footprint's source, 059) and its box.
          if (FOOTPRINTS[b]) expect(variant?.frames[0]?.[0], `${f} keeps ${b}'s shadow`).toEqual(base?.frames[0]?.[0]);
          expect(FOOTPRINTS[f], `${f} has no footprint of its own`).toBeUndefined();
        }
      }
    }
    // The spec's shares: ruin stones 3 in 4, boulders 1 in 5, rubble 1 in 4, chimneys 1 in 6, rods 1 in 6, cairns 1 in 5.
    const share = Object.fromEntries(RUIN_VARIANTS.map((v) => [v.id, v.share]));
    expect(share).toMatchObject({ 'ruin-stone': [3, 4], 'mossy-boulder': [1, 5], 'hollows-rubble': [1, 4], 'chimney-stump': [1, 6], 'broken-rod': [1, 6], 'marked-cairn': [1, 5] });
  });

  it('draws plants over the ground and glows and under the fog and telegraphs', () => {
    expect(DEPTHS.decor).toBeGreaterThan(DEPTHS.glow);
    expect(DEPTHS.decor).toBeLessThan(DEPTHS.fog);
    expect(DEPTHS.decor).toBeLessThan(DEPTHS.groundFx);
    expect(DECOR_CLEAR).toMatchObject({ pathMargin: 1, pointMargin: 2 });
  });
});
