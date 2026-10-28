import { describe, expect, it } from 'vitest';
import { ENEMY_FX } from '../../src/data/assets';
import { fillAt } from '../../src/render/telegraphLook';

// 076: every ground telegraph reads on any ground (Shaun: enemies and their wind-ups stay bright and readable in every
// region): a near-opaque danger rim round its full extent, and its fill strengthening toward the peak.

describe('telegraph look (076)', () => {
  it('rims every telegraph in near-opaque danger', () => {
    expect(ENEMY_FX.telegraphRim.color).toBe('danger');
    expect(ENEMY_FX.telegraphRim.alpha).toBeGreaterThanOrEqual(0.85);
    expect(ENEMY_FX.telegraphRim.width).toBeGreaterThanOrEqual(1);
  });

  it('strengthens a fill from its own alpha at the start to the peak alpha at the end', () => {
    const base = ENEMY_FX.telegraphFillAlpha;
    expect(fillAt(base, 0)).toBeCloseTo(base, 6);
    expect(fillAt(base, 1)).toBeCloseTo(ENEMY_FX.telegraphFillPeak, 6);
    expect(ENEMY_FX.telegraphFillPeak).toBeGreaterThan(base);
    expect(fillAt(base, 0.5)).toBeGreaterThan(fillAt(base, 0.25));
    // Never past the ends, and a fill already stronger than the peak is left as it is.
    expect(fillAt(base, 2)).toBeCloseTo(ENEMY_FX.telegraphFillPeak, 6);
    expect(fillAt(0.95, 1)).toBeCloseTo(0.95, 6);
  });
});
