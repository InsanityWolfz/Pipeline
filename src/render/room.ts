import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { DOORWAY_SPRITE } from '../data/foundryAssets';
import { PROPS, type PropDef, type PropPlacement } from '../data/props';
import { PROP_LAYOUT, ROOM_TOP_MARGIN, WALL_SPRITES } from '../data/roomArt';
import { TILE, type Room } from '../data/rooms';
import { registerAnim } from './anims';
import { floorFrame, wallPieces, worldTileHash } from './roomTiles';
import { hollowsFrame } from './hollowsTiles';
import { addVectorSprite, addVector } from './vector/textures';
import type { Occluders } from './occluders';

const FLOOR_PROP_DEPTH = (DEPTHS.floor + DEPTHS.shadow) / 2;

// Draws one room's tiles: floors with variants by a fixed hash, walls in 3/4 view (014). Walls, doors and ruin blocks sort by the bottom of their
// footprint, so their tall front faces overlap whatever stands behind them.
// Walking through a door swaps the room drawn.
export class RoomView {
  private readonly scene: Scene;
  private objects: (GameObjects.Image | GameObjects.Sprite)[] = [];

  private readonly occluders: Occluders | undefined;

  /** `occluders` (070): ruin blocks (and the block props standing in for them) can hide the player. */
  constructor(scene: Scene, occluders?: Occluders) {
    this.scene = scene;
    this.occluders = occluders;
  }

  show(room: Room): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
    // The overworld (017) is drawn by OverworldView from its terrain, not from tiles.
    if (room.terrain) return;
    const add = (x: number, y: number, frame: string): GameObjects.Image => {
      const image = addVector(this.scene, x, y, frame);
      this.objects.push(image);
      return image;
    };
    // More wall above the top row, behind everything (019).
    const width = room.rows[0]?.length ?? 0;
    for (let y = -TILE_SIZE; y > -ROOM_TOP_MARGIN - TILE_SIZE; y -= TILE_SIZE) {
      for (let tx = 0; tx < width; tx++) add(tx * TILE_SIZE, y, WALL_SPRITES.top).setOrigin(0).setDepth(DEPTHS.floor);
    }
    const blockProps = new Set((room.props ?? []).filter((p) => PROPS[p.propId].layer === 'block').map((p) => `${p.tx},${p.ty}`));
    for (const p of room.props ?? []) this.prop(p);
    for (const [ty, row] of room.rows.entries()) {
      for (const [tx, symbol] of [...row].entries()) {
        const left = tx * TILE_SIZE;
        const bottom = (ty + 1) * TILE_SIZE;
        add(left, ty * TILE_SIZE, floorFrame(SPRITES.floor, tx, ty)).setOrigin(0).setDepth(DEPTHS.floor);
        // 055: an arena's door stands on floor; ArenaDoorView draws it.
        if (symbol === TILE.floor || symbol === TILE.arenaDoor) continue;
        if (symbol === TILE.door) {
          // The sprite is drawn for the right wall; a door on the left wall mirrors it.
          // A door in the top or bottom wall uses the same arch, unflipped.
          add(left, bottom, DOORWAY_SPRITE).setOrigin(0, 1).setDepth(bottom).setFlipX(tx === 0);
          continue;
        }
        if (symbol === TILE.wall) {
          this.wall(room.rows, tx, ty, add);
          continue;
        }
        // 044: the Hollows' cliffs, columns and fallen drums (the sandbox's Sunken Forum) in their own look.
        const hollows = hollowsFrame(symbol, tx, ty, worldTileHash(tx, ty), room);
        if (hollows) {
          const image = addVector(this.scene, left + TILE_SIZE / 2, bottom, hollows).setDepth(bottom);
          this.objects.push(image);
          if (symbol === TILE.ruinBlock) this.occluders?.add(image);
          continue;
        }
        // A block prop (a column, a rune stone) stands in for the ruin block's look.
        if (!blockProps.has(`${tx},${ty}`)) this.occluders?.add(add(left, bottom, SPRITES.ruinBlock).setOrigin(0, 1).setDepth(bottom));
      }
    }
    const crystal = room.crystal;
    if (!crystal) return;
    const cx = (crystal.tx + 0.5) * TILE_SIZE;
    const cy = (crystal.ty + 1) * TILE_SIZE;
    add(cx, cy, SPRITES.leyCrystal).setOrigin(0.5, 1).setDepth(cy);
  }

  /** A prop by its layer: on its block, at the foot of its wall, flat on the floor, or standing on its tile. */
  private prop(p: PropPlacement): void {
    const def: PropDef = PROPS[p.propId];
    registerAnim(this.scene, def.anim);
    const cx = (p.tx + 0.5) * TILE_SIZE;
    const bottom = (p.ty + 1) * TILE_SIZE;
    const sprite = addVectorSprite(this.scene, cx, bottom, animFrames(def.anim)[0] ?? '').setOrigin(0.5, 1);
    this.objects.push(sprite);
    if (def.layer === 'floor') sprite.setOrigin(0.5).setPosition(cx, bottom - TILE_SIZE / 2).setDepth(FLOOR_PROP_DEPTH);
    else if (def.layer === 'wall') sprite.setY(bottom + (def.drop ?? 0)).setDepth(bottom + PROP_LAYOUT.wallNudge);
    else if (def.layer === 'standing') sprite.setY(bottom - PROP_LAYOUT.standingInset).setDepth(bottom - PROP_LAYOUT.standingInset);
    else {
      sprite.setDepth(bottom);
      this.occluders?.add(sprite);
    }
    if (def.anim.frames > 1) sprite.play({ key: def.anim.key, startFrame: (p.tx * PROP_LAYOUT.phaseX + p.ty * PROP_LAYOUT.phaseY) % def.anim.frames });
  }

  /** A wall in 3/4 view: its carved face over floor, else its top seen from above with lit lips toward the floor. */
  private wall(rows: readonly string[], tx: number, ty: number, add: (x: number, y: number, frame: string) => GameObjects.Image): void {
    const left = tx * TILE_SIZE;
    const top = ty * TILE_SIZE;
    const bottom = top + TILE_SIZE;
    const w = wallPieces(rows, tx, ty);
    add(left, bottom, w.frame).setOrigin(0, 1).setDepth(bottom);
    if (w.kind === 'face') return;
    if (w.edgeLeft) add(left, top, WALL_SPRITES.edgeSide).setOrigin(0).setDepth(bottom);
    if (w.edgeRight) add(left + TILE_SIZE, top, WALL_SPRITES.edgeSide).setOrigin(1, 0).setFlipX(true).setDepth(bottom);
    if (w.edgeTop) add(left, top, WALL_SPRITES.edgeTop).setOrigin(0).setDepth(bottom);
  }
}
