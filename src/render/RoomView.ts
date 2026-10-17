import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, SPRITES, VIEW_TILES, type ViewMode } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TILE, type Room } from '../data/rooms';

/** Depth for flat floor tiles: under everything that sorts by feet. */
const FLOOR_DEPTH = -1;

// Draws a room's tiles for one view. Walls and ruin blocks sort by the bottom
// of their footprint, so in three-quarter view their tall front faces overlap
// whatever stands behind them.
export class RoomView {
  private readonly images: GameObjects.Image[] = [];
  private readonly scene: Scene;
  private readonly room: Room;

  constructor(scene: Scene, room: Room) {
    this.scene = scene;
    this.room = room;
  }

  build(view: ViewMode): void {
    this.destroy();
    const tiles = VIEW_TILES[view];
    for (const [ty, row] of this.room.rows.entries()) {
      for (const [tx, symbol] of [...row].entries()) {
        const left = tx * TILE_SIZE;
        const bottom = (ty + 1) * TILE_SIZE;
        this.images.push(this.scene.add.image(left, ty * TILE_SIZE, ATLAS_KEY, tiles.floor).setOrigin(0).setDepth(FLOOR_DEPTH));
        if (symbol === TILE.floor) continue;
        const frame = symbol === TILE.wall ? tiles.wall : tiles.ruinBlock;
        this.images.push(this.scene.add.image(left, bottom, ATLAS_KEY, frame).setOrigin(0, 1).setDepth(bottom));
      }
    }
    const crystal = this.room.crystal;
    if (!crystal) return;
    const cx = (crystal.tx + 0.5) * TILE_SIZE;
    const cy = (crystal.ty + 1) * TILE_SIZE;
    this.images.push(this.scene.add.image(cx, cy, ATLAS_KEY, SPRITES.leyCrystal).setOrigin(0.5, 1).setDepth(cy));
  }

  destroy(): void {
    for (const image of this.images) image.destroy();
    this.images.length = 0;
  }
}
