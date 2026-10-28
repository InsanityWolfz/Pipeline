import type { EnemyPart, EnemyPose, EnemyRigDef } from '../../data/art/enemyRig';
import { OUTLINE_WIDTH } from '../../data/art/style';
import { useMat } from './affine';
import { drawShapes, type DrawOpts } from './draw';
import { figureMat, partMat, type EnemyView } from './enemyPose';

// Poses and draws an enemy rig (016) with its feet at the canvas origin, world px.
// Baked into animation frames at boot; the contact sheet draws it too. Where each part goes is enemyPose.ts's.

/** Eyes and charge lights rest at this strength when a pose doesn't say. */
const REST_GLOW = 0.8;

function drawPart(c: CanvasRenderingContext2D, rig: EnemyRigDef, view: EnemyView, part: EnemyPart, pose: EnemyPose, o: DrawOpts): void {
  const m = partMat(rig, view, pose, part);
  if (!m) return;
  c.save();
  useMat(c, m);
  if (part.role === 'glow') c.globalAlpha *= pose.glow ?? REST_GLOW;
  drawShapes(c, part.shapes, o);
  c.restore();
}

export function drawEnemy(c: CanvasRenderingContext2D, rig: EnemyRigDef, view: EnemyView, pose: EnemyPose, pxPerUnit: number): void {
  const S = rig.scale;
  const o: DrawOpts = { outline: OUTLINE_WIDTH / S, blurScale: pxPerUnit * S };
  c.save();
  c.globalAlpha *= pose.alpha ?? 1;
  useMat(c, figureMat(rig, pose));
  for (const part of rig.views[view]) drawPart(c, rig, view, part, pose, o);
  c.restore();
}
