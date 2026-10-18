import type { Scene } from 'phaser';
import { animFrames, VECTOR_KEY, type AnimDef } from '../data/assets';

/** Registers an animation once per game, from the vector texture (016). */
export function registerAnim(scene: Scene, anim: AnimDef): void {
  if (scene.anims.exists(anim.key)) return;
  scene.anims.create({
    key: anim.key,
    frames: animFrames(anim).map((frame) => ({ key: VECTOR_KEY, frame })),
    frameRate: anim.frameRate,
    repeat: anim.loop ? -1 : 0,
  });
}
