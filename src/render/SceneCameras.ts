import type { Cameras, GameObjects, Scene } from 'phaser';
import { CAMERA_LERP, DOOR_FADE_MS } from '../data/config';
import { INTAKE } from '../data/foundry';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimState } from '../sim/state';
import { attuneBeat } from './attune';
import { intakeAnchor } from './foundryLayout';
import { UI_CAMERA, type ScreenFit } from './scale';

// The scene's two cameras (016): the main one follows the world, zoomed by the
// screen fit; the UI one draws everything with scroll factor 0 (the HUD, menus,
// mood) unshaken, in view px. Each frame routes every object to one of them.
export class SceneCameras {
  private readonly scene: Scene;
  private readonly ui: Cameras.Scene2D.Camera;
  /** Whether the attune has the camera off the player (019). */
  private looking = false;

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

  /**
   * The attune's look (019): while it plays in the foundry on screen, the camera
   * leaves the player for the intake pipe and comes back, then follows `followed` again.
   */
  attuneLook(sim: SimState, shown: string, followed: GameObjects.GameObject & { x: number; y: number }): void {
    const main = this.scene.cameras.main;
    const look = shown === FOUNDRY_ROOM ? attuneBeat(sim.link.attunePulse).look : 0;
    // The point the camera follows (the sprite's origin, at the feet), so leaving and rejoining the follow doesn't jump.
    const player = { x: followed.x, y: followed.y };
    const pipe = intakeAnchor();
    const at = { x: pipe.x, y: pipe.y - INTAKE.lookRise };
    if (look > 0) {
      if (!this.looking) main.stopFollow();
      this.looking = true;
      // Between the two views as the camera can show them inside the room's bounds, so the pan runs straight.
      const from = this.clampedCentre(player);
      const to = this.clampedCentre(at);
      main.centerOn(from.x + (to.x - from.x) * look, from.y + (to.y - from.y) * look);
    } else if (this.looking) {
      this.looking = false;
      main.centerOn(player.x, player.y);
      main.startFollow(followed, true, CAMERA_LERP, CAMERA_LERP);
    }
  }

  /** Where the main camera's centre lands when asked to centre on `p`, kept inside its bounds. */
  private clampedCentre(p: { x: number; y: number }): { x: number; y: number } {
    const main = this.scene.cameras.main;
    const b = main.getBounds();
    const w = main.width / main.zoom / 2;
    const h = main.height / main.zoom / 2;
    const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    return { x: clamp(p.x, b.x + w, b.right - w), y: clamp(p.y, b.y + h, b.bottom - h) };
  }

  private route(): void {
    const main = this.scene.cameras.main;
    for (const o of this.scene.children.list) {
      const screen = 'scrollFactorX' in o && o.scrollFactorX === 0;
      o.cameraFilter = screen ? main.id : this.ui.id;
    }
  }
}
