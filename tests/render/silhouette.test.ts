import { describe, expect, it } from 'vitest';
import { PLAYER_SILHOUETTE } from '../../src/data/silhouette';
import { DEPTHS } from '../../src/data/assets';
import { bodySamples, hiddenShare, type Point } from '../../src/render/occluders';

// 070: the player shows as a soft silhouette while behind ruin blocks, trees, the bench or machines: enough points over
// their body land on the drawn pixels of a prop sorted in front of them (the Occluders registry reads the pixels).

const FEET = { x: 100, y: 200 };
const B = PLAYER_SILHOUETTE.body;
const samples = bodySamples(FEET.x, FEET.y);

describe('the silhouette (070)', () => {
  it("samples a grid over the player's body box, standing on the feet point", () => {
    expect(samples).toHaveLength(PLAYER_SILHOUETTE.samples.cols * PLAYER_SILHOUETTE.samples.rows);
    for (const p of samples) {
      expect(p.x).toBeGreaterThan(FEET.x - B.w / 2);
      expect(p.x).toBeLessThan(FEET.x + B.w / 2);
      expect(p.y).toBeGreaterThan(FEET.y - B.h);
      expect(p.y).toBeLessThan(FEET.y);
    }
    expect(new Set(samples.map((p) => `${p.x},${p.y}`)).size).toBe(samples.length);
  });

  it('a prop over the whole body hides it; one over a corner does not', () => {
    expect(hiddenShare(samples, () => true)).toBe(1);
    expect(hiddenShare(samples, () => false)).toBe(0);
    // A round canopy's empty corner: only the body's top-right point is under leaves.
    const corner = (p: Point) => p.x > FEET.x + B.w / 4 && p.y < FEET.y - B.h * 0.8;
    expect(hiddenShare(samples, corner)).toBeLessThan(PLAYER_SILHOUETTE.cover);
    // Leaves over the upper half.
    expect(hiddenShare(samples, (p) => p.y < FEET.y - B.h / 2)).toBeGreaterThanOrEqual(PLAYER_SILHOUETTE.cover);
  });

  it('draws over the world and under its UI, as a faint tint with a rim', () => {
    expect(DEPTHS.silhouette).toBeLessThan(DEPTHS.worldUi);
    expect(DEPTHS.silhouette).toBeGreaterThan(10_000);
    expect(PLAYER_SILHOUETTE.alpha).toBeGreaterThan(0);
    expect(PLAYER_SILHOUETTE.alpha).toBeLessThan(1);
    expect(PLAYER_SILHOUETTE.rim.px).toBeGreaterThan(0);
  });
});
