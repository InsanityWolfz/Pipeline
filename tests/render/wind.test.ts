import { describe, expect, it } from 'vitest';
import { GUST_EASE_MS, WIND } from '../../src/data/ambient';
import { createRng } from '../../src/sim/rng';
import { WindNow } from '../../src/render/world/wind';

// 077 (review): a gust eases in and out over GUST_EASE_MS (the dust's speed with it) instead of switching in a frame,
// and still blows at its full strength.

describe('wind gusts (077)', () => {
  for (const region of ['hollows', 'storm'] as const) {
    it(`${region}: eases a gust in and out, reaching its full strength`, () => {
      const gusts = WIND[region].gusts;
      if (!gusts) throw new Error('no gusts');
      const w = new WindNow(createRng(7));
      const weights = { meadow: 0, hollows: 0, ember: 0, storm: 0, [region]: 1 };
      const dt = 1000 / 60;
      // Smoothstep's steepest slope is 1.5 × the straight ramp's.
      const most = ((gusts.mult - 1) * 1.5 * dt) / GUST_EASE_MS + 1e-9;
      let last = w.step(dt, weights).gust;
      let top = last;
      let worst = 0;
      for (let i = 0; i < 60 * 40; i++) {
        const g = w.step(dt, weights).gust;
        worst = Math.max(worst, Math.abs(g - last));
        top = Math.max(top, g);
        last = g;
      }
      expect(worst).toBeLessThanOrEqual(most);
      expect(top).toBeCloseTo(gusts.mult, 6);
    });
  }
});
