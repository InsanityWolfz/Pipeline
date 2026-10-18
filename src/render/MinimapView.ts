import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, OVERWORLD_TEXTURES } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import { MINIMAP } from '../data/hudLayout';
import { OVERWORLD } from '../data/overworld';
import type { Room } from '../data/rooms';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { inkCss } from './vector/draw';
import { textureScale } from './vector/textures';

// The minimap (017): the overworld's terrain in the top-right corner, with the
// player, the foundry's stairs, the shrine and claimed pylons marked. No enemies.
// Hidden in the foundry, and never takes clicks meant for the world.

export interface MinimapMarker {
  kind: keyof typeof MINIMAP.markers;
  /** View px. */
  x: number;
  y: number;
}

export class MinimapView {
  private readonly frame: GameObjects.Graphics;
  private readonly map: GameObjects.Image;
  private readonly marks: GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;
  /** What it shows now, for the test hook. */
  shown = false;
  markers: MinimapMarker[] = [];

  constructor(scene: Scene, room: Room) {
    const w = room.rows[0]?.length ?? 0;
    const h = room.rows.length;
    // Each tile is a crisp square of `k` texels, drawn at the screen's scale (020: no nearest filtering).
    const k = Math.max(1, Math.ceil(MINIMAP.scale * textureScale()));
    const tex = scene.textures.exists(OVERWORLD_TEXTURES.minimap) ? null : scene.textures.createCanvas(OVERWORLD_TEXTURES.minimap, w * k, h * k);
    if (tex) {
      for (const [ty, row] of room.rows.entries()) {
        for (const [tx, symbol] of [...row].entries()) {
          tex.context.fillStyle = inkCss(MINIMAP.terrain[symbol] ?? 'grass-bright');
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
    if (!this.shown) {
      this.markers = [];
      return;
    }
    const at = (px: number, py: number) => ({ x: this.x + (px / TILE_SIZE) * MINIMAP.scale, y: this.y + (py / TILE_SIZE) * MINIMAP.scale });
    const tile = (t: { tx: number; ty: number }) => at((t.tx + 0.5) * TILE_SIZE, (t.ty + 0.5) * TILE_SIZE);
    const claimed = sim.claims.includes(OVERWORLD.shrine.site);
    this.markers = [
      { kind: 'entrance', ...tile(OVERWORLD.entrance.door) },
      { kind: claimed ? 'claimed' : 'shrine', ...tile(OVERWORLD.shrine.pylon) },
      { kind: 'player', ...at(sim.player.x, sim.player.y) },
    ];
    this.marks.clear();
    for (const m of this.markers) {
      const style = MINIMAP.markers[m.kind];
      this.marks.fillStyle(colorOf('ink'), 1).fillCircle(m.x, m.y, style.r + 1);
      this.marks.fillStyle(colorOf(style.color), 1).fillCircle(m.x, m.y, style.r);
    }
  }
}
