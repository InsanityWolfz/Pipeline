import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { DOORWAY_SPRITE } from '../data/foundryAssets';
import { TILE, type Room } from '../data/rooms';

// Draws one room's tiles. Walls, doors and ruin blocks sort by the bottom of their
// footprint, so their tall front faces overlap whatever stands behind them.
// Walking through a door swaps the room drawn.
export class RoomView {
  private readonly scene: Scene;
  private objects: GameObjects.Image[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  show(room: Room): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
    const width = room.rows[0]?.length ?? 0;
    const add = (x: number, y: number, frame: string): GameObjects.Image => {
      const image = this.scene.add.image(x, y, ATLAS_KEY, frame);
      this.objects.push(image);
      return image;
    };
    for (const [ty, row] of room.rows.entries()) {
      for (const [tx, symbol] of [...row].entries()) {
        const left = tx * TILE_SIZE;
        const bottom = (ty + 1) * TILE_SIZE;
        add(left, ty * TILE_SIZE, SPRITES.floor).setOrigin(0).setDepth(DEPTHS.floor);
        if (symbol === TILE.floor) continue;
        if (symbol === TILE.door) {
          // The sprite is drawn for the right wall; a door on the left wall mirrors it.
          add(left, bottom, DOORWAY_SPRITE).setOrigin(0, 1).setDepth(bottom).setFlipX(tx < width / 2);
          continue;
        }
        const frame = symbol === TILE.wall ? SPRITES.wall : SPRITES.ruinBlock;
        add(left, bottom, frame).setOrigin(0, 1).setDepth(bottom);
      }
    }
    const crystal = room.crystal;
    if (!crystal) return;
    const cx = (crystal.tx + 0.5) * TILE_SIZE;
    const cy = (crystal.ty + 1) * TILE_SIZE;
    add(cx, cy, SPRITES.leyCrystal).setOrigin(0.5, 1).setDepth(cy);
  }
}
