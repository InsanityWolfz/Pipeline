import type { EnemyPart, EnemyPose, EnemyRigDef } from '../../data/art/enemyRig';
import { OUTLINE_WIDTH } from '../../data/art/style';
import { drawShapes, type DrawOpts } from './draw';

// Poses and draws an enemy rig (016) with its feet at the canvas origin, world px.
// Baked into animation frames at boot; the contact sheet draws it too.

/** Eyes and charge lights rest at this strength when a pose doesn't say. */
const REST_GLOW = 0.8;

/** Front and back views lean only a little, so a lunge doesn't tip them sideways. */
const FACE_ON_LEAN = 0.3;

function around(c: CanvasRenderingContext2D, [x, y]: readonly [number, number], fn: () => void): void {
  c.translate(x, y);
  fn();
  c.translate(-x, -y);
}

function drawPart(c: CanvasRenderingContext2D, part: EnemyPart, pose: EnemyPose, o: DrawOpts): void {
  c.save();
  if (part.role === 'arm-back' || part.role === 'arm-front') {
    const turn = (part.role === 'arm-back' ? pose.armBack : pose.armFront) ?? 0;
    around(c, part.pivot, () => c.rotate(part.mirror ? -turn : turn));
  } else if (part.role === 'glow') {
    c.globalAlpha *= pose.glow ?? REST_GLOW;
  } else if (part.role === 'charge') {
    const k = pose.charge ?? 0;
    if (k <= 0) {
      c.restore();
      return;
    }
    around(c, part.pivot, () => c.scale(k, k));
  }
  drawShapes(c, part.shapes, o);
  c.restore();
}

export function drawEnemy(c: CanvasRenderingContext2D, rig: EnemyRigDef, view: 'side' | 'down' | 'up', pose: EnemyPose, pxPerUnit: number): void {
  const S = rig.scale;
  const o: DrawOpts = { outline: OUTLINE_WIDTH / S, blurScale: pxPerUnit * S };
  const step = pose.step ?? 0;
  const lift = pose.lift ?? 0;
  const lean = (pose.lean ?? 0) * (view === 'side' ? 1 : FACE_ON_LEAN);
  c.save();
  c.globalAlpha *= pose.alpha ?? 1;
  c.scale(S, S);
  c.translate(0, pose.sink ?? 0);
  c.scale(1, pose.scaleY ?? 1);
  c.rotate(pose.tilt ?? 0);
  for (const part of rig.views[view]) {
    c.save();
    if (part.role === 'leg-back') c.translate(-step, step < 0 ? -lift : 0);
    else if (part.role === 'leg-front') c.translate(step, step > 0 ? -lift : 0);
    else if (part.role !== 'ground') {
      c.translate(0, pose.bob ?? 0);
      around(c, rig.hip, () => c.rotate(lean));
    }
    drawPart(c, part, pose, o);
    c.restore();
  }
  c.restore();
}
