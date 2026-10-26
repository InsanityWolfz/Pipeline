import { describe, expect, it } from 'vitest';
import { PLAYER_SILHOUETTE } from '../../src/data/silhouette';
import { DEPTHS } from '../../src/data/assets';
import { bodyBox, coverShare, hiddenBehind, type PropBox } from '../../src/render/occluders';

// 070: the player shows as a soft silhouette while behind ruin blocks, trees, the bench or machines: a prop in front of
// them (sorted deeper) covering enough of their body.

const FEET = { x: 100, y: 200 };
const body = bodyBox(FEET.x, FEET.y);
const B = PLAYER_SILHOUETTE.body;

/** A prop box from its left, top, right and bottom; its depth is its bottom, as every standing sprite's is. */
const prop = (x0: number, y0: number, x1: number, y1: number, depth = y1): PropBox => ({ x0, y0, x1, y1, depth });

describe('the silhouette (070)', () => {
  it("the player's body box stands on the feet point", () => {
    expect(body).toEqual({ x0: FEET.x - B.w / 2, y0: FEET.y - B.h, x1: FEET.x + B.w / 2, y1: FEET.y, depth: FEET.y });
  });

  it('measures how much of the body a box covers', () => {
    expect(coverShare(body, prop(0, 0, 400, 400))).toBe(1);
    expect(coverShare(body, prop(FEET.x, 0, 400, 400))).toBeCloseTo(0.5);
    expect(coverShare(body, prop(0, 0, 50, 50))).toBe(0);
  });

  it('a tree in front covering the body hides the player', () => {
    expect(hiddenBehind(body, [prop(FEET.x - 30, FEET.y - 70, FEET.x + 30, FEET.y + 12)], PLAYER_SILHOUETTE.cover)).toBe(true);
  });

  it('a prop behind the player (sorted shallower) never hides them, however much it overlaps', () => {
    expect(hiddenBehind(body, [prop(FEET.x - 30, FEET.y - 70, FEET.x + 30, FEET.y - 2)], PLAYER_SILHOUETTE.cover)).toBe(false);
  });

  it('a prop in front covering only a sliver of the body does not', () => {
    const sliver = prop(FEET.x + B.w / 2 - 2, FEET.y - B.h, FEET.x + 40, FEET.y + 10);
    expect(coverShare(body, sliver)).toBeLessThan(PLAYER_SILHOUETTE.cover);
    expect(hiddenBehind(body, [sliver], PLAYER_SILHOUETTE.cover)).toBe(false);
  });

  it('draws over the world and under its UI, as a faint tint with a rim', () => {
    expect(DEPTHS.silhouette).toBeGreaterThan(DEPTHS.supplyLine - 10_000);
    expect(DEPTHS.silhouette).toBeLessThan(DEPTHS.worldUi);
    expect(PLAYER_SILHOUETTE.alpha).toBeGreaterThan(0);
    expect(PLAYER_SILHOUETTE.alpha).toBeLessThan(1);
    expect(PLAYER_SILHOUETTE.rim.px).toBeGreaterThan(0);
  });
});
