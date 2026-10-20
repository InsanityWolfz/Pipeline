import { ITEMS } from '../data/items';
import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, OVERWORLD_TEXTURES } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import { MINIMAP } from '../data/hudLayout';
import { OVERWORLD } from '../data/overworld';
import { inHollows } from '../data/hollows';
import { LANDMARK_LIST, type LandmarkMarker } from '../data/landmarks';
import { MAP_ICONS } from '../data/landmarkAssets';
import type { Room } from '../data/rooms';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { inkCss } from './vector/draw';
import { addVector, textureScale } from './vector/textures';

// The minimap (017): the overworld's terrain in the top-right corner, with the
// player, the foundry's stairs, the shrine and claimed pylons marked, and each landmark's
// icon once it's discovered (032). No enemies, no fog.
// Hidden in the foundry, and never takes clicks meant for the world.

export interface MinimapMarker {
  /** A dot (MINIMAP.markers) or a discovered landmark's icon (032: `site`, `grotto`, `spring` or `cache`). */
  kind: keyof typeof MINIMAP.markers | LandmarkMarker;
  /** The landmark an icon marks (032). */
  landmark?: string;
  /** View px. */
  x: number;
  y: number;
}

export class MinimapView {
  private readonly frame: GameObjects.Graphics;
  private readonly map: GameObjects.Image;
  private readonly marks: GameObjects.Graphics;
  /** Each discovered landmark's icon (032), made on its discovery. */
  private readonly icons = new Map<string, GameObjects.Image>();
  private readonly scene: Scene;
  private readonly x: number;
  private readonly y: number;
  /** What it shows now, for the test hook. */
  shown = false;
  markers: MinimapMarker[] = [];

  constructor(scene: Scene, room: Room) {
    this.scene = scene;
    const w = room.rows[0]?.length ?? 0;
    const h = room.rows.length;
    // Each tile is a crisp square of `k` texels, drawn at the screen's scale (020: no nearest filtering).
    const k = Math.max(1, Math.ceil(MINIMAP.scale * textureScale()));
    const tex = scene.textures.exists(OVERWORLD_TEXTURES.minimap) ? null : scene.textures.createCanvas(OVERWORLD_TEXTURES.minimap, w * k, h * k);
    if (tex) {
      for (const [ty, row] of room.rows.entries()) {
        for (const [tx, symbol] of [...row].entries()) {
          tex.context.fillStyle = inkCss((inHollows(tx, ty) ? MINIMAP.hollowsTerrain[symbol] : undefined) ?? MINIMAP.terrain[symbol] ?? 'grass-bright');
          tex.context.fillRect(tx * k, ty * k, k, k);
        }
      }
      tex.refresh();
    }
    const width = w * MINIMAP.scale;
    const height = h * MINIMAP.scale;
    this.x = VIEW_WIDTH - MINIMAP.margin - width;
    this.y = MINIMAP.margin;
    const f = MINIMAP.frame;
    this.frame = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    drawTablet(this.frame, this.x - f.width, this.y - f.width, width + f.width * 2, height + f.width * 2);
    this.map = scene.add.image(this.x, this.y, OVERWORLD_TEXTURES.minimap).setOrigin(0).setScale(MINIMAP.scale / k).setScrollFactor(0).setDepth(DEPTHS.hud + 1);
    this.marks = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud + 2);
  }

  update(sim: SimState): void {
    this.shown = sim.roomId === OVERWORLD.id;
    for (const o of [this.frame, this.map, this.marks]) o.setVisible(this.shown);
    for (const icon of this.icons.values()) icon.setVisible(this.shown);
    if (!this.shown) {
      this.markers = [];
      return;
    }
    const at = (px: number, py: number) => ({ x: this.x + (px / TILE_SIZE) * MINIMAP.scale, y: this.y + (py / TILE_SIZE) * MINIMAP.scale });
    const tile = (t: { tx: number; ty: number }) => at((t.tx + 0.5) * TILE_SIZE, (t.ty + 0.5) * TILE_SIZE);
    const claimed = sim.claims.includes(OVERWORLD.shrine.site);
    // A landmark shows only once discovered (032): its icon, or the cyan claimed dot on its pylon once claimed.
    const landmarks: MinimapMarker[] = LANDMARK_LIST.filter((l) => sim.discovered.includes(l.id)).map((l) =>
      l.pylon && sim.claims.includes(l.pylon.site)
        ? { kind: 'claimed', landmark: l.id, ...tile(l.pylon) }
        : { kind: l.marker, landmark: l.id, ...at(((l.area.x0 + l.area.x1 + 1) / 2) * TILE_SIZE, ((l.area.y0 + l.area.y1 + 1) / 2) * TILE_SIZE) },
    );
    this.markers = [
      { kind: 'entrance', ...tile(OVERWORLD.entrance.door) },
      { kind: claimed ? 'claimed' : 'shrine', ...tile(OVERWORLD.shrine.pylon) },
      ...landmarks,
      // 033: a ping over each schematic lying on the ground out here.
      ...sim.groundItems.filter((g) => g.roomId === OVERWORLD.id && ITEMS[g.itemId]?.kind === 'schematic').map((g): MinimapMarker => ({ kind: 'schematic', ...at(g.x, g.y) })),
      { kind: 'player', ...at(sim.player.x, sim.player.y) },
    ];
    this.drawIcons(landmarks);
    this.marks.clear();
    for (const m of this.markers) {
      if (!(m.kind in MINIMAP.markers)) continue;
      const style = MINIMAP.markers[m.kind as keyof typeof MINIMAP.markers];
      this.marks.fillStyle(colorOf('ink'), 1).fillCircle(m.x, m.y, style.r + 1);
      this.marks.fillStyle(colorOf(style.color), 1).fillCircle(m.x, m.y, style.r);
      if (m.kind !== 'schematic') continue;
      const P = MINIMAP.ping;
      const t = (this.scene.time.now % P.ms) / P.ms;
      this.marks.lineStyle(P.width, colorOf(P.color), 1 - t).strokeCircle(m.x, m.y, style.r + P.reach * t);
    }
  }

  /** Landmark icons: one image per discovered, unclaimed landmark, under the dots. */
  private drawIcons(landmarks: readonly MinimapMarker[]): void {
    const shownIds = new Set<string>();
    for (const m of landmarks) {
      if (!m.landmark || m.kind === 'claimed' || !(m.kind in MAP_ICONS)) continue;
      shownIds.add(m.landmark);
      let icon = this.icons.get(m.landmark);
      if (!icon) {
        icon = addVector(this.scene, m.x, m.y, MAP_ICONS[m.kind as LandmarkMarker]).setScrollFactor(0).setDepth(DEPTHS.hud + 1.5);
        icon.setScale(icon.scaleX * MINIMAP.landmarkScale);
        this.icons.set(m.landmark, icon);
      }
      icon.setPosition(m.x, m.y).setVisible(true);
    }
    for (const [id, icon] of this.icons) if (!shownIds.has(id)) icon.setVisible(false);
  }
}
