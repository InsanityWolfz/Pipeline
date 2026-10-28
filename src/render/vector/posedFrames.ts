import { animFrames, ENEMY_ANIMS } from '../../data/assets';
import { ENEMY_RIGS } from '../../data/art/enemies';
import type { EnemyPose, EnemyRigDef } from '../../data/art/enemyRig';
import { poseOfAnim } from './catalog';
import type { EnemyView } from './enemyPose';

// 080: the pose a baked enemy frame was drawn in, by its frame name, so overlays (the boss phase parts) can sit on the
// posed geometry of whatever frame the sprite shows (076's `posedPoint`). Built once, on first use.

export interface PosedFrame {
  rig: EnemyRigDef;
  view: EnemyView;
  pose: EnemyPose;
}

let byName: Map<string, PosedFrame> | null = null;

/** The rig, view and pose a frame name was baked from, or undefined for a frame that isn't an enemy's. */
export function posedFrame(name: string): PosedFrame | undefined {
  if (!byName) {
    byName = new Map();
    for (const rig of ENEMY_RIGS) {
      for (const anim of Object.values(ENEMY_ANIMS[rig.id] ?? {})) {
        if (!anim) continue;
        const { pose, view } = poseOfAnim(rig, anim);
        const poses = rig.poses[pose] ?? [];
        animFrames(anim).forEach((frame, i) => {
          const p = poses[i % Math.max(1, poses.length)];
          if (p) byName?.set(frame, { rig, view, pose: p });
        });
      }
    }
  }
  return byName.get(name);
}
