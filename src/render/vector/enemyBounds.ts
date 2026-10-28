import type { EnemyPose, EnemyRigDef } from '../../data/art/enemyRig';
import type { Shape } from '../../data/art/types';
import { apply, chain, type Pt } from './affine';
import { figureMat, partMat, type EnemyView } from './enemyPose';

// 076: how far a posed enemy rig reaches, world px from its feet, measured from its shapes' geometry (ellipses
// sampled round, rects' corners, paths' points and control points, lines widened by their width), for the size
// baseline and the box checks. Glows and outlines aren't counted. Pure.

const ELLIPSE_STEPS = 16;

/** Points that bound a shape, in its own coordinates. */
function shapePoints(s: Shape): Pt[] {
  if (s.kind === 'ellipse') return Array.from({ length: ELLIPSE_STEPS }, (_, i) => [s.x + Math.cos((i / ELLIPSE_STEPS) * Math.PI * 2) * s.rx, s.y + Math.sin((i / ELLIPSE_STEPS) * Math.PI * 2) * s.ry] as const);
  if (s.kind === 'rect') return [[s.x, s.y], [s.x + s.w, s.y], [s.x, s.y + s.h], [s.x + s.w, s.y + s.h]];
  if (s.kind === 'path') return s.d.flatMap((cmd): Pt[] => (cmd[0] === 'Z' ? [] : cmd[0] === 'Q' ? [[cmd[1], cmd[2]], [cmd[3], cmd[4]]] : cmd[0] === 'C' ? [[cmd[1], cmd[2]], [cmd[3], cmd[4]], [cmd[5], cmd[6]]] : [[cmd[1], cmd[2]]]));
  const r = s.width / 2;
  const out: Pt[] = [];
  for (let i = 0; i + 1 < s.pts.length; i += 2) {
    const x = s.pts[i] ?? 0;
    const y = s.pts[i + 1] ?? 0;
    out.push([x - r, y - r], [x + r, y + r]);
  }
  return out;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The posed rig's extent, world px from the feet. */
export function rigBounds(rig: EnemyRigDef, view: EnemyView, pose: EnemyPose): Bounds {
  const b: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const fig = figureMat(rig, pose);
  for (const part of rig.views[view]) {
    const m = partMat(rig, view, pose, part);
    if (!m) continue;
    const at = chain(fig, m);
    for (const s of part.shapes) {
      for (const p of shapePoints(s)) {
        const [x, y] = apply(at, p);
        b.x0 = Math.min(b.x0, x);
        b.y0 = Math.min(b.y0, y);
        b.x1 = Math.max(b.x1, x);
        b.y1 = Math.max(b.y1, y);
      }
    }
  }
  return b;
}

/** The drawn height of a pose, world px. */
export const drawnHeight = (rig: EnemyRigDef, view: EnemyView, pose: EnemyPose): number => {
  const b = rigBounds(rig, view, pose);
  return b.y1 - b.y0;
};
