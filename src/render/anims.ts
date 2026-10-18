import type { Scene } from 'phaser';
import { animFrames, type AnimDef } from '../data/assets';
import { textureOf } from './vector/textures';

/** Registers an animation once per game, from the atlas or the vector texture (016). */
export function registerAnim(scene: Scene, anim: AnimDef): void {
  if (scene.anims.exists(anim.key)) return;
  scene.anims.create({
    key: anim.key,
    frames: animFrames(anim).map((frame) => ({ key: textureOf(frame), frame })),
    frameRate: anim.frameRate,
    repeat: anim.loop ? -1 : 0,
  });
}
