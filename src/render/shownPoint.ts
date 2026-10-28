import type { EnemyPose, EnemyPoseName, EnemyRigDef } from '../data/art/enemyRig';
import { posedPoint } from './vector/enemyPose';

// 076 (review 5): where a part of an enemy shows now, for what leaves it (the kiln-tender's beam, the Sniper's laser):
// the pose of the frame the sprite holds, read from the baked frame's name (`kiln-tender-swipe-side/1`), the squash
// render puts on the sprite about its feet, and the peak's tremble. Pure.

type View = 'side' | 'down' | 'up';

/** What render does to the sprite on top of its frame: its squash about the feet and the tremble, world px. */
export interface SpriteLook {
  squash: number;
  dx: number;
  dy: number;
}

/** The rig pose a baked frame holds: `<prefix>-<pose>-<view>` (one frame) or `…/<index>`; undefined if it isn't one. */
export function poseOfFrame(rig: EnemyRigDef, frame: string): EnemyPose | undefined {
  const m = /-([a-z]+)-(?:down|up|side)(?:\/(\d+))?$/.exec(frame);
  if (!m?.[1]) return undefined;
  return rig.poses[m[1] as EnemyPoseName]?.[Number(m[2] ?? 0)];
}

/**
 * A part's point as the sprite shows it, world px from the enemy's feet: posed by the frame it holds, squashed about
 * the feet, flipped facing left (`flip` -1), scaled `k` (a champion's 1.5), then moved by the tremble (world px). The
 * resting `at` for a frame the rig has no pose for.
 */
export function shownPoint(rig: EnemyRigDef, view: View, frame: string, part: string, at: readonly [number, number], look: SpriteLook, flip = 1, k = 1): [number, number] {
  const pose = poseOfFrame(rig, frame);
  const p = (pose && posedPoint(rig, view, pose, part, at)) ?? [at[0], at[1]];
  return [p[0] * (1 + look.squash) * k * flip + look.dx, p[1] * (1 - look.squash) * k + look.dy];
}
