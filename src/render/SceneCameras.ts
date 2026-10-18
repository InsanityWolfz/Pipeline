import type { Cameras, Scene } from 'phaser';
import { DOOR_FADE_MS } from '../data/config';
import { UI_CAMERA, type ScreenFit } from './scale';

// The scene's two cameras (016): the main one follows the world, zoomed by the
// screen fit; the UI one draws everything with scroll factor 0 (the HUD, menus,
// mood) unshaken, in view px. Each frame routes every object to one of them.
export class SceneCameras {
  private readonly scene: Scene;
  private readonly ui: Cameras.Scene2D.Camera;

  constructor(scene: Scene, fit: ScreenFit) {
    this.scene = scene;
    this.ui = scene.cameras.add(0, 0, fit.width, fit.height, false, UI_CAMERA).setOrigin(0, 0);
    this.applyFit(fit);
    scene.events.on('prerender', () => this.route());
  }

  /** Matches both cameras to the backbuffer. Called on boot and whenever the window changes. */
  applyFit(fit: ScreenFit): void {
    this.scene.cameras.main.setSize(fit.width, fit.height).setZoom(fit.scale);
    this.ui.setSize(fit.width, fit.height).setZoom(fit.scale);
  }

  /** Fades both cameras out (the HUD fades with the world), calls `atDark`, then fades back in. */
  fadeThrough(atDark: () => void): void {
    const main = this.scene.cameras.main;
    this.ui.fadeOut(DOOR_FADE_MS, 0, 0, 0);
    main.fadeOut(DOOR_FADE_MS, 0, 0, 0, (_cam: unknown, progress: number) => {
      if (progress < 1) return;
      atDark();
      main.fadeIn(DOOR_FADE_MS, 0, 0, 0);
      this.ui.fadeIn(DOOR_FADE_MS, 0, 0, 0);
    });
  }

  private route(): void {
    const main = this.scene.cameras.main;
    for (const o of this.scene.children.list) {
      const screen = 'scrollFactorX' in o && o.scrollFactorX === 0;
      o.cameraFilter = screen ? main.id : this.ui.id;
    }
  }
}
