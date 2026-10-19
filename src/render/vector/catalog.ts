import { animFrames, ENEMY_ANIMS, type AnimDef } from '../../data/assets';
import { ENEMY_RIGS } from '../../data/art/enemies';
import type { EnemyPoseName, EnemyRigDef } from '../../data/art/enemyRig';
import { OUTLINE_WIDTH } from '../../data/art/style';
import { VECTOR_SPRITES } from '../../data/art/sprites';
import { INTAKE_SPRITES_VECTOR } from '../../data/art/intake';
import { ITEM_SPRITES_VECTOR } from '../../data/art/items';
import { FIXTURE_SPRITES_VECTOR } from '../../data/art/fixtures';
import { LOGISTICS_SPRITES_VECTOR } from '../../data/art/logistics';
import { MACHINE_SPRITES_VECTOR } from '../../data/art/machines';
import { INTERIOR_SPRITES_VECTOR } from '../../data/art/interior';
import { HUD_SPRITES_VECTOR } from '../../data/art/hud';
import { NODE_SPRITES_VECTOR } from '../../data/art/nodes';
import { TERRAIN_SPRITES } from '../../data/art/terrain';
import { STAGE_SPRITES_VECTOR } from '../../data/art/stages';
import { SPRING_SPRITES_VECTOR } from '../../data/art/spring';
import { LANDMARK_SPRITES_VECTOR } from '../../data/art/landmarks';
import { RESEARCH_SPRITES_VECTOR } from '../../data/art/research';
import { HOLLOWS_SPRITES_VECTOR } from '../../data/art/hollows';
import { BURROWER_SPRITES_VECTOR } from '../../data/art/burrower';
import { GEAR_SPRITES_VECTOR } from '../../data/art/gear';
import { TALENT_SPRITES_VECTOR } from '../../data/art/talents';
import { drawShapes } from './draw';
import { drawEnemy } from './enemyRig';

// Every frame drawn from vector data at boot (016), under its atlas-style frame
// name: the static sprites and every enemy animation frame.

export interface VectorFrame {
  name: string;
  size: readonly [number, number];
  anchor: readonly [number, number];
  /** Draws the frame with its anchor at the canvas origin, world px. */
  draw(c: CanvasRenderingContext2D, pxPerUnit: number): void;
}

/** The pose and view an enemy anim key names: `husk-walk-side` → walk, side; `husk-death` → death, down. */
export function poseOfAnim(rig: EnemyRigDef, anim: AnimDef): { pose: EnemyPoseName; view: 'side' | 'down' | 'up' } {
  const rest = anim.key.slice(rig.id.length + 1);
  const [pose, view] = rest.split('-') as [EnemyPoseName, 'side' | 'down' | 'up' | undefined];
  return { pose, view: view ?? 'down' };
}

function enemyFrames(rig: EnemyRigDef): VectorFrame[] {
  const anims = ENEMY_ANIMS[rig.id];
  if (!anims) throw new Error(`No anims for enemy rig '${rig.id}'`);
  return Object.values(anims).flatMap((anim) => {
    if (!anim) return [];
    const { pose, view } = poseOfAnim(rig, anim);
    const poses = rig.poses[pose];
    if (!poses) throw new Error(`Enemy rig '${rig.id}' has no '${pose}' pose`);
    return animFrames(anim).map((name, i) => ({
      name,
      size: rig.box.size,
      anchor: rig.box.anchor,
      draw: (c: CanvasRenderingContext2D, px: number) => {
        const p = poses[i % poses.length];
        if (p) drawEnemy(c, rig, view, p, px);
      },
    }));
  });
}

export function vectorFrames(): VectorFrame[] {
  const sprites = [...VECTOR_SPRITES, ...TERRAIN_SPRITES, ...NODE_SPRITES_VECTOR, ...INTAKE_SPRITES_VECTOR, ...ITEM_SPRITES_VECTOR, ...LOGISTICS_SPRITES_VECTOR, ...FIXTURE_SPRITES_VECTOR, ...MACHINE_SPRITES_VECTOR, ...INTERIOR_SPRITES_VECTOR, ...HUD_SPRITES_VECTOR, ...STAGE_SPRITES_VECTOR, ...SPRING_SPRITES_VECTOR, ...LANDMARK_SPRITES_VECTOR, ...RESEARCH_SPRITES_VECTOR, ...HOLLOWS_SPRITES_VECTOR, ...BURROWER_SPRITES_VECTOR, ...GEAR_SPRITES_VECTOR, ...TALENT_SPRITES_VECTOR].flatMap((s) =>
    s.frames.map((shapes, i) => ({
      name: s.frames.length === 1 ? s.key : `${s.key}/${i}`,
      size: s.size,
      anchor: s.anchor,
      draw: (c: CanvasRenderingContext2D, px: number) => drawShapes(c, shapes, { outline: OUTLINE_WIDTH, blurScale: px }),
    })),
  );
  return [...sprites, ...ENEMY_RIGS.flatMap(enemyFrames)];
}
