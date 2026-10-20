import type { Scene } from 'phaser';

/**
 * A value swinging smoothly from `min` to `max` and back once every `periodMs`, for gentle tutorial cues (027: the
 * build-bar pulse, the intake marker's bob). It runs on a looping tween, so the test hook's `tweenSpeed(0)` holds it.
 */
export class Pulse {
  value: number;

  constructor(scene: Scene, min: number, max: number, periodMs: number) {
    this.value = min;
    scene.tweens.addCounter({
      from: min,
      to: max,
      duration: periodMs / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        this.value = tween.getValue() ?? min;
      },
    });
  }
}
