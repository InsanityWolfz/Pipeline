import type { GameObjects, Scene } from 'phaser';
import { animFrames, ATLAS_KEY, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import {
  CONDUIT_ANIMS,
  CRATE_SPRITE,
  EMBLEM_RISE,
  HOPPER_SPRITES,
  MACHINE_HOUSINGS,
} from '../data/foundryAssets';
import { BUILD_BAR_LAYOUT, GHOST } from '../data/hudLayout';
import { pieceDef } from '../data/pieces';
import { pieceRect, type Tile } from '../sim/pieces';
import type { PlaceFail } from '../sim/placement';
import type { Facing } from '../sim/player';
import { colorOf } from './color';
import { buildBarCells, inRect, pieceIcon } from './foundryLayout';
import { viewOf } from './FoundryView';

/** The resting frame of a piece's body as placed with `facing`. */
function bodyFrame(pieceId: string, facing: Facing): string {
  const def = pieceDef(pieceId);
  const view = viewOf(facing);
  if (def.kind === 'machine') return MACHINE_HOUSINGS[def.footprint][view].idle;
  if (def.kind === 'conduit') return animFrames(CONDUIT_ANIMS[view])[0] ?? '';
  return def.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE;
}

// Build mode on screen: the bar of unlocked pieces with the selected one
// highlighted, and a ghost of it on the tile under the cursor, tinted by whether
// it can go there. Picking a cell goes through `onPick`.
export class BuildView {
  private readonly scene: Scene;
  private cells: { pieceId: string; images: GameObjects.Image[] }[] = [];
  private readonly highlight: GameObjects.Image;
  private readonly ghost: GameObjects.Image;
  private readonly ghostEmblem: GameObjects.Image;
  private unlocked: readonly string[] = [];
  private visible = false;
  selected = 'conduit';

  constructor(scene: Scene) {
    this.scene = scene;
    this.highlight = scene.add
      .image(0, 0, ATLAS_KEY, SPRITES.hudAmmoSelect)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud + 2);
    this.ghost = scene.add.image(0, 0, ATLAS_KEY, bodyFrame('conduit', 'right')).setAlpha(GHOST.alpha);
    this.ghostEmblem = scene.add.image(0, 0, ATLAS_KEY, pieceIcon('conduit')).setAlpha(GHOST.alpha);
    for (const o of [this.ghost, this.ghostEmblem]) o.setDepth(DEPTHS.worldUi - 1);
    this.setVisible(false);
  }

  /** True if a screen point is over the bar, so a click there isn't a place in the world. */
  overUi(x: number, y: number): boolean {
    return this.visible && buildBarCells(this.unlocked).some((c) => inRect(c, x, y));
  }

  /** Moves the selection along the bar, wrapping. */
  step(delta: number): void {
    const i = this.unlocked.indexOf(this.selected);
    const n = this.unlocked.length;
    if (n > 0) this.selected = this.unlocked[(((i + delta) % n) + n) % n] ?? this.selected;
  }

  update(
    building: boolean,
    unlocked: readonly string[],
    cursor: Tile | null,
    facing: Facing,
    canPlace: (pieceId: string, tx: number, ty: number, facing: Facing) => PlaceFail | null,
  ): void {
    if (unlocked.join() !== this.unlocked.join()) this.rebuild(unlocked);
    if (!unlocked.includes(this.selected)) this.selected = unlocked[0] ?? 'conduit';
    this.setVisible(building);
    if (!building) return;
    const cell = buildBarCells(unlocked).find((c) => c.pieceId === this.selected);
    if (cell) this.highlight.setPosition(cell.x, cell.y);
    this.drawGhost(cursor, facing, canPlace);
  }

  private drawGhost(
    cursor: Tile | null,
    facing: Facing,
    canPlace: (pieceId: string, tx: number, ty: number, facing: Facing) => PlaceFail | null,
  ): void {
    const show = cursor !== null;
    this.ghost.setVisible(show);
    this.ghostEmblem.setVisible(show);
    if (!cursor) return;
    const pieceId = this.selected;
    const def = pieceDef(pieceId);
    const r = pieceRect({ pieceId, tx: cursor.tx, ty: cursor.ty, facing });
    const bottom = r.y + r.h / 2;
    this.ghost.setFrame(bodyFrame(pieceId, facing)).setFlipX(facing === 'left');
    if (def.kind === 'conduit') this.ghost.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2);
    else this.ghost.setOrigin(0.5, 1).setPosition(r.x, bottom);
    const tint = colorOf(canPlace(pieceId, cursor.tx, cursor.ty, facing) ? GHOST.badTint : GHOST.okTint);
    this.ghost.setTint(tint);
    const machine = def.kind === 'machine';
    this.ghostEmblem.setVisible(machine).setTint(tint);
    if (machine) {
      const rise = EMBLEM_RISE[def.footprint][viewOf(facing)];
      this.ghostEmblem.setFrame(pieceIcon(pieceId)).setPosition(r.x, bottom - rise);
    }
  }

  private rebuild(unlocked: readonly string[]): void {
    for (const c of this.cells) for (const o of c.images) o.destroy();
    this.unlocked = [...unlocked];
    const L = BUILD_BAR_LAYOUT;
    this.cells = buildBarCells(unlocked).map((c) => {
      const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
        o.setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(this.visible);
      const frame = fixed(this.scene.add.image(c.x, c.y, ATLAS_KEY, SPRITES.hudAmmoCell), DEPTHS.hud);
      const icon = this.scene.add.image(c.x + L.icon.x, c.y + L.icon.y, ATLAS_KEY, pieceIcon(c.pieceId));
      fixed(icon, DEPTHS.hud + 1);
      return { pieceId: c.pieceId, images: [frame, icon] };
    });
  }

  /** Clicking a cell selects its piece. Returns whether the click landed on one. */
  click(x: number, y: number): boolean {
    if (!this.visible) return false;
    const cell = buildBarCells(this.unlocked).find((c) => inRect(c, x, y));
    if (cell) this.selected = cell.pieceId;
    return cell !== undefined;
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    this.highlight.setVisible(visible);
    if (!visible) {
      this.ghost.setVisible(false);
      this.ghostEmblem.setVisible(false);
    }
    for (const c of this.cells) for (const o of c.images) o.setVisible(visible);
  }
}
