import type { Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TILE, type Room } from '../data/rooms';

// Draws a room's tiles. Walls and ruin blocks sort by the bottom of their
// footprint, so their tall front faces overlap whatever stands behind them.
export function drawRoom(scene: Scene, room: Room): void {
  for (const [ty, row] of room.rows.entries()) {
    for (const [tx, symbol] of [...row].entries()) {
      const left = tx * TILE_SIZE;
      const bottom = (ty + 1) * TILE_SIZE;
      scene.add.image(left, ty * TILE_SIZE, ATLAS_KEY, SPRITES.floor).setOrigin(0).setDepth(DEPTHS.floor);
      if (symbol === TILE.floor) continue;
      const frame = symbol === TILE.wall ? SPRITES.wall : SPRITES.ruinBlock;
      scene.add.image(left, bottom, ATLAS_KEY, frame).setOrigin(0, 1).setDepth(bottom);
    }
  }
  const crystal = room.crystal;
  if (!crystal) return;
  const cx = (crystal.tx + 0.5) * TILE_SIZE;
  const cy = (crystal.ty + 1) * TILE_SIZE;
  scene.add.image(cx, cy, ATLAS_KEY, SPRITES.leyCrystal).setOrigin(0.5, 1).setDepth(cy);
}
