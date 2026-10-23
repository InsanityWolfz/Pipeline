import { describe, expect, it } from 'vitest';
import { regionAt } from '../../src/data/hollows';
import { MINIMAP, MINIMAP_SCENERY, minimapColor } from '../../src/data/minimap';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { OVERWORLD } from '../../src/data/overworld';
import { roomById } from '../../src/sim/roomLookup';

// 051 (B.5, 051.8): water, shallows, trees, ruin stones and boulders are scenery, off the minimap: each is drawn in the
// ground's own colour, Region 1's grass, the Hollows' stone and (060) the Emberworks' ash.
describe('the minimap draws scenery as the ground', () => {
  const tiles = roomById(OVERWORLD.id).rows.flatMap((row, ty) => [...row].map((symbol, tx) => ({ symbol, tx, ty })));
  const scenery = tiles.filter((t) => (MINIMAP_SCENERY as readonly string[]).includes(t.symbol));

  // 060: the Emberworks generates no scenery of its own (its kilns and chimneys show), so only the first two have any.
  for (const [name, region] of [['Region 1', 1], ['the Hollows', 2]] as const) {
    it(`every scenery tile in ${name} shows as its ground`, () => {
      const here = scenery.filter((t) => regionAt(t.tx, t.ty) === region);
      expect(here.length).toBeGreaterThan(0);
      const ground = here[0] ? minimapColor('.', here[0].tx, here[0].ty) : '';
      const wrong = here.filter((t) => minimapColor(t.symbol, t.tx, t.ty) !== ground).map((t) => `${t.symbol}@${t.tx},${t.ty}`);
      expect(wrong).toEqual([]);
    });
  }

  it('every scenery symbol shows as the ground in every region, used or not', () => {
    for (const region of [1, 2, 3]) {
      const t = tiles.find((x) => regionAt(x.tx, x.ty) === region);
      if (!t) throw new Error(`no tiles in region ${region}`);
      for (const s of MINIMAP_SCENERY) expect(minimapColor(s, t.tx, t.ty), `${s} in ${region}`).toBe(minimapColor('.', t.tx, t.ty));
    }
  });

  it("draws the Emberworks in its own colours (060): ash ground, rust kilns, soot chimneys and cliffs, the ramps' pale steps", () => {
    const t = tiles.find((x) => regionAt(x.tx, x.ty) === 3);
    if (!t) throw new Error('no Emberworks tiles');
    expect(['.', 'K', 'H', 'C', '^'].map((s) => minimapColor(s, t.tx, t.ty))).toEqual(['ash-light', 'rust', 'ash-dark', 'ash-dark', 'ash-pale']);
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
