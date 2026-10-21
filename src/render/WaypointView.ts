import { Cameras, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { ITEM_ICON_SIZE } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { WAYPOINT } from '../data/targets';
import { objectiveTargets, waypoint, type GoalPoint, type Waypoint } from '../sim/objectiveTarget';
import type { SimState } from '../sim/state';
import { Pulse } from './pulse';
import { drawTablet } from './tablet';
import { arrowTip, placeArrow, viewAt, type ViewRect } from './waypointPlace';
import { addVector, showFrame } from './vector/textures';
import type { ScreenBox } from './bottomHud';

/** The waypoint arrow as drawn (051), for `ui().waypoint`: where its tip is (world px), how it points, and what it leads to. */
export interface WaypointShown {
  mode: 'over' | 'edge';
  x: number;
  y: number;
  angle: number;
  via: 'door' | 'target';
  kind: string;
  /** 051 (B.2): the refill goal's hoppers marked, each by its arrow's tip (world px), with the raw its icon shows. */
  icons: { itemId: string; x: number; y: number }[];
}

interface Marked {
  arrow: GameObjects.Image;
  plate: GameObjects.Graphics;
  icon: GameObjects.Image;
}

// The waypoint arrow (051, B.1, B.2): always on for the current goal's target. While the target is off screen it sits
// at the screen's edge pointing at it (through the foundry's door, or to its stairs, when the target is on the other
// side); on screen it hovers over it, bobbing as 027's marker did. A goal whose targets carry a raw (the refill
// goal's hoppers) marks each one in the room with an arrow and the raw's icon in a small plate over it.
export class WaypointView {
  private readonly scene: Scene;
  private readonly bob: Pulse;
  private readonly glow: Pulse;
  private readonly arrow: GameObjects.Image;
  private readonly marks: Marked[] = [];
  shown: WaypointShown | null = null;
  /** The hovering arrow's tip while it leads to a target in this room (027's `ui().marker`), else null. */
  markerAt: { x: number; y: number } | null = null;

  /** This frame's goal, its in-room targets that carry a raw, and the HUD boxes (view px): placed against the view. */
  private goal: { wp: Waypoint | null; raws: GoalPoint[]; hud: readonly ScreenBox[] } = { wp: null, raws: [], hud: [] };

  constructor(scene: Scene) {
    this.scene = scene;
    const L = TUTORIAL_LAYOUT.marker;
    this.bob = new Pulse(scene, 0, L.bob, L.bobMs);
    this.glow = new Pulse(scene, WAYPOINT.pulse.min, WAYPOINT.pulse.max, WAYPOINT.pulse.ms);
    this.arrow = addVector(scene, 0, 0, TUTORIAL_SPRITES.marker).setDepth(DEPTHS.prompt).setVisible(false);
    // 057.6: the camera follows the player as the frame renders, after the scene's update. The arrow is placed again
    // against the view the frame shows, once the follow has moved it, so it never lags the camera by a frame (which
    // made it jump on screen by each frame's step while the player walked).
    const camera = scene.cameras.main;
    camera.on(Cameras.Scene2D.Events.FOLLOW_UPDATE, () => this.place(camera.worldView));
  }

  /** `hud`: the fixed HUD boxes on screen (view px), which the arrow keeps clear of. */
  update(sim: SimState, shown: string, hud: readonly ScreenBox[] = []): void {
    const wp = shown === sim.roomId ? waypoint(sim) : null;
    // Each in-room target that carries a raw gets its own arrow and icon (on screen only; the edge arrow leads to the rest).
    const raws = wp?.via === 'target' ? objectiveTargets(sim).filter((p) => p.roomId === sim.roomId && p.itemId) : [];
    this.goal = { wp, raws, hud };
    this.markerAt = wp?.via === 'target' ? arrowTip(wp.target) : null;
    // 057.6: placed now against the view the camera's scroll gives, deliberately: while the camera isn't following
    // (the attune's look centres it by hand, stopFollow) no follow update comes. When it follows, the follow update
    // places it again once the view has moved this frame.
    const c = this.scene.cameras.main;
    const sx = c.useBounds ? c.clampX(c.scrollX) : c.scrollX;
    const sy = c.useBounds ? c.clampY(c.scrollY) : c.scrollY;
    this.place(viewAt(sx, sy, c.width, c.height, c.zoom));
  }

  /** The arrow and the hoppers' marks against the camera's view (world px). */
  private place(view: { x: number; y: number; width: number; height: number }): void {
    const { wp, raws, hud } = this.goal;
    const rect: ViewRect = { x0: view.x, y0: view.y, x1: view.x + view.width, y1: view.y + view.height };
    // A view px is a world px (both cameras share the screen's zoom), so a HUD box sits at the view's corner plus its own.
    const z = view.width / VIEW_WIDTH;
    const boxes: ViewRect[] = hud.map((b) => ({ x0: view.x + b.x * z, y0: view.y + b.y * z, x1: view.x + (b.x + b.w) * z, y1: view.y + (b.y + b.h) * z }));
    const marked = raws.flatMap((p) => {
      const tip = arrowTip(p);
      return p.itemId && placeArrow(rect, tip, boxes).mode === 'over' ? [{ itemId: p.itemId, ...tip, base: p.y }] : [];
    });
    this.drawIcons(marked);
    const icons = marked.map(({ itemId, x, y }) => ({ itemId, x, y }));
    if (!wp) {
      this.arrow.setVisible(false);
      this.shown = null;
      return;
    }
    const tip = arrowTip({ ...wp.target, x: wp.x, y: wp.y }, wp.via);
    const place = placeArrow(rect, tip, boxes);
    // On screen with its own icon arrow already over it, the main arrow isn't drawn twice.
    const covered = place.mode === 'over' && icons.some((i) => i.x === tip.x && i.y === tip.y);
    this.arrow.setVisible(!covered);
    const k = showFrame(this.arrow, TUTORIAL_SPRITES.marker).scaleX;
    if (place.mode === 'over') this.arrow.setPosition(place.x, Math.round(place.y - this.bob.value)).setRotation(0).setAlpha(1);
    else this.arrow.setPosition(place.x, place.y).setRotation(place.angle - Math.PI / 2).setAlpha(this.glow.value).setScale(k * WAYPOINT.edgeScale);
    this.shown = { ...place, via: wp.via, kind: wp.target.kind, icons };
  }

  /** An arrow at each tip and the raw's icon in a plate in front of the thing's base; spare ones hidden. */
  private drawIcons(icons: readonly { itemId: string; x: number; y: number; base: number }[]): void {
    const P = WAYPOINT.plate;
    const size = ITEM_ICON_SIZE + 2 * P.pad;
    while (this.marks.length < icons.length) {
      const icon = itemDef(icons[this.marks.length]?.itemId ?? 'wood').icon;
      this.marks.push({
        arrow: addVector(this.scene, 0, 0, TUTORIAL_SPRITES.marker).setDepth(DEPTHS.prompt),
        plate: this.scene.add.graphics().setDepth(DEPTHS.prompt),
        icon: addVector(this.scene, 0, 0, icon).setDepth(DEPTHS.prompt + 1),
      });
    }
    this.marks.forEach((m, i) => {
      const at = icons[i];
      for (const o of [m.arrow, m.plate, m.icon]) o.setVisible(at !== undefined);
      if (!at) return;
      const y = Math.round(at.y - this.bob.value);
      m.arrow.setPosition(at.x, y);
      const top = Math.round(at.base + P.gap);
      m.plate.clear();
      drawTablet(m.plate, Math.round(at.x - size / 2), top, size, size, P.alpha);
      showFrame(m.icon, itemDef(at.itemId).icon).setPosition(at.x, top + size / 2);
    });
  }
}
