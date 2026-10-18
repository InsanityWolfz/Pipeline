import type { Scene } from 'phaser';
import { animFrames, ATLAS_KEY, type AnimDef } from '../data/assets';

/** Registers an animation once per game; `frameRate` overrides the def's (for computed rates). */
export function registerAnim(scene: Scene, anim: AnimDef, frameRate?: number): void {
  if (scene.anims.exists(anim.key)) return;
  scene.anims.create({
    key: anim.key,
    frames: animFrames(anim).map((frame) => ({ key: ATLAS_KEY, frame })),
    frameRate: frameRate ?? (typeof anim.frameRate === 'number' ? anim.frameRate : 1),
    repeat: anim.loop ? -1 : 0,
  });
}
