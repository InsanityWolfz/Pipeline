import { Cameras, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { THREAT_ARROW } from '../data/threats';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import { offscreenThreats } from '../sim/threats';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { Pulse } from './pulse';
import { arrowPoints, placeThreats, type PlacedThreat, type ThreatMark } from './threatPlace';
import { boxesInView, type ViewRect } from './waypointPlace';
import { scrollView } from './WaypointView';

/** A camera view as a world rect. */
const rectOf = (v: { x: number; y: number; width: number; height: number }): ViewRect => ({ x0: v.x, y0: v.y, x1: v.x + v.width, y1: v.y + v.height });

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
  /** This frame's player, for the follow update's placing. */
  private from = { x: 0, y: 0 };
  shown: ThreatShown[] = [];
  /** The HUD boxes (view px) this frame's arrows keep clear of (also for `ui().threatClear`). */
  hud: readonly ScreenBox[] = [];

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
    // The sim decides against the view the camera really shows (its easing, a boss fight's lift), not its settled one.
    const view = scrollView(this.scene.cameras.main);
    const rect = rectOf(view);
    const live = on && shown === sim.roomId ? offscreenThreats(sim, enemies, rect) : [];
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
    this.from = { x: sim.player.x, y: sim.player.y };
    this.hud = hud;
    this.place(view);
  }

  /** The arrows against the camera's view (world px). */
  private place(view: { x: number; y: number; width: number; height: number }): void {
    const g = this.g;
    g.clear();
    if (this.marks.size === 0) {
      this.shown = [];
      return;
    }
    const placed = placeThreats(rectOf(view), this.from, [...this.marks.values()], boxesInView(view, this.hud));
    const A = THREAT_ARROW;
    this.shown = placed.map((p) => ({ ...p, alpha: p.alpha * this.pulse.value }));
    for (const p of this.shown) {
      const [t, l, r] = arrowPoints(p);
      g.fillStyle(colorOf(A.color), p.alpha).fillTriangle(t.x, t.y, l.x, l.y, r.x, r.y);
      g.lineStyle(A.outline, colorOf(A.outlineColor), p.alpha).strokeTriangle(t.x, t.y, l.x, l.y, r.x, r.y);
    }
  }
}
