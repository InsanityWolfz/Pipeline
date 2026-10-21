import { describe, expect, it } from 'vitest';
import { TARGET_LIFT, WAYPOINT } from '../../src/data/targets';
import { arrowTip, placeArrow, tipLift } from '../../src/render/waypointPlace';

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

  it("lifts the tip by the target's kind, a node's by its type, a door's by the door's", () => {
    expect(tipLift({ kind: 'pylon' })).toBe(TARGET_LIFT.pylon);
    expect(tipLift({ kind: 'nodes', ref: 'tree' })).toBe(TARGET_LIFT.nodeTypes.tree);
    expect(tipLift({ kind: 'bench' }, 'door')).toBe(TARGET_LIFT.door);
    expect(arrowTip({ x: 10, y: 100, kind: 'hoppers' })).toEqual({ x: 10, y: 100 - TARGET_LIFT.hoppers });
  });
});
