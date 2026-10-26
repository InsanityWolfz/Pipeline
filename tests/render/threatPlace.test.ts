import { describe, expect, it } from 'vitest';
import { THREAT_ARROW } from '../../src/data/threats';
import { edgeArrow, placeThreats } from '../../src/render/threatPlace';

// 071: an off-screen threat's arrow sits at the screen's edge on the line from the player to the enemy, clear of the
// HUD boxes; arrows closer than a set gap merge into one.

const VIEW = { x0: 0, y0: 0, x1: 640, y1: 360 };
const PLAYER = { x: 320, y: 180 };
const IN = THREAT_ARROW.edgeInset;
const GAP = THREAT_ARROW.mergeGap;
/** Twice as far east of the player as the inset right edge: a tip moves half as far as its enemy across the line. */
const FAR = PLAYER.x + 2 * (640 - IN - PLAYER.x);

describe('placing a threat arrow (071)', () => {
  it('sits on the right edge, inset, for an enemy east of the player, pointing east', () => {
    const a = edgeArrow(VIEW, PLAYER, { x: 1000, y: 180 });
    expect(a.x).toBeCloseTo(640 - IN);
    expect(a.y).toBeCloseTo(180);
    expect(a.angle).toBeCloseTo(0);
  });

  it('runs its line from the player, not the view centre', () => {
    const player = { x: 100, y: 300 };
    const enemy = { x: 100, y: -500 };
    const a = edgeArrow(VIEW, player, enemy);
    expect(a.x).toBeCloseTo(100);
    expect(a.y).toBeCloseTo(IN);
    expect(a.angle).toBeCloseTo(-Math.PI / 2);
    // A diagonal: the tip is on the player-to-enemy line, on the edge it meets first.
    const d = edgeArrow(VIEW, player, { x: 900, y: -500 });
    expect((d.y - player.y) / (d.x - player.x)).toBeCloseTo((-500 - player.y) / (900 - player.x));
    expect(d.y).toBeCloseTo(IN);
  });

  it('stops short of a HUD box on its line, still on the line', () => {
    const minimap = { x0: 500, y0: 0, x1: 640, y1: 120 };
    const enemy = { x: 1200, y: -400 };
    const free = edgeArrow(VIEW, PLAYER, enemy);
    const a = edgeArrow(VIEW, PLAYER, enemy, [minimap]);
    expect(Math.hypot(a.x - PLAYER.x, a.y - PLAYER.y)).toBeLessThan(Math.hypot(free.x - PLAYER.x, free.y - PLAYER.y));
    expect(a.x <= minimap.x0 - IN + 1e-6 || a.y >= minimap.y1 + IN - 1e-6).toBe(true);
    expect(a.angle).toBeCloseTo(free.angle);
  });

  it('keeps a player outside the inset view (a lagging camera) on the edge', () => {
    const a = edgeArrow(VIEW, { x: 700, y: 180 }, { x: 1200, y: 180 });
    expect(a.x).toBeCloseTo(640 - IN);
  });
});

describe('merging threat arrows (071)', () => {
  it('keeps arrows farther apart than the gap apart, one per threat', () => {
    const arrows = placeThreats(VIEW, PLAYER, [
      { id: 1, x: 1000, y: 180, alpha: 1 },
      { id: 2, x: 320, y: -800, alpha: 1 },
    ]);
    expect(arrows.map((a) => a.ids)).toEqual([[1], [2]]);
  });

  it('merges two arrows closer than the gap into one between them, at the stronger alpha', () => {
    const arrows = placeThreats(VIEW, PLAYER, [
      { id: 1, x: 1000, y: 180, alpha: 0.4 },
      { id: 2, x: 1000, y: 180 + GAP / 2, alpha: 1 },
    ]);
    expect(arrows).toHaveLength(1);
    const [m] = arrows;
    expect(m?.ids).toEqual([1, 2]);
    expect(m?.alpha).toBe(1);
    expect(m?.x).toBeCloseTo(640 - IN);
    const [a, b] = [edgeArrow(VIEW, PLAYER, { x: 1000, y: 180 }), edgeArrow(VIEW, PLAYER, { x: 1000, y: 180 + GAP / 2 })];
    expect(m?.y).toBeGreaterThan(a.y);
    expect(m?.y).toBeLessThan(b.y);
  });

  it('chains: three in a row, each within the gap of the next, are one arrow', () => {
    const arrows = placeThreats(VIEW, PLAYER, [
      { id: 1, x: FAR, y: 180, alpha: 1 },
      { id: 3, x: FAR, y: 180 + 3.2 * GAP, alpha: 1 },
      { id: 2, x: FAR, y: 180 + 1.6 * GAP, alpha: 1 },
    ]);
    // Their tips are 0.8 gaps apart in turn, so the first and last (1.6 apart) join through the middle one.
    expect(arrows.map((a) => a.ids)).toEqual([[1, 2, 3]]);
  });
});
