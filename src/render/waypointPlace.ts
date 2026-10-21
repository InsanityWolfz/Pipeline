import { TARGET_LIFT, WAYPOINT } from '../data/targets';
import type { GoalPoint, Waypoint } from '../sim/objectiveTarget';

// Where the waypoint arrow goes (051, B.1). Pure, so tests can check it: the tip's lift over a target's ground point,
// and, from the camera's view, whether the arrow hovers over the target or sits at the screen's edge pointing at it.

type Point = { x: number; y: number };

/** A world rect, px. */
export interface ViewRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** How far over its ground point the arrow's tip sits (src/data/targets.ts). */
export function tipLift(target: Pick<GoalPoint, 'kind' | 'ref'>, via: Waypoint['via'] = 'target'): number {
  if (via === 'door') return TARGET_LIFT.door;
  if ((target.kind === 'nodes' || target.kind === 'collect') && target.ref) return TARGET_LIFT.nodeTypes[target.ref] ?? TARGET_LIFT[target.kind];
  return TARGET_LIFT[target.kind];
}

/** The arrow's tip over a point (world px). */
export const arrowTip = (p: Point & Pick<GoalPoint, 'kind' | 'ref'>, via: Waypoint['via'] = 'target'): Point => ({ x: p.x, y: p.y - tipLift(p, via) });

/** The arrow as placed: hovering over the tip (`over`, pointing down), or at the view's edge pointing at it (`edge`). */
export interface ArrowPlace {
  mode: 'over' | 'edge';
  /** The arrow's tip, world px. */
  x: number;
  y: number;
  /** The way it points, radians (0 east, π/2 south: straight down over a target). */
  angle: number;
}

/**
 * Over the target while the whole arrow (tip to tail) is inside the view by `onScreenMargin`; else on the view's edge,
 * `edgeInset` in, where the line from the view's centre to the tip crosses it, pointing along that line.
 */
export function placeArrow(view: ViewRect, tip: Point): ArrowPlace {
  const m = WAYPOINT.onScreenMargin;
  const inside = tip.x >= view.x0 + m && tip.x <= view.x1 - m && tip.y - WAYPOINT.arrowLength >= view.y0 + m && tip.y <= view.y1 - m;
  if (inside) return { mode: 'over', x: tip.x, y: tip.y, angle: Math.PI / 2 };
  const cx = (view.x0 + view.x1) / 2;
  const cy = (view.y0 + view.y1) / 2;
  const dx = tip.x - cx;
  const dy = tip.y - cy;
  const angle = Math.atan2(dy, dx);
  const halfW = (view.x1 - view.x0) / 2 - WAYPOINT.edgeInset;
  const halfH = (view.y1 - view.y0) / 2 - WAYPOINT.edgeInset;
  // The smaller of the two scales that bring the line to a vertical or a horizontal edge.
  const s = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  return { mode: 'edge', x: cx + dx * s, y: cy + dy * s, angle };
}
