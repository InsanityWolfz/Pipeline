import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { BLUEPRINT_GHOST } from '../data/blueprintAssets';
import { BLUEPRINT_TEXT } from '../data/blueprints';
import { TILE_SIZE } from '../data/config';
import { GHOST } from '../data/hudLayout';
import { footprint, type Tile } from '../sim/pieces';
import type { StampPiece } from '../sim/stamp';
import { colorOf } from './color';
import { bodyFrame, showGhost } from './ghostLook';
import { pieceIcon } from './foundryLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The blueprint ghost as drawn (063), for `ui().blueprints.ghost`. */
export interface BlueprintGhostShown {
  /** Each piece where it would go, and why it can't (null when it can). */
  pieces: { pieceId: string; tx: number; ty: number; facing: string; fail: string | null }[];
  /** The tiles drawn red. */
  red: Tile[];
  /** The "not unlocked" line over a hovered locked piece, while it shows. */
  hover: string | null;
}

export const NO_BLUEPRINT_GHOST: BlueprintGhostShown = { pieces: [], red: [], hover: null };

// A taken blueprint following the cursor (063): every piece's body where it would go, cyan where it fits and red where
// it doesn't (off the floor, on a fixture or a taken tile, or not unlocked), each red piece's tiles filled red under it.
// Hovering a piece the player hasn't unlocked says so. Images are pooled and reused.
export class BlueprintGhost {
  private readonly scene: Scene;
  private readonly tiles: GameObjects.Graphics;
  private readonly bodies: { body: GameObjects.Image; icon: GameObjects.Image }[] = [];
  private readonly hover: TextLine;
  shown: BlueprintGhostShown = NO_BLUEPRINT_GHOST;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = scene.add.graphics().setDepth(DEPTHS.worldUi - 3);
    this.hover = new TextLine(scene, 0, 0, DEPTHS.prompt, true, 'label').set(BLUEPRINT_TEXT.notUnlocked).setVisible(false);
  }

  /** `plan`: the stamp as it would go now, or null for no ghost; `cursor` the tile under the cursor. */
  update(plan: readonly StampPiece[] | null, cursor: Tile | null): void {
    const pieces = plan ?? [];
    while (this.bodies.length < pieces.length) {
      const body = addVector(this.scene, 0, 0, bodyFrame('conduit', 'right', 'left')).setAlpha(BLUEPRINT_GHOST.alpha).setDepth(DEPTHS.worldUi - 2);
      const icon = addVector(this.scene, 0, 0, pieceIcon('cutter')).setAlpha(BLUEPRINT_GHOST.alpha).setDepth(DEPTHS.worldUi - 2);
      this.bodies.push({ body, icon });
    }
    for (const [i, b] of this.bodies.entries()) {
      const p = pieces[i];
      if (p) showGhost(b.body, b.icon, p, colorOf(p.fail ? GHOST.badTint : GHOST.okTint));
      else {
        b.body.setVisible(false);
        b.icon.setVisible(false);
      }
    }
    const T = BLUEPRINT_GHOST.tile;
    const red = pieces.filter((p) => p.fail).flatMap((p) => footprint(p.pieceId, p.tx, p.ty, p.facing));
    this.tiles.clear().fillStyle(colorOf(T.color), T.alpha);
    for (const t of red) this.tiles.fillRect(t.tx * TILE_SIZE + T.inset, t.ty * TILE_SIZE + T.inset, TILE_SIZE - 2 * T.inset, TILE_SIZE - 2 * T.inset);
    const locked = cursor ? pieces.find((p) => p.fail === 'locked' && footprint(p.pieceId, p.tx, p.ty, p.facing).some((t) => t.tx === cursor.tx && t.ty === cursor.ty)) : undefined;
    this.hover.setVisible(locked !== undefined && cursor !== null);
    if (locked && cursor) this.hover.moveTo(Math.round((cursor.tx + 0.5) * TILE_SIZE - this.hover.width / 2), cursor.ty * TILE_SIZE - BLUEPRINT_GHOST.hoverRise - this.hover.lineHeight);
    this.shown = {
      pieces: pieces.map((p) => ({ pieceId: p.pieceId, tx: p.tx, ty: p.ty, facing: p.facing, fail: p.fail })),
      red,
      hover: locked ? BLUEPRINT_TEXT.notUnlocked : null,
    };
  }
}
