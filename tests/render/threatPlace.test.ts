import { describe, expect, it } from 'vitest';
import { THREAT_ARROW } from '../../src/data/threats';
import { ARROW_CLEAR, arrowPoints, edgeArrow, placeThreats } from '../../src/render/threatPlace';

// 071: an off-screen threat's arrow sits at the screen's edge on the line from the player to the enemy, clear of the
// HUD boxes; arrows closer than a set gap merge into one.

const VIEW = { x0: 0, y0: 0, x1: 640, y1: 360 };
const PLAYER = { x: 320, y: 180 };
/** The tip's clearance: the inset plus half the arrow's width, so no corner pokes out. */
const IN = ARROW_CLEAR;
const GAP = THREAT_ARROW.mergeGap;
/** Twice as far east of the player as the inset right edge: a tip moves half as far as its enemy across the line. */
const FAR = PLAYER.x + 2 * (640 - IN - PLAYER.x);

describe('placing a threat arrow (071)', () => {
  it('keeps its tip the inset plus half its width in', () => {
    expect(ARROW_CLEAR).toBe(THREAT_ARROW.edgeInset + THREAT_ARROW.width / 2);
  });

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

  it('never pokes a corner off screen or under a HUD box, whichever way it points', () => {
    const minimap = { x0: 500, y0: 0, x1: 640, y1: 120 };
    const bar = { x0: 200, y0: 300, x1: 440, y1: 360 };
    for (let deg = 0; deg < 360; deg += 3) {
      const a = (deg * Math.PI) / 180;
      const arrow = edgeArrow(VIEW, PLAYER, { x: PLAYER.x + 2000 * Math.cos(a), y: PLAYER.y + 2000 * Math.sin(a) }, [minimap, bar]);
      for (const p of arrowPoints(arrow)) {
        expect(p.x >= VIEW.x0 && p.x <= VIEW.x1 && p.y >= VIEW.y0 && p.y <= VIEW.y1, `${deg}° on screen`).toBe(true);
        for (const b of [minimap, bar]) expect(p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1, `${deg}° clear of a box`).toBe(false);
      }
    }
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

  it('leaves no two arrows closer than the gap after merging, round the whole view, with and without a HUD box', () => {
    const minimap = { x0: 500, y0: 0, x1: 640, y1: 120 };
    const at = (deg: number) => ({ x: PLAYER.x + 2000 * Math.cos((deg * Math.PI) / 180), y: PLAYER.y + 2000 * Math.sin((deg * Math.PI) / 180) });
    for (let a = 0; a < 360; a += 7)
      for (const spread of [1, 2.5, 4, 6])
        for (const hud of [[], [minimap]]) {
          const marks = [0, 1, 2, 3].map((k) => ({ id: k + 1, ...at(a + k * spread), alpha: 1 }));
          const arrows = placeThreats(VIEW, PLAYER, marks, hud);
          expect(arrows.flatMap((x) => x.ids).sort()).toEqual([1, 2, 3, 4]);
          for (let i = 0; i < arrows.length; i++)
            for (let j = i + 1; j < arrows.length; j++) {
              const p = arrows[i];
              const q = arrows[j];
              if (p && q) expect(Math.hypot(p.x - q.x, p.y - q.y), `${a}° by ${spread}`).toBeGreaterThanOrEqual(GAP);
            }
        }
  });
});
