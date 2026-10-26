import { Cameras, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { THREAT_ARROW } from '../data/threats';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import { offscreenThreats } from '../sim/threats';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { Pulse } from './pulse';
import { placeThreats, type PlacedThreat, type ThreatMark } from './threatPlace';
import { boxesInView, type ViewRect } from './waypointPlace';
import { scrollView } from './WaypointView';

/** The threat arrows as drawn (071), for `ui().threats`: each arrow's enemies, tip (world px), angle and alpha as drawn. */
export type ThreatShown = PlacedThreat;

// Off-screen threat markers (071): a pulsing red arrow at the screen's edge toward each enemy the sim says is off screen
// and winding up on the player (src/sim/threats.ts), arrows close together merged. Once its wind-up lands or is
// cancelled (it leaves the sim's list), an arrow fades out where it last stood. Placed against the view the frame
// shows, as 051's waypoint arrow is (057.6), so it never lags the camera.
export class ThreatView {
  private readonly scene: Scene;
  private readonly g: GameObjects.Graphics;
  private readonly pulse: Pulse;
  /** Each threat showing, by enemy id: its enemy's last feet and its fade (1 while live, to 0 over `fadeMs` once gone). */
  private readonly marks = new Map<number, ThreatMark>();
  /** This frame's player and HUD boxes (view px), for the follow update's placing. */
  private frame: { from: { x: number; y: number }; hud: readonly ScreenBox[] } = { from: { x: 0, y: 0 }, hud: [] };
  shown: ThreatShown[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTHS.prompt);
    this.pulse = new Pulse(scene, THREAT_ARROW.pulse.min, THREAT_ARROW.pulse.max, THREAT_ARROW.pulse.ms);
    const camera = scene.cameras.main;
    camera.on(Cameras.Scene2D.Events.FOLLOW_UPDATE, () => this.place(camera.worldView));
  }

  /**
   * `enemies`: the room on screen's (the scene filters them once a frame); `hud`: the boxes the arrows keep clear of
   * (view px); `on`: the Off-screen warnings setting; `deltaMs`: the frame's time, for the fade.
   */
  update(sim: SimState, enemies: readonly EnemyState[], shown: string, hud: readonly ScreenBox[], on: boolean, deltaMs: number): void {
    if (!on) this.marks.clear();
    const live = on && shown === sim.roomId ? offscreenThreats(sim, enemies) : [];
    const now = new Set<number>();
    for (const t of live) {
      now.add(t.id);
      this.marks.set(t.id, { id: t.id, x: t.x, y: t.y, alpha: 1 });
    }
    for (const [id, m] of this.marks) {
      if (now.has(id)) continue;
      m.alpha -= deltaMs / THREAT_ARROW.fadeMs;
      if (m.alpha <= 0) this.marks.delete(id);
    }
    this.frame = { from: { x: sim.player.x, y: sim.player.y }, hud };
    this.place(scrollView(this.scene.cameras.main));
  }

  /** The arrows against the camera's view (world px). */
  private place(view: { x: number; y: number; width: number; height: number }): void {
    const g = this.g;
    g.clear();
    if (this.marks.size === 0) {
      this.shown = [];
      return;
    }
    const rect: ViewRect = { x0: view.x, y0: view.y, x1: view.x + view.width, y1: view.y + view.height };
    const placed = placeThreats(rect, this.frame.from, [...this.marks.values()], boxesInView(view, this.frame.hud));
    const A = THREAT_ARROW;
    this.shown = placed.map((p) => ({ ...p, alpha: p.alpha * this.pulse.value }));
    for (const p of this.shown) {
      const ux = Math.cos(p.angle);
      const uy = Math.sin(p.angle);
      const bx = p.x - ux * A.length;
      const by = p.y - uy * A.length;
      const px = -uy * (A.width / 2);
      const py = ux * (A.width / 2);
      g.fillStyle(colorOf(A.color), p.alpha).fillTriangle(p.x, p.y, bx + px, by + py, bx - px, by - py);
      g.lineStyle(A.outline, colorOf(A.outlineColor), p.alpha).strokeTriangle(p.x, p.y, bx + px, by + py, bx - px, by - py);
    }
  }
}
