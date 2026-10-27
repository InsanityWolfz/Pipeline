import type { EnemyPart, EnemyPose, EnemyRigDef } from '../../data/art/enemyRig';
import { apply, chain, IDENTITY, rotateAbout, scale, scaleAbout, translate, type Mat, type Pt } from './affine';

// Where a posed enemy rig's parts sit (016, as matrices since 076): the figure's scale, squash, sink, squash-in-y and
// tilt about the feet; the legs' stride, lift and turn; the body's bob, shift and lean about the hip; the arms' and
// head's turns about their pivots; a charge light's growth. Pure: drawEnemy draws with these, and the tests and the
// size baseline measure posed points and bounds with the same numbers.

export type EnemyView = 'side' | 'down' | 'up';

/** Front and back views lean only a little, so a lunge doesn't tip them sideways. */
export const FACE_ON_LEAN = 0.3;

/** The whole figure: style px to world px, then the squash about the feet, the sink, the squash in y and the tilt. */
export function figureMat(rig: EnemyRigDef, pose: EnemyPose): Mat {
  const q = pose.squash ?? 0;
  return chain(scale(rig.scale, rig.scale), scale(1 + q, 1 - q), translate(0, pose.sink ?? 0), scale(1, pose.scaleY ?? 1), rotateAbout(pose.tilt ?? 0, [0, 0]));
}

const turn = (part: EnemyPart, a: number): Mat => rotateAbout(part.mirror ? -a : a, part.pivot);

/** A part's matrix within the figure (style px), before its own shapes. Null for a charge light that isn't showing. */
export function partMat(rig: EnemyRigDef, view: EnemyView, pose: EnemyPose, part: EnemyPart): Mat | null {
  const step = pose.step ?? 0;
  const lift = pose.lift ?? 0;
  if (part.role === 'ground') return IDENTITY;
  if (part.role === 'leg-back') return chain(translate(-step, step < 0 ? -lift : 0), turn(part, pose.legBack ?? 0));
  if (part.role === 'leg-front') return chain(translate(step, step > 0 ? -lift : 0), turn(part, pose.legFront ?? 0));
  const lean = (pose.lean ?? 0) * (view === 'side' ? 1 : FACE_ON_LEAN);
  const shift = view === 'side' ? (pose.shift ?? 0) : 0;
  const body = chain(translate(shift, pose.bob ?? 0), rotateAbout(lean, rig.hip));
  if (part.role === 'arm-back') return chain(body, turn(part, pose.armBack ?? 0));
  if (part.role === 'arm-front') return chain(body, turn(part, pose.armFront ?? 0));
  if (part.role === 'head') return chain(body, translate(0, pose.headLift ?? 0), turn(part, (pose.head ?? 0) * (view === 'side' ? 1 : FACE_ON_LEAN)));
  if (part.role === 'charge') {
    const k = pose.charge ?? 0;
    return k > 0 ? chain(body, scaleAbout(k, k, part.pivot)) : null;
  }
  return body;
}

/** Where a point on a part (style px, in the part's own coordinates) lands for a pose, world px from the feet. */
export function posedPoint(rig: EnemyRigDef, view: EnemyView, pose: EnemyPose, partId: string, at: Pt): [number, number] | null {
  const part = rig.views[view].find((p) => p.id === partId);
  const m = part && partMat(rig, view, pose, part);
  return m ? apply(chain(figureMat(rig, pose), m), at) : null;
}
