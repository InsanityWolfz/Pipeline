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

/**
 * The world rect a camera shows at a scroll (057.6), as Phaser's camera works it out when it renders: its midpoint the
 * scroll plus half its size (screen px), its view that size over its zoom.
 */
export function viewAt(scrollX: number, scrollY: number, width: number, height: number, zoom: number): { x: number; y: number; width: number; height: number } {
  const w = width / zoom;
  const h = height / zoom;
  return { x: scrollX + width / 2 - w / 2, y: scrollY + height / 2 - h / 2, width: w, height: h };
}

/** The arrow as placed: hovering over the tip (`over`, pointing down), or at the view's edge pointing at it (`edge`). */
export interface ArrowPlace {
  mode: 'over' | 'edge';
  /** The arrow's tip, world px. */
  x: number;
  y: number;
  /** The way it points, radians (0 east, π/2 south: straight down over a target). */
  angle: number;
}

/** Where the ray from `c` along `d` first enters `box` (as a multiple of `d`), or Infinity if it never does. */
function entry(c: Point, d: Point, box: ViewRect): number {
  let lo = -Infinity;
  let hi = Infinity;
  for (const [o, v, b0, b1] of [[c.x, d.x, box.x0, box.x1], [c.y, d.y, box.y0, box.y1]] as const) {
    if (v === 0) {
      if (o < b0 || o > b1) return Infinity;
      continue;
    }
    const t0 = (b0 - o) / v;
    const t1 = (b1 - o) / v;
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
  }
  return lo <= hi && lo > 0 ? lo : Infinity;
}

const grow = (b: ViewRect, by: number): ViewRect => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by });

/**
 * Over the target while the whole arrow (tip to tail) is inside the view by `onScreenMargin` and clear of every fixed
 * HUD box in `hud` (world rects: the minimap, the objective, the bottom bars); else on the view's edge, `edgeInset` in,
 * where the line from the view's centre to the tip crosses it, pointing along that line. A HUD box counts as part of the
 * edge: where the line meets one first, the arrow stops `edgeInset` short of it, so it never hides under it.
 */
export function placeArrow(view: ViewRect, tip: Point, hud: readonly ViewRect[] = []): ArrowPlace {
  const m = WAYPOINT.onScreenMargin;
  const arrow: ViewRect = { x0: tip.x, y0: tip.y - WAYPOINT.arrowLength, x1: tip.x, y1: tip.y };
  const hidden = hud.map((b) => grow(b, m)).some((g) => arrow.x0 <= g.x1 && arrow.x1 >= g.x0 && arrow.y0 <= g.y1 && arrow.y1 >= g.y0);
  const inside = tip.x >= view.x0 + m && tip.x <= view.x1 - m && tip.y - WAYPOINT.arrowLength >= view.y0 + m && tip.y <= view.y1 - m;
  if (inside && !hidden) return { mode: 'over', x: tip.x, y: tip.y, angle: Math.PI / 2 };
  const cx = (view.x0 + view.x1) / 2;
  const cy = (view.y0 + view.y1) / 2;
  const dx = tip.x - cx;
  const dy = tip.y - cy;
  const angle = Math.atan2(dy, dx);
  const halfW = (view.x1 - view.x0) / 2 - WAYPOINT.edgeInset;
  const halfH = (view.y1 - view.y0) / 2 - WAYPOINT.edgeInset;
  // The smaller of the two scales that bring the line to a vertical or a horizontal edge, or sooner to a HUD box.
  const edge = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  const s = Math.min(edge, ...hud.map((b) => entry({ x: cx, y: cy }, { x: dx, y: dy }, grow(b, WAYPOINT.edgeInset))));
  return { mode: 'edge', x: cx + dx * s, y: cy + dy * s, angle };
}

/**
 * 058: the hovering arrow's tip raised clear of the key prompts on screen (world rects of their caps): an arrow whose
 * body would overlap a cap sits `promptClear` px above it instead, so it never hides the key.
 */
export function clearOfPrompts(tip: Point, prompts: readonly ViewRect[]): Point {
  const half = WAYPOINT.arrowWidth / 2;
  let y = tip.y;
  for (const b of [...prompts].sort((p, q) => q.y0 - p.y0)) {
    const across = tip.x + half > b.x0 && tip.x - half < b.x1;
    if (across && y > b.y0 - WAYPOINT.promptClear && y - WAYPOINT.arrowLength < b.y1) y = b.y0 - WAYPOINT.promptClear;
  }
  return { x: tip.x, y };
}
