import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { AREA_LOOK } from '../data/blueprintAssets';
import { TILE_SIZE } from '../data/config';
import { piecesInBox, type AreaBox } from '../sim/area';
import { pieceRect, type FoundryState } from '../sim/pieces';
import { colorOf } from './color';

// The Area tool's box over the foundry (063), in the player's cyan: a faint fill and an outline round its tiles while
// dragging and while its menu is up, and an outline round every piece it counts (those wholly inside it).
export class AreaView {
  private readonly g: GameObjects.Graphics;
  /** The ids of the pieces drawn as counted, for the test hook. */
  counted: number[] = [];

  constructor(scene: Scene) {
    this.g = scene.add.graphics().setDepth(DEPTHS.worldUi - 1);
  }

  update(box: AreaBox | null, foundry: FoundryState, inFoundry: boolean): void {
    this.g.clear();
    this.counted = [];
    if (!box || !inFoundry) return;
    const L = AREA_LOOK;
    const x = box.tx0 * TILE_SIZE;
    const y = box.ty0 * TILE_SIZE;
    const w = (box.tx1 - box.tx0 + 1) * TILE_SIZE;
    const h = (box.ty1 - box.ty0 + 1) * TILE_SIZE;
    this.g.fillStyle(colorOf(L.fill.color), L.fill.alpha).fillRect(x, y, w, h);
    this.g.lineStyle(L.width, colorOf(L.color), L.alpha).strokeRect(x, y, w, h);
    const P = L.piece;
    this.g.lineStyle(P.width, colorOf(P.color), P.alpha);
    for (const p of piecesInBox(foundry, box)) {
      const r = pieceRect(p);
      this.g.strokeRect(r.x - r.w / 2 + P.inset, r.y - r.h / 2 + P.inset, r.w - 2 * P.inset, r.h - 2 * P.inset);
      this.counted.push(p.id);
    }
  }
}
