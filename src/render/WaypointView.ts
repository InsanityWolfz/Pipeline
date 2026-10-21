import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { ITEM_ICON_SIZE } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { WAYPOINT } from '../data/targets';
import { objectiveTargets, waypoint } from '../sim/objectiveTarget';
import type { SimState } from '../sim/state';
import { Pulse } from './pulse';
import { drawTablet } from './tablet';
import { arrowTip, placeArrow, type ViewRect } from './waypointPlace';
import { addVector, showFrame } from './vector/textures';

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

  constructor(scene: Scene) {
    this.scene = scene;
    const L = TUTORIAL_LAYOUT.marker;
    this.bob = new Pulse(scene, 0, L.bob, L.bobMs);
    this.glow = new Pulse(scene, WAYPOINT.pulse.min, WAYPOINT.pulse.max, WAYPOINT.pulse.ms);
    this.arrow = addVector(scene, 0, 0, TUTORIAL_SPRITES.marker).setDepth(DEPTHS.prompt).setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    const wp = shown === sim.roomId ? waypoint(sim) : null;
    const view = this.scene.cameras.main.worldView;
    const rect: ViewRect = { x0: view.x, y0: view.y, x1: view.x + view.width, y1: view.y + view.height };
    // Each in-room target that carries a raw gets its own arrow and icon (on screen only; the edge arrow leads to the rest).
    const raws = wp?.via === 'target' ? objectiveTargets(sim).filter((p) => p.roomId === sim.roomId && p.itemId) : [];
    const marked = raws.flatMap((p) => {
      const tip = arrowTip(p);
      return p.itemId && placeArrow(rect, tip).mode === 'over' ? [{ itemId: p.itemId, ...tip, base: p.y }] : [];
    });
    this.drawIcons(marked);
    const icons = marked.map(({ itemId, x, y }) => ({ itemId, x, y }));
    this.markerAt = wp?.via === 'target' ? arrowTip(wp.target) : null;
    if (!wp) {
      this.arrow.setVisible(false);
      this.shown = null;
      return;
    }
    const tip = arrowTip({ ...wp.target, x: wp.x, y: wp.y }, wp.via);
    const place = placeArrow(rect, tip);
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
