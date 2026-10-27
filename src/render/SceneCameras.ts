import type { Cameras, GameObjects, Scene } from 'phaser';
import { BOSS_LOOK } from '../data/arenaAssets';
import { CAMERA_LERP, DOOR_FADE_MS } from '../data/config';
import { INTAKE } from '../data/foundry';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimState } from '../sim/state';
import { attuneBeat } from './attune';
import { intakeAnchor } from './foundryLayout';
import { UI_CAMERA, type ScreenFit } from './scale';
import { centredBounds, stepZoom, zoomAt, type Bounds } from './zoom';

// The scene's two cameras (016): the main one follows the world, zoomed by the
// screen fit; the UI one draws everything with scroll factor 0 (the HUD, menus,
// mood) unshaken, in view px. Each frame routes every object to one of them.
export class SceneCameras {
  private readonly scene: Scene;
  private readonly ui: Cameras.Scene2D.Camera;
  /** Whether the attune has the camera off the player (019). */
  private looking = false;
  /** What waits for the running fade's dark point, in the order asked. */
  private atDark: (() => void)[] = [];
  /** How far up the camera sits off the player now, view px (fix-playtest-ui: eased toward a fighting boss's bossLookShift). */
  private lift = 0;
  private fit: ScreenFit;
  /** 069: build mode's zoom step (BUILD_ZOOMS), and the shown room's own camera bounds. */
  private zoomStep = 0;
  private room: Bounds | null = null;

  constructor(scene: Scene, fit: ScreenFit) {
    this.scene = scene;
    this.fit = fit;
    this.ui = scene.cameras.add(0, 0, fit.width, fit.height, false, UI_CAMERA).setOrigin(0, 0);
    this.applyFit(fit);
    scene.events.on('prerender', () => this.route());
  }

  /** Matches both cameras to the backbuffer. Called on boot and whenever the window changes. */
  applyFit(fit: ScreenFit): void {
    this.fit = fit;
    this.scene.cameras.main.setSize(fit.width, fit.height);
    this.ui.setSize(fit.width, fit.height).setZoom(fit.scale);
    this.applyZoom();
  }

  /** 069: a room was just shown (its bounds set): keeps them, so the zoomed-out view can centre a narrower room. */
  roomShown(): void {
    const b = this.scene.cameras.main.getBounds();
    this.room = { x: b.x, y: b.y, w: b.width, h: b.height };
    this.applyZoom();
  }

  /** 069: the wheel in build mode steps the world's zoom (down out, up in). */
  zoomBy(steps: number): void {
    this.zoomStep = stepZoom(this.zoomStep, steps);
    this.applyZoom();
  }

  /** 069: out of build mode the world is at 1× again. */
  resetZoom(): void {
    if (this.zoomStep === 0) return;
    this.zoomStep = 0;
    this.applyZoom();
  }

  /** The main camera at the fit's scale times the zoom; the room's bounds widened to centre it in a wider view. */
  private applyZoom(): void {
    const main = this.scene.cameras.main;
    main.setZoom(this.fit.scale * zoomAt(this.zoomStep));
    if (!this.room) return;
    const b = centredBounds(this.room, main.width / main.zoom);
    main.setBounds(b.x, b.y, b.w, b.h);
  }

  /**
   * Fades both cameras out (the HUD fades with the world), calls `atDark`, then fades back in: a door's fade by default,
   * or a KO's (`ms` and colour). A fade asked for while one is still darkening joins it, its `atDark` run at the same
   * dark point (fix-build-inventory-respawn: Phaser's fadeOut restarts a running fade and drops its callback, so walking
   * out of the foundry during a KO's fade lost the KO's re-follow and the camera stayed by the door).
   */
  fadeThrough(atDark: () => void, ms = DOOR_FADE_MS, rgb: readonly [number, number, number] = [0, 0, 0]): void {
    const main = this.scene.cameras.main;
    this.atDark.push(atDark);
    if (this.atDark.length > 1 && main.fadeEffect.isRunning && main.fadeEffect.direction) return;
    const [r, g, b] = rgb;
    this.ui.fadeOut(ms, r, g, b);
    main.fadeOut(ms, r, g, b, (_cam: unknown, progress: number) => {
      if (progress < 1) return;
      const due = this.atDark;
      this.atDark = [];
      for (const run of due) run();
      main.fadeIn(ms, r, g, b);
      this.ui.fadeIn(ms, r, g, b);
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

  /**
   * fix-playtest-ui: eases the camera's follow `target` px up off the player (a fighting boss's bossLookTarget, 0 with
   * none), so the boss bar doesn't cover the boss. Set every frame: a restarted follow (a KO, the attune) resets it.
   */
  bossLook(target: number, deltaMs: number): void {
    this.lift += (target - this.lift) * (1 - Math.exp(-Math.max(0, deltaMs) / BOSS_LOOK.easeMs));
    if (Math.abs(target - this.lift) < 0.5) this.lift = target;
    this.scene.cameras.main.setFollowOffset(0, Math.round(this.lift));
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
