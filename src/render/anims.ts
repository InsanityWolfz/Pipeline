import type { Scene } from 'phaser';
import { animFrames, type AnimDef } from '../data/assets';
import { textureOf } from './vector/textures';

/** Registers an animation once per game; `frameRate` overrides the def's (for computed rates). */
export function registerAnim(scene: Scene, anim: AnimDef, frameRate?: number): void {
  if (scene.anims.exists(anim.key)) return;
  scene.anims.create({
    key: anim.key,
    frames: animFrames(anim).map((frame) => ({ key: textureOf(frame), frame })),
    frameRate: frameRate ?? anim.frameRate,
    repeat: anim.loop ? -1 : 0,
  });
}
