import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { FOUNDRY_MAP } from '../data/foundryMap';
import { itemDef } from '../data/items';
import { FOUNDRY_MAP_ICONS } from '../data/landmarkAssets';
import { FOUNDRY_ROOM, TILE } from '../data/rooms';
import { roomById, type SimState } from '../sim/state';
import { colorOf } from './color';
import { foundryMapBox, foundryMapItems, type FoundryMapItems } from './foundryMap';
import { drawTablet } from './tablet';
import { addVector, showFrame } from './vector/textures';
import type { ScreenBox } from './bottomHud';

/** The foundry map as drawn (051), for `ui().foundryMap`: whether it shows, and its lines, dots and icons (view px). */
export type FoundryMapShown = { shown: boolean } & Omit<FoundryMapItems, 'box'>;

export const NO_FOUNDRY_MAP: FoundryMapShown = { shown: false, lines: [], dots: [], icons: [] };

// The foundry's minimap (051, B.6): in the overworld minimap's place while the player is in the foundry, so the
// objective line under it isn't left floating. The room's floor and walls in a tablet frame; conduits as lines,
// pieces as dots, and icons for the intake, the bench, the stash, the door, the open entrances and the ports.
export class FoundryMapView {
  private readonly scene: Scene;
  private readonly ground: GameObjects.Graphics;
  private readonly marks: GameObjects.Graphics;
  private readonly icons: GameObjects.Image[] = [];
  shown: FoundryMapShown = NO_FOUNDRY_MAP;

  constructor(scene: Scene) {
    this.scene = scene;
    const box = foundryMapBox();
    const s = FOUNDRY_MAP.scale;
    const f = FOUNDRY_MAP.frame.width;
    this.ground = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    drawTablet(this.ground, box.x - f, box.y - f, box.w + 2 * f, box.h + 2 * f);
    for (const [ty, row] of roomById(FOUNDRY_ROOM).rows.entries()) {
      for (const [tx, symbol] of [...row].entries()) {
        const color = symbol === TILE.door ? FOUNDRY_MAP.door : symbol === TILE.floor ? FOUNDRY_MAP.floor : FOUNDRY_MAP.wall;
        this.ground.fillStyle(colorOf(color), 1).fillRect(box.x + tx * s, box.y + ty * s, s, s);
      }
    }
    this.marks = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud + 1);
  }

  /** The map's frame while it shows (the waypoint arrow never hides under it), view px. */
  get box(): ScreenBox | null {
    if (!this.shown.shown) return null;
    const b = foundryMapBox();
    const f = FOUNDRY_MAP.frame.width;
    return { x: b.x - f, y: b.y - f, w: b.w + 2 * f, h: b.h + 2 * f };
  }

  update(sim: SimState, roomShown: string): void {
    const on = roomShown === FOUNDRY_ROOM && sim.roomId === FOUNDRY_ROOM && !sim.sandbox;
    this.ground.setVisible(on);
    this.marks.setVisible(on);
    if (!on) {
      for (const i of this.icons) i.setVisible(false);
      this.shown = NO_FOUNDRY_MAP;
      return;
    }
    const { lines, dots, icons } = foundryMapItems(sim);
    this.shown = { shown: true, lines, dots, icons };
    const g = this.marks.clear();
    g.lineStyle(FOUNDRY_MAP.line.width, colorOf(FOUNDRY_MAP.line.color), 1);
    for (const l of lines) g.lineBetween(l.x1, l.y1, l.x2, l.y2);
    for (const d of dots) {
      const style = FOUNDRY_MAP.dots[d.kind];
      g.fillStyle(colorOf('ink'), 1).fillCircle(d.x, d.y, style.r + FOUNDRY_MAP.rim);
      g.fillStyle(colorOf(style.color), 1).fillCircle(d.x, d.y, style.r);
    }
    let n = 0;
    for (const i of icons) {
      if (i.kind === 'entrance' || i.kind === 'player') {
        const style = i.kind === 'entrance' ? FOUNDRY_MAP.entrance : FOUNDRY_MAP.player;
        g.fillStyle(colorOf('ink'), 1).fillCircle(i.x, i.y, style.r + FOUNDRY_MAP.rim);
        g.fillStyle(colorOf(style.color), 1).fillCircle(i.x, i.y, style.r);
        continue;
      }
      const frame = i.kind === 'port' ? itemDef(i.itemId ?? '').icon : FOUNDRY_MAP_ICONS[i.kind];
      const scale = i.kind === 'port' ? FOUNDRY_MAP.portScale : FOUNDRY_MAP.iconScale;
      const img = this.icons[n] ?? addVector(this.scene, 0, 0, frame).setScrollFactor(0).setDepth(DEPTHS.hud + 2);
      this.icons[n] = img;
      n += 1;
      showFrame(img, frame);
      img.setScale(img.scaleX * scale).setPosition(i.x, i.y).setVisible(true);
    }
    for (const i of this.icons.slice(n)) i.setVisible(false);
  }
}
