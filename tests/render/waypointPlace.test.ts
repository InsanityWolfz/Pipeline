import { describe, expect, it } from 'vitest';
import { TARGET_LIFT, WAYPOINT } from '../../src/data/targets';
import { arrowTip, clearOfPrompts, placeArrow, tipLift, viewAt } from '../../src/render/waypointPlace';

// 051 (B.1): the waypoint arrow hovers over an on-screen target and sits at the screen's edge, pointing at it, while
// the target is off screen.

const VIEW = { x0: 0, y0: 0, x1: 640, y1: 360 };

describe('placing the waypoint arrow (051)', () => {
  it('hovers over a target on screen, pointing down', () => {
    expect(placeArrow(VIEW, { x: 300, y: 200 })).toEqual({ mode: 'over', x: 300, y: 200, angle: Math.PI / 2 });
  });

  it('sits on the right edge for a target east of the view, pointing east', () => {
    const p = placeArrow(VIEW, { x: 2000, y: 180 });
    expect(p).toMatchObject({ mode: 'edge', x: 640 - WAYPOINT.edgeInset, y: 180 });
    expect(p.angle).toBeCloseTo(0);
  });

  it('sits on the top edge for a target straight north, pointing up; on a corner line for a diagonal', () => {
    const up = placeArrow(VIEW, { x: 320, y: -900 });
    expect(up).toMatchObject({ mode: 'edge', x: 320, y: WAYPOINT.edgeInset });
    expect(up.angle).toBeCloseTo(-Math.PI / 2);
    const sw = placeArrow(VIEW, { x: -10_000, y: 10_000 });
    expect(sw.mode).toBe('edge');
    expect(sw.y).toBeCloseTo(360 - WAYPOINT.edgeInset);
    expect(sw.x).toBeGreaterThanOrEqual(WAYPOINT.edgeInset - 1e-9);
  });

  it('a target whose arrow would poke out of the top counts as off screen', () => {
    expect(placeArrow(VIEW, { x: 300, y: WAYPOINT.arrowLength }).mode).toBe('edge');
  });

  it('counts a HUD box as part of the edge: the arrow stops short of the minimap, still on the line to the target', () => {
    const minimap = { x0: 440, y0: 0, x1: 640, y1: 100 };
    const target = { x: 2000, y: -600 };
    const free = placeArrow(VIEW, target);
    const p = placeArrow(VIEW, target, [minimap]);
    expect(p.mode).toBe('edge');
    expect(p.angle).toBeCloseTo(free.angle);
    // Outside the minimap by the edge inset on at least one side.
    const clear = p.x <= minimap.x0 - WAYPOINT.edgeInset + 1e-6 || p.y >= minimap.y1 + WAYPOINT.edgeInset - 1e-6;
    expect(clear).toBe(true);
    // Still on the line from the view's centre to the target.
    const cross = (p.x - 320) * (target.y - 180) - (p.y - 180) * (target.x - 320);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
    // A box the line never meets changes nothing.
    expect(placeArrow(VIEW, { x: -2000, y: 180 }, [minimap])).toEqual(placeArrow(VIEW, { x: -2000, y: 180 }));
  });

  it('a target under a HUD box gets the edge arrow, stopping at the box', () => {
    const bar = { x0: 260, y0: 320, x1: 380, y1: 360 };
    const p = placeArrow(VIEW, { x: 320, y: 345 }, [bar]);
    expect(p.mode).toBe('edge');
    expect(p.y).toBeCloseTo(bar.y0 - WAYPOINT.edgeInset);
    expect(p.angle).toBeCloseTo(Math.PI / 2);
  });

  it("lifts the tip by the target's kind, a node's by its type, a door's by the door's", () => {
    expect(tipLift({ kind: 'pylon' })).toBe(TARGET_LIFT.pylon);
    expect(tipLift({ kind: 'nodes', ref: 'tree' })).toBe(TARGET_LIFT.nodeTypes.tree);
    expect(tipLift({ kind: 'bench' }, 'door')).toBe(TARGET_LIFT.door);
    expect(arrowTip({ x: 10, y: 100, kind: 'hoppers' })).toEqual({ x: 10, y: 100 - TARGET_LIFT.hoppers });
  });
});

describe('the view the arrow is placed against (057.6)', () => {
  it("is the camera's rect at its scroll, as Phaser renders it, at any zoom", () => {
    expect(viewAt(100, 50, 640, 360, 1)).toEqual({ x: 100, y: 50, width: 640, height: 360 });
    // A 2× screen: the scroll is in screen px from the centre, the view half the size about the same midpoint.
    expect(viewAt(100, 50, 1280, 720, 2)).toEqual({ x: 420, y: 230, width: 640, height: 360 });
  });
});

describe('clear of the key prompts (058)', () => {
  const cap = { x0: 90, y0: 40, x1: 110, y1: 56 };

  it('raises an arrow whose body would overlap a cap to sit just above it', () => {
    expect(clearOfPrompts({ x: 100, y: 60 }, [cap])).toEqual({ x: 100, y: 40 - WAYPOINT.promptClear });
    expect(clearOfPrompts({ x: 100, y: 50 }, [cap])).toEqual({ x: 100, y: 40 - WAYPOINT.promptClear });
  });

  it('leaves an arrow already above it, beside it, or with no prompt alone', () => {
    expect(clearOfPrompts({ x: 100, y: 30 }, [cap])).toEqual({ x: 100, y: 30 });
    expect(clearOfPrompts({ x: 140, y: 50 }, [cap])).toEqual({ x: 140, y: 50 });
    expect(clearOfPrompts({ x: 100, y: 50 }, [])).toEqual({ x: 100, y: 50 });
    // Below the cap by more than its length: the arrow's tail never reaches it.
    expect(clearOfPrompts({ x: 100, y: 56 + WAYPOINT.arrowLength + 1 }, [cap])).toEqual({ x: 100, y: 56 + WAYPOINT.arrowLength + 1 });
  });
});
