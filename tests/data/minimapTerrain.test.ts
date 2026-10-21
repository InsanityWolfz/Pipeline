import { describe, expect, it } from 'vitest';
import { inHollows } from '../../src/data/hollows';
import { MINIMAP, MINIMAP_SCENERY, minimapColor } from '../../src/data/minimap';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { OVERWORLD } from '../../src/data/overworld';
import { roomById } from '../../src/sim/roomLookup';

// 051 (B.5, 051.8): water, shallows, trees, ruin stones and boulders are scenery, off the minimap: each is drawn in the
// ground's own colour, Region 1's grass and the Hollows' stone.
describe('the minimap draws scenery as the ground', () => {
  const tiles = roomById(OVERWORLD.id).rows.flatMap((row, ty) => [...row].map((symbol, tx) => ({ symbol, tx, ty })));
  const scenery = tiles.filter((t) => (MINIMAP_SCENERY as readonly string[]).includes(t.symbol));

  for (const [region, inside] of [['Region 1', false], ['the Hollows', true]] as const) {
    it(`every scenery tile in ${region} shows as its ground`, () => {
      const here = scenery.filter((t) => inHollows(t.tx, t.ty) === inside);
      expect(here.length).toBeGreaterThan(0);
      const ground = here[0] ? minimapColor('.', here[0].tx, here[0].ty) : '';
      const wrong = here.filter((t) => minimapColor(t.symbol, t.tx, t.ty) !== ground).map((t) => `${t.symbol}@${t.tx},${t.ty}`);
      expect(wrong).toEqual([]);
    });
  }

  it('every scenery symbol shows as the ground in either region, used or not', () => {
    const r1 = tiles.find((t) => !inHollows(t.tx, t.ty));
    const h = tiles.find((t) => inHollows(t.tx, t.ty));
    if (!r1 || !h) throw new Error('no tiles');
    for (const s of MINIMAP_SCENERY) {
      expect(minimapColor(s, r1.tx, r1.ty)).toBe(minimapColor('.', r1.tx, r1.ty));
      expect(minimapColor(s, h.tx, h.ty)).toBe(minimapColor('.', h.tx, h.ty));
    }
  });
});

describe('the round world on the minimap (053)', () => {
  it('fits the whole world in about 100 px, with the objective band below it', () => {
    const size = OVERWORLD.width * MINIMAP.scale;
    expect(OVERWORLD.width).toBe(OVERWORLD.height);
    expect(size).toBeGreaterThan(90);
    expect(size).toBeLessThan(120);
    const bottom = MINIMAP.margin + size + MINIMAP.frame.width;
    expect(TUTORIAL_LAYOUT.objectiveTop - TUTORIAL_LAYOUT.objectivePanel.padY).toBeGreaterThan(bottom + 4);
  });
});
